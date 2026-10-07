import type { BookingStatus } from "@/lib/db/schema";

/**
 * Couleur d'une réservation selon son état, demande de la cliente : jaune à traiter, orange paiement à venir,
 * vert payé, rouge annulée. « Payé » couvre confirmée, en location et rendue : le loyer est encaissé
 * au plus tard à la remise (TPE). Proposition de dates : sans couleur. Partagée par le tableau des
 * réservations (ligne et pastille) et la fiche d'une réservation (pastille), pour qu'un état ait
 * partout la même couleur.
 */
export function statusTone(status: BookingStatus): { row: string; badge: string } | null {
  switch (status) {
    case "pending_review":
      return { row: "border-sun-deep bg-sun/20 hover:bg-sun/30 focus:bg-sun/30", badge: "border-sun-deep bg-sun text-ink-deep" };
    case "pending_payment":
      return { row: "border-orange-500 bg-orange-50 hover:bg-orange-100 focus:bg-orange-100", badge: "border-orange-500 bg-orange-100 text-orange-900" };
    case "confirmed":
    case "picked_up":
    case "returned":
      return { row: "border-leaf bg-green-50 hover:bg-green-100 focus:bg-green-100", badge: "border-leaf bg-green-100 text-leaf-deep" };
    case "cancelled":
      return { row: "border-brick bg-red-50 hover:bg-red-100 focus:bg-red-100", badge: "border-brick bg-red-100 text-brick-deep" };
    default:
      return null;
  }
}

/** Pastille d'un état sans couleur dédiée (proposition de dates). */
export const neutralBadge = "border-slate-ink/15 bg-paper";
