import { and, eq, gte, inArray, or } from "drizzle-orm";
import { addDays, monthStartIso, todayIso } from "@/lib/dates";
import { db, schema } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import {
  computeDayAvailability,
  computeSetAvailability,
  withLateReturn,
  OCCUPYING_STATUSES,
  RESERVING_STATUSES,
  type SetAvailabilityResult,
} from "@/lib/availability-core";

export { addDays, daysLate, endDateFor, todayIso } from "@/lib/dates";
export * from "@/lib/availability-core";

/**
 * Disponibilité de plusieurs sets en deux requêtes (exemplaires, réservations).
 * Le battement est celui du set s'il est renseigné, sinon le réglage global.
 */
export async function loadAvailability(
  sets: { id: string; turnaroundDays: number | null }[],
  today: string = todayIso(),
): Promise<Map<string, SetAvailabilityResult>> {
  const result = new Map<string, SetAvailabilityResult>();
  if (sets.length === 0) return result;

  const ids = sets.map((s) => s.id);
  const globalTurnaround = await getSetting("turnaround_days");
  const maxTurnaround = Math.max(globalTurnaround, ...sets.map((s) => s.turnaroundDays ?? 0));

  const [copies, bookings] = await Promise.all([
    db
      .select({ id: schema.setCopies.id, setId: schema.setCopies.setId, status: schema.setCopies.status })
      .from(schema.setCopies)
      .where(inArray(schema.setCopies.setId, ids)),
    db
      .select({
        setId: schema.bookings.setId,
        copyId: schema.bookings.copyId,
        status: schema.bookings.status,
        startDate: schema.bookings.startDate,
        endDate: schema.bookings.endDate,
      })
      .from(schema.bookings)
      .where(
        and(
          inArray(schema.bookings.setId, ids),
          inArray(schema.bookings.status, [...OCCUPYING_STATUSES]),
          // Seules les réservations récentes, à venir ou pas encore rendues peuvent bloquer aujourd'hui.
          or(
            gte(schema.bookings.endDate, addDays(today, -(maxTurnaround + 1))),
            eq(schema.bookings.status, "picked_up"),
          ),
        ),
      ),
  ]);

  for (const set of sets) {
    result.set(
      set.id,
      computeSetAvailability(
        copies.filter((c) => c.setId === set.id),
        bookings.filter((b) => b.setId === set.id).map((b) => withLateReturn(b, today)),
        set.turnaroundDays ?? globalTurnaround,
        today,
      ),
    );
  }
  return result;
}

/**
 * Disponibilité d'un set jour par jour, du mois courant jusqu'à `months` mois
 * plus tard inclus : trois requêtes (exemplaires, réservations qui réservent
 * des dates, périodes fermées).
 */
export async function loadDayAvailability(
  set: { id: string; turnaroundDays: number | null },
  months = 5,
  today: string = todayIso(),
) {
  const from = monthStartIso(today, 0);
  const to = addDays(monthStartIso(today, months + 1), -1);
  const [copies, bookings, blackouts, globalTurnaround] = await Promise.all([
    db
      .select({ id: schema.setCopies.id, status: schema.setCopies.status })
      .from(schema.setCopies)
      .where(eq(schema.setCopies.setId, set.id)),
    db
      .select({
        id: schema.bookings.id,
        copyId: schema.bookings.copyId,
        customerId: schema.bookings.customerId,
        status: schema.bookings.status,
        startDate: schema.bookings.startDate,
        endDate: schema.bookings.endDate,
        proposedStartDate: schema.bookings.proposedStartDate,
        proposedEndDate: schema.bookings.proposedEndDate,
      })
      .from(schema.bookings)
      .where(and(eq(schema.bookings.setId, set.id), inArray(schema.bookings.status, [...RESERVING_STATUSES]))),
    db.select({ startDate: schema.blackoutPeriods.startDate, endDate: schema.blackoutPeriods.endDate }).from(schema.blackoutPeriods),
    getSetting("turnaround_days"),
  ]);
  const days = computeDayAvailability(
    copies,
    bookings.map((b) => withLateReturn(b, today)),
    blackouts,
    set.turnaroundDays ?? globalTurnaround,
    from,
    to,
    today,
  );
  return { from, to, days };
}
