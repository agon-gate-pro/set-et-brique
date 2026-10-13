import type { BookingStatus } from "@/lib/db/schema";

/**
 * Couleur d'une réservation selon son état, demande de la cliente : jaune à traiter, orange paiement à venir,
 * vert payé, rouge annulée. Bleu pour un set en cours de location chez le client (demande d'Alexis,
 * 10 octobre 2026), pour le distinguer d'un set payé pas encore remis ; l'orange, d'abord envisagé,
 * sert déjà au paiement à venir. Le vert ne vaut plus que pour « payée, à remettre » (13 octobre 2026) :
 * une location rendue passe sans couleur, sinon les deux lignes se confondaient et un set à remettre
 * semblait terminé. Proposition de dates : sans couleur aussi. Partagée par le tableau des
 * réservations (ligne et pastille) et la fiche d'une réservation (pastille), pour qu'un état ait
 * partout la même couleur.
 */
export function statusTone(status: BookingStatus): { row: string; badge: string } | null {
  switch (status) {
    case "pending_review":
      return { row: "border-sun-deep bg-sun/20 hover:bg-sun/30 focus:bg-sun/30", badge: "border-sun-deep bg-sun text-ink-deep" };
    case "pending_payment":
      return { row: "border-orange-500 bg-orange-50 hover:bg-orange-100 focus:bg-orange-100", badge: "border-orange-500 bg-orange-100 text-orange-900" };
    case "picked_up":
      return { row: "border-blue-500 bg-blue-50 hover:bg-blue-100 focus:bg-blue-100", badge: "border-blue-500 bg-blue-100 text-blue-900" };
    case "confirmed":
      return { row: "border-leaf bg-green-50 hover:bg-green-100 focus:bg-green-100", badge: "border-leaf bg-green-100 text-leaf-deep" };
    case "cancelled":
      return { row: "border-brick bg-red-50 hover:bg-red-100 focus:bg-red-100", badge: "border-brick bg-red-100 text-brick-deep" };
    default:
      return null;
  }
}

/** Pastille d'un état sans couleur dédiée (proposition de dates, location rendue). */
export const neutralBadge = "border-slate-ink/15 bg-paper";

/**
 * Pastille d'une ligne d'historique liée à une prolongation. Ces lignes ne changent pas l'état de
 * la location (`to_status` vide) : l'étape se lit au début du message écrit par `lib/extensions.ts`
 * et `lib/payments.ts`. Mêmes couleurs que pour une location : jaune à traiter, orange à payer,
 * vert payé, rouge refusé ou expiré. Un message reformulé là-bas perd sa pastille ici, rien de plus.
 */
const extensionEventBadges: { prefix: string; label: string; badge: string }[] = [
  { prefix: "Prolongation demandée", label: "Prolongation demandée", badge: statusTone("pending_review")!.badge },
  { prefix: "Prolongation acceptée", label: "Prolongation à payer", badge: statusTone("pending_payment")!.badge },
  { prefix: "Prolongation payée", label: "Prolongation payée", badge: statusTone("confirmed")!.badge },
  { prefix: "Prolongation refusée", label: "Prolongation refusée", badge: statusTone("cancelled")!.badge },
  { prefix: "Prolongation expirée", label: "Prolongation expirée", badge: statusTone("cancelled")!.badge },
  { prefix: "Demande de prolongation annulée", label: "Prolongation annulée", badge: neutralBadge },
  { prefix: "Paiement en ligne de la prolongation refusé", label: "Paiement refusé", badge: statusTone("cancelled")!.badge },
  { prefix: "Paiement en ligne reçu pour une prolongation", label: "À régulariser", badge: "border-brick bg-brick text-paper" },
];

export function extensionEventBadge(message: string | null): { label: string; badge: string } | null {
  if (!message) return null;
  return extensionEventBadges.find((b) => message.startsWith(b.prefix)) ?? null;
}
