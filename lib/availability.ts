import { and, gte, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSetting } from "@/lib/settings";

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

/** Réservations qui bloquent un exemplaire. */
export const BLOCKING_BOOKING_STATUSES = ["pending_payment", "confirmed", "picked_up"] as const;

/** Date du jour à Paris, au format ISO (aaaa-mm-jj), comparable aux colonnes `date`. */
export function todayIso() {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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
        startDate: schema.bookings.startDate,
        endDate: schema.bookings.endDate,
      })
      .from(schema.bookings)
      .where(
        and(
          inArray(schema.bookings.setId, ids),
          inArray(schema.bookings.status, [...BLOCKING_BOOKING_STATUSES]),
          // Seules les réservations récentes ou à venir peuvent bloquer aujourd'hui.
          gte(schema.bookings.endDate, addDays(today, -(maxTurnaround + 1))),
        ),
      ),
  ]);

  for (const set of sets) {
    result.set(
      set.id,
      computeSetAvailability(
        copies.filter((c) => c.setId === set.id),
        bookings.filter((b) => b.setId === set.id),
        set.turnaroundDays ?? globalTurnaround,
        today,
      ),
    );
  }
  return result;
}

/** Un set se réserve seulement s'il a un exemplaire libre aujourd'hui. */
export function isBookable(a: SetAvailabilityResult) {
  return a.status === "available" && a.freeCopies > 0;
}
