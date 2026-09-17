import { and, eq, gte, inArray, or } from "drizzle-orm";
import { addDays, todayIso } from "@/lib/dates";
import { db, schema } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export { addDays, daysLate, endDateFor, todayIso } from "@/lib/dates";

/**
 * Statut d'un set tel que le client le voit (spécification, module 1) :
 * Disponible / Location / Battement / Réparation / Retiré.
 * Rien n'est stocké : tout se déduit des exemplaires et des réservations.
 */
export type SetAvailability = "available" | "rented" | "turnaround" | "repair" | "retired";

export type SetAvailabilityResult = {
  status: SetAvailability;
  /** Premier jour où un exemplaire redevient libre, si le set est loué ou en battement. */
  nextAvailableDate: string | null;
  /** Exemplaires libres aujourd'hui. */
  freeCopies: number;
};

type CopyInput = { id: string; status: "available" | "maintenance" | "retired" };
type BookingInput = { copyId: string | null; startDate: string; endDate: string };

/** Réservations qui occupent un exemplaire aujourd'hui (statut affiché au catalogue). */
export const OCCUPYING_STATUSES = ["pending_payment", "confirmed", "picked_up"] as const;

/** Réservations qui réservent des dates, demandes en attente comprises. */
export const RESERVING_STATUSES = ["pending_review", "date_proposed", ...OCCUPYING_STATUSES] as const;

/**
 * Un set remis et pas encore rendu occupe son exemplaire au-delà de la date
 * de retour prévue : tant qu'il est dehors, sa fin effective est aujourd'hui.
 */
export function withLateReturn<T extends { status: string; endDate: string }>(b: T, today: string = todayIso()): T {
  return b.status === "picked_up" && b.endDate < today ? { ...b, endDate: today } : b;
}

/**
 * Calcul pur, sans base : exemplaires du set, réservations bloquantes, battement en jours.
 * Un exemplaire est « loué » si une réservation le couvre aujourd'hui, « en battement »
 * pendant `turnaroundDays` jours après la fin d'une location. Les réservations sans
 * exemplaire attribué occupent chacune un exemplaire libre.
 */
export function computeSetAvailability(
  copies: CopyInput[],
  bookings: BookingInput[],
  turnaroundDays: number,
  today: string = todayIso(),
): SetAvailabilityResult {
  const blocks = (b: BookingInput) => {
    const freeFrom = addDays(b.endDate, turnaroundDays + 1);
    if (b.startDate <= today && today <= b.endDate) return { kind: "rented" as const, freeFrom };
    if (b.endDate < today && today < freeFrom) return { kind: "turnaround" as const, freeFrom };
    return null;
  };

  const perCopy: { kind: SetAvailability; freeFrom: string | null }[] = [];
  const unassigned = bookings.filter((b) => b.copyId === null).map(blocks).filter((x) => x !== null);

  for (const copy of copies) {
    if (copy.status === "retired") {
      perCopy.push({ kind: "retired", freeFrom: null });
      continue;
    }
    if (copy.status === "maintenance") {
      perCopy.push({ kind: "repair", freeFrom: null });
      continue;
    }
    const own = bookings
      .filter((b) => b.copyId === copy.id)
      .map(blocks)
      .filter((x) => x !== null);
    // Loué prime sur battement ; la date de libération est la plus tardive.
    const rented = own.filter((x) => x.kind === "rented");
    const chosen = rented.length > 0 ? rented : own;
    if (chosen.length > 0) {
      perCopy.push({
        kind: chosen[0].kind,
        freeFrom: chosen.map((x) => x.freeFrom).sort().at(-1) ?? null,
      });
      continue;
    }
    const pending = unassigned.shift();
    perCopy.push(pending ? { kind: pending.kind, freeFrom: pending.freeFrom } : { kind: "available", freeFrom: null });
  }

  const freeCopies = perCopy.filter((c) => c.kind === "available").length;
  const order: SetAvailability[] = ["available", "turnaround", "rented", "repair", "retired"];
  const status = order.find((s) => perCopy.some((c) => c.kind === s)) ?? "retired";
  const nextAvailableDate =
    status === "rented" || status === "turnaround"
      ? perCopy
          .filter((c) => c.freeFrom !== null)
          .map((c) => c.freeFrom as string)
          .sort()[0] ?? null
      : null;

  return { status, nextAvailableDate, freeCopies };
}

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

