import type { Metadata } from "next";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { bookingCustomerColumns, findCustomerByClerkId } from "@/lib/bookings";
import { db, schema } from "@/lib/db";
import { expireStaleExtensions, loadCustomerExtensions } from "@/lib/extensions";
import { formatCents, formatDate, formatDateLong, giftVoucherStatusLabels } from "@/lib/format";
import { giftVoucherDisplayStatus } from "@/lib/gift-vouchers";
import { expireOverduePayments } from "@/lib/payment-expiry";
import { fulfillCheckoutSession, retrieveCheckoutSession } from "@/lib/payments";
import { BookingCard } from "./booking-card";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: PageProps<"/compte">) {
  // `payer` : référence d'une réservation acceptée, dont le récapitulatif de paiement s'ouvre d'office.
  // `paye` + `session_id` : retour de la page de paiement Stripe pour une location ;
  // `prolongation` + `session_id` : le même retour pour le supplément d'une prolongation.
  const { demande, payer, paye, prolongation, session_id } = await searchParams;
  // auth.protect() redirige vers /connexion en gardant le chemin courant en retour.
  const { userId } = await auth.protect();

  // Retour de Stripe : on livre nous-mêmes (le webhook l'a peut-être déjà fait, la livraison est
  // idempotente) pour que le client voie sa réservation confirmée sans attendre.
  let paymentPending = false;
  if (typeof session_id === "string" && session_id.startsWith("cs_")) {
    try {
      const result = await fulfillCheckoutSession(await retrieveCheckoutSession(session_id));
      paymentPending = result.status === "unpaid";
    } catch (e) {
      console.error("[stripe] retour paiement", e);
    }
  }
  // Demande acceptée non payée dans le délai : affichée annulée, plus « à payer ».
  await expireOverduePayments();
  // Prolongations restées sans réponse ou sans paiement à temps : la date de retour d'origine reste due.
  await expireStaleExtensions();
  const [user, admin, customer] = await Promise.all([
    currentUser(),
    isAdmin(),
    userId ? findCustomerByClerkId(userId) : null,
  ]);
  // Un gérant est aussi un client : il loue et paie comme les autres, son compte lui reste ouvert.
  // Le tri à la connexion (gérant vers `/admin`) se fait dans `app/apres-connexion/route.ts`.

  const bookings = customer
    ? await db.query.bookings.findMany({
        columns: bookingCustomerColumns,
        where: eq(schema.bookings.customerId, customer.id),
        with: {
          set: { columns: { name: true, slug: true } },
          pickupPoint: { columns: { name: true } },
          previousPickupPoint: { columns: { name: true } },
        },
        orderBy: [desc(schema.bookings.createdAt)],
      })
    : [];
  // Bons cadeaux achetés en ligne avec ce compte, à revoir ou réimprimer.
  const vouchers = await db.query.giftVouchers.findMany({
    columns: { id: true, code: true, amountCents: true, status: true, expiresAt: true },
    where: eq(schema.giftVouchers.purchaserClerkUserId, userId),
    orderBy: [desc(schema.giftVouchers.createdAt)],
  });
  const current = bookings.filter((b) => b.status !== "returned" && b.status !== "cancelled");
  const past = bookings.filter((b) => b.status === "returned" || b.status === "cancelled");

  // Prolongation : bouton visible sur toute location en cours, dates calculées seulement quand la
  // demande est ouverte (set chez le client, jusqu'à la veille du retour).
  const extensions = await loadCustomerExtensions(current);
  const firstName = customer?.firstName ?? user?.firstName ?? null;
  const paid = typeof paye === "string" ? bookings.find((b) => b.reference === paye) : undefined;
  // Prolongation réglée : plus aucune demande à payer sur la location, dont la date de retour a changé.
  const extended = typeof prolongation === "string" ? bookings.find((b) => b.reference === prolongation) : undefined;
  const extensionStillDue = extended ? extensions.get(extended.id)?.current?.status === "pending_payment" : false;

  return (
    <section className="mx-auto max-w-4xl px-5 md:px-8 py-14 md:py-20">
      <h1 className="text-3xl md:text-5xl font-bold">Bonjour{firstName ? ` ${firstName}` : ""}</h1>

      {typeof demande === "string" ? (
        <p role="status" className="mt-6 brick-card bg-sun/40 p-5 font-semibold text-ink-deep">
          Votre demande {demande} est bien envoyée. Nous l&apos;examinons et revenons vers vous
          rapidement pour convenir de l&apos;heure de remise. Rien n&apos;est à payer pour l&apos;instant.
        </p>
      ) : null}

      {paid ? (
        paid.status === "confirmed" || paid.status === "picked_up" ? (
          <p role="status" className="mt-6 brick-card bg-leaf/20 p-5 font-semibold text-ink-deep">
            Paiement reçu, merci ! Votre réservation {paid.reference} est confirmée. Vous recevez un e-mail de confirmation.
          </p>
        ) : paymentPending ? (
          <p role="status" className="mt-6 brick-card bg-sun/40 p-5 font-semibold text-ink-deep">
            Votre banque n&apos;a pas encore confirmé le paiement de la réservation {paid.reference}. Nous vous écrivons dès que
            c&apos;est fait.
          </p>
        ) : (
          <p role="status" className="mt-6 brick-card bg-sun/40 p-5 font-semibold text-ink-deep">
            Nous n&apos;avons pas encore reçu le paiement de la réservation {paid.reference}. Si vous avez été débité, contactez-nous.
          </p>
        )
      ) : null}

      {extended ? (
        !extensionStillDue ? (
          <p role="status" className="mt-6 brick-card bg-leaf/20 p-5 font-semibold text-ink-deep">
            Paiement reçu, merci ! Votre location {extended.reference} est prolongée : le set est à rendre le{" "}
            {formatDate(extended.endDate)}. Vous recevez un e-mail de confirmation.
          </p>
        ) : paymentPending ? (
          <p role="status" className="mt-6 brick-card bg-sun/40 p-5 font-semibold text-ink-deep">
            Votre banque n&apos;a pas encore confirmé le paiement de la prolongation de {extended.reference}. Nous vous
            écrivons dès que c&apos;est fait.
          </p>
        ) : (
          <p role="status" className="mt-6 brick-card bg-sun/40 p-5 font-semibold text-ink-deep">
            Nous n&apos;avons pas encore reçu le paiement de la prolongation de {extended.reference}. Si vous avez été
            débité, contactez-nous.
          </p>
        )
      ) : null}

      <h2 className="mt-10 text-2xl font-semibold">Mes locations</h2>
      {current.length === 0 ? (
        <p className="mt-3 text-slate-ink max-w-xl">Aucune location en cours. Le catalogue vous attend.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {current.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              setName={b.set.name}
              setSlug={b.set.slug}
              pickupPoint={b.pickupPoint?.name ?? null}
              previousPickupPoint={b.previousPickupPoint?.name ?? null}
              openPayment={payer === b.reference}
              extension={extensions.get(b.id) ?? null}
            />
          ))}
        </ul>
      )}

      {vouchers.length > 0 ? (
        <>
          <h2 className="mt-10 text-2xl font-semibold">Mes bons cadeaux</h2>
          <ul className="mt-4 space-y-3">
            {vouchers.map((v) => {
              const status = giftVoucherDisplayStatus(v);
              return (
                <li key={v.id} className="brick-card p-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                  <div>
                    <p className="display text-xl font-semibold tracking-wide text-ink-deep">{v.code}</p>
                    <p className="text-sm text-slate-ink">
                      {formatCents(v.amountCents)} ·{" "}
                      {status === "valid" ? `valable jusqu'au ${formatDateLong(v.expiresAt)}` : giftVoucherStatusLabels[status].toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-bold px-2.5 py-1 rounded-md border border-slate-ink/15 ${status === "valid" ? "badge-gold" : "bg-slate-200"}`}
                    >
                      {giftVoucherStatusLabels[status]}
                    </span>
                    <Link href={`/compte/bons-cadeaux/${v.id}`} className="btn btn-paper text-sm py-2 px-4">
                      Voir et imprimer
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {past.length > 0 ? (
        <>
          <h2 className="mt-10 text-2xl font-semibold">Historique</h2>
          <ul className="mt-4 space-y-4">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b} setName={b.set.name} setSlug={b.set.slug} pickupPoint={b.pickupPoint?.name ?? null} />
            ))}
          </ul>
        </>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/catalogue" className="btn btn-brick">
          Voir le catalogue
        </Link>
        <Link href="/compte/profil" className="btn btn-paper">
          Gérer mon compte
        </Link>
        {admin ? (
          <Link href="/admin" className="btn btn-paper">
            Espace de gestion
          </Link>
        ) : null}
      </div>
    </section>
  );
}
