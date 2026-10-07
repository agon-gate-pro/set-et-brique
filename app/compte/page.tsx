import type { Metadata } from "next";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { bookingCustomerColumns, findCustomerByClerkId } from "@/lib/bookings";
import { db, schema } from "@/lib/db";
import { expireOverduePayments } from "@/lib/payment-expiry";
import { BookingCard } from "./booking-card";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: PageProps<"/compte">) {
  // `payer` : référence d'une réservation acceptée, dont le récapitulatif de paiement s'ouvre d'office.
  const { demande, payer } = await searchParams;
  // auth.protect() redirige vers /connexion en gardant le chemin courant en retour.
  const { userId } = await auth.protect();
  // Demande acceptée non payée dans le délai : affichée annulée, plus « à payer ».
  await expireOverduePayments();
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
  const current = bookings.filter((b) => b.status !== "returned" && b.status !== "cancelled");
  const past = bookings.filter((b) => b.status === "returned" || b.status === "cancelled");
  const firstName = customer?.firstName ?? user?.firstName ?? null;

  return (
    <section className="mx-auto max-w-4xl px-5 md:px-8 py-14 md:py-20">
      <h1 className="text-3xl md:text-5xl font-bold">Bonjour{firstName ? ` ${firstName}` : ""}</h1>

      {typeof demande === "string" ? (
        <p role="status" className="mt-6 brick-card bg-sun/40 p-5 font-semibold text-ink-deep">
          Votre demande {demande} est bien envoyée. Nous l&apos;examinons et revenons vers vous
          rapidement pour convenir de l&apos;heure de remise. Rien n&apos;est à payer pour l&apos;instant.
        </p>
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
            />
          ))}
        </ul>
      )}

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