/* ------------------------------------------------------------------ */
/* Disponibilité sur une période, pour le tunnel de réservation         */
/* ------------------------------------------------------------------ */

type RangeBooking = {
  id: string;
  copyId: string | null;
  customerId: string;
  startDate: string;
  endDate: string;
  proposedStartDate: string | null;
  proposedEndDate: string | null;
};

/** Dates effectivement réservées : la proposition des gérants si elle existe. */
export function bookedRange(b: Pick<RangeBooking, "startDate" | "endDate" | "proposedStartDate" | "proposedEndDate">) {
  return b.proposedStartDate && b.proposedEndDate
    ? { start: b.proposedStartDate, end: b.proposedEndDate }
    : { start: b.startDate, end: b.endDate };
}

/**
 * Premier exemplaire libre du `startDate` au `endDate` inclus, calcul pur.
 * Entre deux clients différents, le battement s'ajoute avant et après.
 * Le même client qui enchaîne sur le même exemplaire n'a pas de battement
 * (prolongation, spécification module 2). `excludeBookingId` ignore la
 * réservation en cours de modification.
 */
export function findFreeCopy(
  copies: CopyInput[],
  bookings: RangeBooking[],
  turnaroundDays: number,
  startDate: string,
  endDate: string,
  customerId: string | null,
  excludeBookingId?: string,
): CopyInput | null {
  const conflicts = (b: RangeBooking) => {
    if (b.id === excludeBookingId) return false;
    const r = bookedRange(b);
    const sameCustomer = customerId !== null && b.customerId === customerId;
    const pad = sameCustomer ? 0 : turnaroundDays;
    return r.start <= addDays(endDate, pad) && r.end >= addDays(startDate, -pad);
  };
  const unassigned = bookings.filter((b) => b.copyId === null && conflicts(b)).length;
  const free = copies.filter(
    (c) => c.status === "available" && !bookings.some((b) => b.copyId === c.id && conflicts(b)),
  );
  return free.length > unassigned ? free[unassigned] : null;
}

export function isInBlackout(date: string, blackouts: { startDate: string; endDate: string }[]) {
  return blackouts.some((b) => b.startDate <= date && date <= b.endDate);
}

/** Un set se réserve seulement s'il a un exemplaire libre aujourd'hui. */
export function isBookable(a: SetAvailabilityResult) {
  return a.status === "available" && a.freeCopies > 0;
}

/* ------------------------------------------------------------------ */
/* Calendrier de disponibilité, pour la fiche d'un set                  */
/* ------------------------------------------------------------------ */

/**
 * État d'un jour du calendrier :
 * - `free` : au moins un exemplaire peut être loué ce jour-là ;
 * - `booked` : tous les exemplaires sont pris, en battement ou indisponibles ;
 * - `closed` : période fermée définie par les gérants ;
 * - `past` : jour déjà passé (ou aujourd'hui : la remise commence demain).
 */
export type DayAvailability = "free" | "booked" | "closed" | "past";

/**
 * Calcul pur, jour par jour du `from` au `to` inclus. Le battement s'applique
 * toujours : on ne connaît pas encore le client qui regarde la fiche.
 * Une période fermée prime sur le reste.
 */
export function computeDayAvailability(
  copies: CopyInput[],
  bookings: RangeBooking[],
  blackouts: { startDate: string; endDate: string }[],
  turnaroundDays: number,
  from: string,
  to: string,
  today: string = todayIso(),
): Record<string, DayAvailability> {
  const days: Record<string, DayAvailability> = {};
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (day <= today) days[day] = "past";
    else if (isInBlackout(day, blackouts)) days[day] = "closed";
    else days[day] = findFreeCopy(copies, bookings, turnaroundDays, day, day, null) ? "free" : "booked";
  }
  return days;
}

/** Premier jour du mois d'une date ISO, décalé de `offset` mois. */
export function monthStart(iso: string, offset = 0) {
  const d = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 10);
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
  const from = monthStart(today);
  const to = addDays(monthStart(today, months + 1), -1);
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
