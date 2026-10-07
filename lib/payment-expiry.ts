import { and, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { todayIso } from "@/lib/dates";
import { db, schema } from "@/lib/db";
import { sendBookingEmails } from "@/lib/email/booking-emails";

export const PAYMENT_EXPIRED_REASON = "Délai de paiement dépassé : la réservation a été annulée et le set remis en location.";

/**
 * Annule les demandes acceptées dont l'échéance de paiement est passée (`payment_due_at`), pour
 * que leurs dates redeviennent disponibles. Appelée avant chaque lecture du planning (catalogue,
 * fiche, tunnel, réservations de la gestion, espace client) et une fois par jour par la tâche
 * planifiée (`/api/cron/paiements-expires`), au cas où personne ne passe sur le site.
 *
 * Sans risque en parallèle : l'`UPDATE … WHERE status = 'pending_payment'` verrouille chaque ligne,
 * un second appel concurrent la relit déjà annulée et ne la renvoie pas — un seul événement
 * d'historique par réservation. Une réservation sans échéance (acceptée avant le 5 octobre 2026)
 * est annulée une fois son jour de remise passé. Renvoie le nombre de réservations annulées.
 */
export async function expireOverduePayments(now = new Date()) {
  const expiredIds = await db.transaction(async (tx) => {
    const expired = await tx
      .update(schema.bookings)
      .set({ status: "cancelled", cancelledAt: now, cancelReason: PAYMENT_EXPIRED_REASON })
      .where(
        and(
          eq(schema.bookings.status, "pending_payment"),
          or(
            and(isNotNull(schema.bookings.paymentDueAt), lt(schema.bookings.paymentDueAt, now)),
            // Acceptée avant l'ajout de l'échéance (5 octobre 2026) : même plafond que `paymentDeadline`,
            // la fin du jour de remise. Une fois ce jour passé sans paiement, elle n'a plus lieu d'être.
            and(isNull(schema.bookings.paymentDueAt), lt(schema.bookings.startDate, todayIso())),
          ),
        ),
      )
      .returning({ id: schema.bookings.id });
    if (expired.length > 0) {
      await tx.insert(schema.bookingEvents).values(
        expired.map(({ id }) => ({
          bookingId: id,
          actor: "system" as const,
          fromStatus: "pending_payment" as const,
          toStatus: "cancelled" as const,
          message: "Annulée automatiquement : délai de paiement dépassé",
        })),
      );
    }
    return expired.map(({ id }) => id);
  });
  // E-mail B5 au client, une fois l'annulation écrite. L'`UPDATE` ne renvoie chaque réservation
  // qu'une fois, donc un seul e-mail même si plusieurs pages appellent cette fonction en même temps.
  // Envoi attendu ici (pas `after()`) : la fonction peut aussi tourner pendant le rendu d'une page.
  for (const id of expiredIds) {
    try {
      await sendBookingEmails("payment_expired", id);
    } catch (e) {
      console.error(`[email] payment_expired pour la réservation ${id}`, e);
    }
  }
  return expiredIds.length;
}
