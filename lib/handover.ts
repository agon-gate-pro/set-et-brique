/**
 * Modification du lieu ou de l'heure de remise par les gérants, pas encore vue par le client
 * (7 octobre 2026). Sans dépendance serveur : utilisée par la carte du client comme par le serveur.
 */

/** Statuts où une modification de la remise concerne encore le client (la remise n'a pas eu lieu). */
export const HANDOVER_CHANGE_STATUSES = ["pending_review", "date_proposed", "pending_payment", "confirmed"] as const;

export function hasUnseenHandoverChange(b: {
  status: string;
  handoverChangedAt: Date | null;
  handoverSeenAt: Date | null;
}) {
  if (!b.handoverChangedAt) return false;
  if (!(HANDOVER_CHANGE_STATUSES as readonly string[]).includes(b.status)) return false;
  return !b.handoverSeenAt || b.handoverChangedAt > b.handoverSeenAt;
}
