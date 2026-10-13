import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { formatCents, formatDateLong } from "@/lib/format";
import { fulfillCheckoutSession, retrieveCheckoutSession, type PurchasedVoucher } from "@/lib/payments";

export const metadata: Metadata = { title: "Merci pour votre commande", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Retour de Stripe après l'achat d'un bon cadeau. La page livre elle-même le bon (le webhook l'a
 * peut-être déjà fait : la livraison est idempotente) et affiche le code, aussi envoyé par e-mail.
 * Seul l'acheteur (compte Clerk de la session) peut voir le code.
 */
export default async function GiftVoucherThanksPage({ searchParams }: PageProps<"/bons-cadeaux/merci">) {
  const { session_id } = await searchParams;
  const { userId } = await auth.protect();

  let voucher: PurchasedVoucher | null = null;
  let state: "ok" | "pending" | "invalid" = "invalid";
  if (typeof session_id === "string" && session_id.startsWith("cs_")) {
    try {
      const session = await retrieveCheckoutSession(session_id);
      if (session.metadata?.kind === "gift_voucher" && session.metadata.clerk_user_id === userId) {
        const result = await fulfillCheckoutSession(session);
        if (result.status === "gift_voucher") {
          voucher = result.voucher;
          state = "ok";
        } else if (result.status === "unpaid") {
          state = "pending";
        }
      }
    } catch (e) {
      console.error("[stripe] retour bon cadeau", e);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-5 md:px-8 py-14 md:py-20">
      {state === "ok" && voucher ? (
        <>
          {/* Une seule ligne sur grand écran ; l'espace insécable garde le « ! » collé au dernier mot sur téléphone. */}
          <h1 className="text-3xl md:text-4xl font-bold md:whitespace-nowrap">Merci, c&apos;est dans la boîte{" "}!</h1>
          <p className="mt-4 text-slate-ink">
            Votre bon cadeau de {formatCents(voucher.amountCents)} est prêt. Imprimez-le, ou transmettez simplement ce code à la
            personne à qui vous l&apos;offrez.
          </p>
          <div className="mt-6 brick-card bg-sky p-6 text-center">
            <p className="text-sm text-slate-ink">Code du bon cadeau</p>
            <p className="display mt-2 text-3xl md:text-4xl font-bold text-brick-deep tracking-wider">{voucher.code}</p>
            <p className="mt-3 text-sm text-slate-ink">Valable jusqu&apos;au {formatDateLong(voucher.expiresAt)}, sur tout le catalogue.</p>
          </div>
          <p className="mt-4 text-sm text-slate-ink">
            Nous vous envoyons aussi le code par e-mail{voucher.purchaserEmail ? ` à ${voucher.purchaserEmail}` : ""}. Vous
            retrouvez ce bon à tout moment dans votre compte, pour le revoir ou le réimprimer.
          </p>
        </>
      ) : state === "pending" ? (
        <>
          <h1 className="text-3xl md:text-5xl font-bold">Paiement en cours</h1>
          <p className="mt-4 text-slate-ink">
            Votre banque n&apos;a pas encore confirmé le paiement. Dès qu&apos;elle le fera, vous recevrez le code du bon par e-mail.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl md:text-5xl font-bold">Commande introuvable</h1>
          <p className="mt-4 text-slate-ink">
            Nous ne retrouvons pas cette commande. Si vous avez été débité, écrivez-nous : nous vous enverrons votre bon.
          </p>
        </>
      )}
      <div className="mt-8 flex flex-wrap gap-4">
        {state === "ok" && voucher ? (
          <Link href={`/compte/bons-cadeaux/${voucher.id}?imprimer=1`} className="btn btn-brick">
            Imprimer le bon cadeau
          </Link>
        ) : null}
        <Link href="/catalogue" className={`btn ${state === "ok" && voucher ? "btn-paper" : "btn-brick"}`}>
          Voir le catalogue
        </Link>
        <Link href="/bons-cadeaux" className="btn btn-paper">
          Retour aux bons cadeaux
        </Link>
      </div>
    </section>
  );
}
