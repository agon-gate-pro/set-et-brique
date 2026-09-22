/**
 * Calculs de disponibilité purs, sans base ni import serveur : utilisables
 * aussi bien côté serveur (`lib/availability.ts`, `lib/bookings.ts`) que
 * côté navigateur (calendrier du tunnel de réservation), pour ne jamais
 * dupliquer cette logique entre l'aperçu affiché au client et la validation
 * réelle à l'envoi de la demande.
 */
import { addDays, todayIso } from "@/lib/dates";

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

export type CopyInput = { id: string; status: "available" | "maintenance" | "retired" };
export type BookingInput = {
  copyId: string | null;
  startDate: string;
  endDate: string;
  /** Un des statuts de `RESERVING_STATUSES` : le tableau reçu peut couvrir demandes en attente comprises. */
  status: string;
  proposedStartDate?: string | null;
  proposedEndDate?: string | null;
};

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
  // Le statut affiché aujourd'hui (`kind`) ne reflète que l'occupation réelle : une demande
  // en attente n'a pas encore été acceptée, elle ne doit pas faire passer le set en « loué ».
  // `bookings` peut en revanche couvrir plus large (demandes en attente comprises,
  // `RESERVING_STATUSES`) pour la recherche de la prochaine date libre plus bas, qui doit
  // elle tenir compte de ce qui est déjà retenu pour ne pas annoncer une date déjà reprise.
  const occupying = bookings.filter((b) => (OCCUPYING_STATUSES as readonly string[]).includes(b.status));

  const blocks = (b: BookingInput) => {
    const freeFrom = addDays(b.endDate, turnaroundDays + 1);
    if (b.startDate <= today && today <= b.endDate) return { kind: "rented" as const, freeFrom };
    if (b.endDate < today && today < freeFrom) return { kind: "turnaround" as const, freeFrom };
    return null;
  };

  const perCopy: { kind: SetAvailability }[] = [];
  const unassigned = occupying.filter((b) => b.copyId === null).map(blocks).filter((x) => x !== null);

  for (const copy of copies) {
    if (copy.status === "retired") {
      perCopy.push({ kind: "retired" });
      continue;
    }
    if (copy.status === "maintenance") {
      perCopy.push({ kind: "repair" });
      continue;
    }
    const own = occupying
      .filter((b) => b.copyId === copy.id)
      .map(blocks)
      .filter((x) => x !== null);
    // Loué prime sur battement.
    const rented = own.filter((x) => x.kind === "rented");
    const chosen = rented.length > 0 ? rented : own;
    if (chosen.length > 0) {
      perCopy.push({ kind: chosen[0].kind });
      continue;
    }
    const pending = unassigned.shift();
    perCopy.push(pending ? { kind: pending.kind } : { kind: "available" });
  }

  const freeCopies = perCopy.filter((c) => c.kind === "available").length;
  const order: SetAvailability[] = ["available", "turnaround", "rented", "repair", "retired"];
  const status = order.find((s) => perCopy.some((c) => c.kind === s)) ?? "retired";

  /**
   * Cherché jour par jour avec `findFreeCopy`, comme le calendrier de la fiche set
   * (`computeDayAvailability`) — pas déduit de la seule date de fin + battement de la
   * location en cours (`freeFrom` ci-dessus, qui reste utile pour classer chaque
   * exemplaire « loué » vs « en battement » aujourd'hui, mais ignore une réservation
   * déjà prise juste après sur le même exemplaire). Les deux calculs avaient fini par
   * diverger : la fiche annonçait une date de retour que le calendrier, juste en
   * dessous, ne confirmait pas.
   */
  let nextAvailableDate: string | null = null;
  if (status === "rented" || status === "turnaround") {
    // `bookings` ici, pas `occupying` : une demande en attente réserve déjà des dates
    // (`RESERVING_STATUSES`, même logique que le calendrier de la fiche set) — l'ignorer
    // annoncerait une date de retour que la demande en question a déjà reprise.
    const rangeBookings: RangeBooking[] = bookings.map((b, i) => ({
      id: String(i),
      copyId: b.copyId,
      customerId: "",
      startDate: b.startDate,
      endDate: b.endDate,
      proposedStartDate: b.proposedStartDate ?? null,
      proposedEndDate: b.proposedEndDate ?? null,
    }));
    let day = addDays(today, 1);
    for (let i = 0; i < 400; i++) {
      if (findFreeCopy(copies, rangeBookings, turnaroundDays, day, day, null)) {
        nextAvailableDate = day;
        break;
      }
      day = addDays(day, 1);
    }
  }

  return { status, nextAvailableDate, freeCopies };
}

/* ------------------------------------------------------------------ */
/* Disponibilité sur une période, pour le tunnel de réservation         */
/* ------------------------------------------------------------------ */

export type RangeBooking = {
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
