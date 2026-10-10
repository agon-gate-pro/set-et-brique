import { and, desc, eq, inArray, like, lt, or, sql } from "drizzle-orm";
import {
  RESERVING_STATUSES,
  extensionWindow,
  isExtensionEndAllowed,
  latestExtensionEnd,
  withExtension,
  withLateReturn,
  type ExtensionWindow,
} from "@/lib/availability-core";
import { addDays, daysBetween, monthStartIso, parisEndOfDay, todayIso } from "@/lib/dates";
import { db, schema } from "@/lib/db";
import type { BookingExtension } from "@/lib/db/schema";
import { sendExtensionEmails } from "@/lib/email/booking-emails";
import { formatCents, formatDate } from "@/lib/format";
import { getSetting } from "@/lib/settings";

/** Demandes de prolongation qui réservent déjà les jours demandés : en attente de réponse ou de paiement. */
export const ACTIVE_EXTENSION_STATUSES = ["pending_review", "pending_payment"] as const;

/** Mois couverts par le choix de la nouvelle date de retour, comme le calendrier de la fiche set. */
const HORIZON_MONTHS = 6;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Colonne calculée à ajouter aux lectures de `bookings` qui servent au calcul de disponibilité :
 * nouvelle date de retour demandée par une prolongation encore en cours, sinon null. À passer
 * ensuite dans `withExtension` (`lib/availability-core.ts`).
 *
 * Une demande cesse de bloquer d'elle-même, sans attendre que `expireStaleExtensions` la passe en
 * `expired` : restée sans réponse une fois le jour de retour d'origine passé, ou acceptée mais non
 * payée à l'échéance. Dans les deux cas la date de retour d'origine reste due.
 *
 * Noms écrits en clair et qualifiés : dans une lecture sur une seule table, Drizzle rend les
 * colonnes sans leur table, et `id` désignerait alors la prolongation au lieu de la réservation.
 */
export function activeExtensionEnd(today: string) {
  return sql<string | null>`(
    select max(e.new_end_date)::text from booking_extensions e
    where e.booking_id = "bookings"."id"
      and (
        (e.status = 'pending_review' and e.previous_end_date >= ${today})
        or (e.status = 'pending_payment' and (e.payment_due_at is null or e.payment_due_at > now()))
      )
  )`;
}

/**
 * Passe en `expired` les demandes qui n'ont plus lieu d'être (mêmes conditions que
 * `activeExtensionEnd`) et l'inscrit dans l'historique de la réservation. Comme
 * `expireOverduePayments`, sans risque en parallèle : l'`UPDATE` ne renvoie chaque ligne qu'une fois.
 */
export async function expireStaleExtensions(today: string = todayIso(), now = new Date()) {
  const e = schema.bookingExtensions;
  const expired = await db.transaction(async (tx) => {
    const rows = await tx
      .update(e)
      .set({ status: "expired" })
      .where(
        or(
          and(eq(e.status, "pending_review"), lt(e.previousEndDate, today)),
          and(eq(e.status, "pending_payment"), lt(e.paymentDueAt, now)),
        ),
      )
      .returning({ id: e.id, bookingId: e.bookingId, paymentDueAt: e.paymentDueAt });
    if (rows.length > 0) {
      await tx.insert(schema.bookingEvents).values(
        rows.map((x) => ({
          bookingId: x.bookingId,
          actor: "system" as const,
          message: x.paymentDueAt
            ? "Prolongation expirée : délai de paiement dépassé"
            : "Prolongation expirée : restée sans réponse avant le jour du retour",
        })),
      );
    }
    return rows;
  });
  // E-mail au client seulement pour un supplément non réglé : une demande restée sans réponse
  // expire le lendemain du retour prévu, quand les rappels de fin de location ont déjà tout dit.
  // Envoi attendu ici (pas `after()`), comme pour `expireOverduePayments`.
  for (const x of expired) {
    if (!x.paymentDueAt) continue;
    try {
      await sendExtensionEmails("extension_payment_expired", x.id);
    } catch (err) {
      console.error(`[email] extension_payment_expired pour la prolongation ${x.id}`, err);
    }
  }
  return expired.length;
}

/** Ce qu'il faut pour proposer une nouvelle date de retour au client. */
export type ExtensionOptions = {
  /** Dernière date de retour possible, null si aucun jour ne peut être ajouté. */
  latestEndDate: string | null;
  blackouts: { startDate: string; endDate: string }[];
  pricePerDayCents: number;
};

type ExtendableBooking = {
  id: string;
  setId: string;
  copyId: string | null;
  customerId: string;
  endDate: string;
  days: number;
  rentalCents: number;
};

export async function loadExtensionOptions(
  booking: ExtendableBooking,
  executor: Tx | typeof db = db,
  today: string = todayIso(),
): Promise<ExtensionOptions> {
  const [set] = await executor
    .select({ turnaroundDays: schema.sets.turnaroundDays })
    .from(schema.sets)
    .where(eq(schema.sets.id, booking.setId));
  const bookings = await executor
    .select({
      id: schema.bookings.id,
      copyId: schema.bookings.copyId,
      customerId: schema.bookings.customerId,
      status: schema.bookings.status,
      startDate: schema.bookings.startDate,
      endDate: schema.bookings.endDate,
      proposedStartDate: schema.bookings.proposedStartDate,
      proposedEndDate: schema.bookings.proposedEndDate,
      extendedEndDate: activeExtensionEnd(today),
    })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.setId, booking.setId), inArray(schema.bookings.status, [...RESERVING_STATUSES])));
  const blackouts = await executor
    .select({ startDate: schema.blackoutPeriods.startDate, endDate: schema.blackoutPeriods.endDate })
    .from(schema.blackoutPeriods);
  const turnaround = set?.turnaroundDays ?? (await getSetting("turnaround_days"));
  const horizon = addDays(monthStartIso(today, HORIZON_MONTHS), -1);
  return {
    latestEndDate: latestExtensionEnd(
      booking,
      bookings.map((b) => withLateReturn(withExtension(b), today)),
      blackouts,
      turnaround,
      horizon,
    ),
    // Seules les fermetures à venir servent au calendrier du client.
    blackouts: blackouts.filter((b) => b.endDate > booking.endDate),
    // Même tarif par jour que la location, relu sur son montant.
    pricePerDayCents: Math.round(booking.rentalCents / booking.days),
  };
}

/** Même calcul à partir de l'identifiant seul : l'espace client ne lit que les colonnes montrables au navigateur. */
export async function loadExtensionOptionsFor(bookingId: string): Promise<ExtensionOptions | null> {
  const booking = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, bookingId) });
  return booking ? loadExtensionOptions(booking) : null;
}

export class ExtensionError extends Error {}

/**
 * Le client demande à garder son set jusqu'à `newEndDate`. Tout est revérifié sous verrou : la
 * location est bien en cours et dans les temps, aucune autre demande n'est ouverte, et la date
 * reste possible. La demande naît en `pending_review` et réserve ses jours tout de suite. Lève
 * `ExtensionError` avec un message destiné au client.
 */
export async function createExtensionRequest(bookingId: string, customerId: string, newEndDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newEndDate)) throw new ExtensionError("Choisissez une nouvelle date de retour.");
  const today = todayIso();
  // Une ancienne demande périmée ne doit pas compter comme « déjà en cours ».
  await expireStaleExtensions(today);
  return db.transaction(async (tx) => {
    const booking = await tx.query.bookings.findFirst({
      where: and(eq(schema.bookings.id, bookingId), eq(schema.bookings.customerId, customerId)),
    });
    if (!booking) throw new ExtensionError("Location introuvable.");
    // Même verrou que la création d'une demande : pas de réservation prise en même temps sur ces jours.
    await tx.select({ id: schema.setCopies.id }).from(schema.setCopies).where(eq(schema.setCopies.setId, booking.setId)).for("update");

    const window = extensionWindow(booking.status, booking.endDate, today);
    if (window === "not_yet") throw new ExtensionError("La prolongation sera possible dès que le set sera chez vous.");
    if (window === "closed") {
      throw new ExtensionError("La prolongation se demande au plus tard la veille du retour. Contactez-nous.");
    }
    const open = await tx.query.bookingExtensions.findFirst({
      where: and(
        eq(schema.bookingExtensions.bookingId, booking.id),
        inArray(schema.bookingExtensions.status, [...ACTIVE_EXTENSION_STATUSES]),
      ),
    });
    if (open) throw new ExtensionError("Une demande de prolongation est déjà en cours pour cette location.");

    const options = await loadExtensionOptions(booking, tx, today);
    if (!isExtensionEndAllowed(newEndDate, booking.endDate, options.latestEndDate, options.blackouts)) {
      throw new ExtensionError(
        options.latestEndDate
          ? `Cette date n'est pas possible. Le set peut être gardé jusqu'au ${formatDate(options.latestEndDate)} au plus tard, hors jours de fermeture.`
          : "Ce set est réservé juste après votre location : il ne peut pas être prolongé.",
      );
    }

    const extraDays = daysBetween(booking.endDate, newEndDate);
    const extraRentalCents = extraDays * options.pricePerDayCents;
    const [extension] = await tx
      .insert(schema.bookingExtensions)
      .values({ bookingId: booking.id, previousEndDate: booking.endDate, newEndDate, extraDays, extraRentalCents })
      .returning();
    await tx.insert(schema.bookingEvents).values({
      bookingId: booking.id,
      actor: "customer",
      message: `Prolongation demandée jusqu'au ${formatDate(newEndDate)} : ${extraDays} jour${extraDays > 1 ? "s" : ""} de plus, ${formatCents(extraRentalCents)}`,
    });
    return extension;
  });
}

/** Le client retire sa demande tant que les gérants n'y ont pas répondu. */
export async function cancelExtensionRequest(extensionId: string, customerId: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: schema.bookingExtensions.id, bookingId: schema.bookingExtensions.bookingId })
      .from(schema.bookingExtensions)
      .innerJoin(schema.bookings, eq(schema.bookings.id, schema.bookingExtensions.bookingId))
      .where(and(eq(schema.bookingExtensions.id, extensionId), eq(schema.bookings.customerId, customerId)));
    if (!row) throw new ExtensionError("Demande introuvable.");
    const [cancelled] = await tx
      .update(schema.bookingExtensions)
      .set({ status: "cancelled" })
      .where(and(eq(schema.bookingExtensions.id, row.id), eq(schema.bookingExtensions.status, "pending_review")))
      .returning({ id: schema.bookingExtensions.id });
    if (!cancelled) throw new ExtensionError("Cette demande ne peut plus être annulée en ligne. Contactez-nous.");
    await tx.insert(schema.bookingEvents).values({
      bookingId: row.bookingId,
      actor: "customer",
      message: "Demande de prolongation annulée par le client",
    });
  });
}

/** Champs d'une prolongation en cours montrés au client sur la carte de sa location. */
export type CustomerExtension = Pick<
  BookingExtension,
  "id" | "status" | "newEndDate" | "extraDays" | "extraRentalCents" | "paymentDueAt" | "reason"
>;

/* ------------------------------------------------------------------ */
/* Traitement par les gérants                                           */
/* ------------------------------------------------------------------ */

/**
 * Échéance de paiement d'une prolongation acceptée : délai habituel (`payment_delay_hours`),
 * plafonné à la fin du jour de retour d'origine. Passé ce jour sans paiement, le set est dû.
 */
export async function extensionPaymentDeadline(previousEndDate: string, from = new Date()) {
  const hours = await getSetting("payment_delay_hours");
  const byDelay = new Date(from.getTime() + hours * 3_600_000);
  const byReturn = parisEndOfDay(previousEndDate);
  return byReturn < byDelay ? byReturn : byDelay;
}

/**
 * Demande encore décidable, verrouillée avec sa location. Les appelants passent d'abord les
 * demandes périmées en `expired` (hors transaction, pour que ce passage reste acquis même si la
 * décision est ensuite refusée) : une réponse tardive ne ressuscite pas une prolongation dont la
 * date de retour d'origine est déjà passée.
 */
async function lockExtension(tx: Tx, extensionId: string, expected: BookingExtension["status"]) {
  const [extension] = await tx
    .select()
    .from(schema.bookingExtensions)
    .where(eq(schema.bookingExtensions.id, extensionId))
    .for("update");
  if (!extension) throw new ExtensionError("Demande de prolongation introuvable.");
  if (extension.status !== expected) {
    throw new ExtensionError(
      extension.status === "expired"
        ? "Cette demande a expiré : le set est dû à la date de retour d'origine."
        : extension.status === "pending_review"
          ? "Cette demande n'est pas encore acceptée."
          : "Cette demande de prolongation a déjà été traitée.",
    );
  }
  const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, extension.bookingId)).for("update");
  if (!booking || booking.status !== "picked_up" || booking.endDate !== extension.previousEndDate) {
    throw new ExtensionError("La location a changé depuis cette demande : elle ne peut plus être prolongée ainsi.");
  }
  return { extension, booking };
}

const describe = (e: Pick<BookingExtension, "newEndDate" | "extraDays" | "extraRentalCents">) =>
  `jusqu'au ${formatDate(e.newEndDate)} (${e.extraDays} jour${e.extraDays > 1 ? "s" : ""} de plus, ${formatCents(e.extraRentalCents)})`;

/** Les gérants acceptent : le supplément devient dû, la date de retour ne change qu'au paiement. */
export async function acceptExtension(extensionId: string) {
  await expireStaleExtensions();
  return db.transaction(async (tx) => {
    const { extension, booking } = await lockExtension(tx, extensionId, "pending_review");
    const now = new Date();
    const paymentDueAt = await extensionPaymentDeadline(extension.previousEndDate, now);
    await tx
      .update(schema.bookingExtensions)
      .set({ status: "pending_payment", reviewedAt: now, paymentDueAt })
      .where(eq(schema.bookingExtensions.id, extension.id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: booking.id,
      actor: "admin",
      message: `Prolongation acceptée ${describe(extension)}, en attente de paiement`,
    });
    return { bookingId: booking.id, paymentDueAt };
  });
}

/** Les gérants refusent : la date de retour d'origine reste due. Le motif est montré au client. */
export async function refuseExtension(extensionId: string, reason: string | null) {
  await expireStaleExtensions();
  return db.transaction(async (tx) => {
    const { extension, booking } = await lockExtension(tx, extensionId, "pending_review");
    await tx
      .update(schema.bookingExtensions)
      .set({ status: "refused", reviewedAt: new Date(), reason })
      .where(eq(schema.bookingExtensions.id, extension.id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: booking.id,
      actor: "admin",
      message: `Prolongation refusée${reason ? ` : ${reason}` : ""}`,
    });
    return { bookingId: booking.id };
  });
}

/**
 * Supplément réglé : la prolongation est reportée sur la location (date de retour, jours, loyer).
 * Les rappels de fin de location déjà envoyés pour l'ancienne date sont renommés dans le journal
 * des e-mails, sinon l'index « un rappel par étape » empêcherait ceux de la nouvelle date de partir.
 */
export async function markExtensionPaid(extensionId: string, paymentLabel: string) {
  await expireStaleExtensions();
  return db.transaction(async (tx) => {
    const { extension, booking } = await lockExtension(tx, extensionId, "pending_payment");
    await tx
      .update(schema.bookingExtensions)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(schema.bookingExtensions.id, extension.id));
    await tx
      .update(schema.bookings)
      .set({
        endDate: extension.newEndDate,
        days: booking.days + extension.extraDays,
        rentalCents: booking.rentalCents + extension.extraRentalCents,
      })
      .where(eq(schema.bookings.id, booking.id));
    await tx
      .update(schema.emailLog)
      .set({ kind: sql`'avant_prolongation_' || ${schema.emailLog.kind}` })
      .where(and(eq(schema.emailLog.bookingId, booking.id), like(schema.emailLog.kind, "reminder_%")));
    await tx.insert(schema.bookingEvents).values({
      bookingId: booking.id,
      actor: "admin",
      message: `Prolongation payée (${paymentLabel}) : retour repoussé du ${formatDate(extension.previousEndDate)} au ${formatDate(extension.newEndDate)}`,
    });
    return { bookingId: booking.id, newEndDate: extension.newEndDate };
  });
}

/* ------------------------------------------------------------------ */
/* Lecture pour l'espace client                                         */
/* ------------------------------------------------------------------ */

/** Ce que la carte d'une location montre de sa prolongation. */
export type CustomerExtensionView = {
  window: ExtensionWindow;
  /** Dates possibles, calculées seulement quand une demande peut être faite. */
  options: ExtensionOptions | null;
  /** Demande en attente de réponse ou de paiement. */
  current: CustomerExtension | null;
  /** Dernière demande refusée ou expirée pour la date de retour actuelle, à signaler au client. */
  last: CustomerExtension | null;
};

export async function loadCustomerExtensions(
  bookings: { id: string; status: string; endDate: string }[],
  today: string = todayIso(),
): Promise<Map<string, CustomerExtensionView>> {
  if (bookings.length === 0) return new Map();
  const e = schema.bookingExtensions;
  const rows = await db
    .select({
      id: e.id,
      bookingId: e.bookingId,
      status: e.status,
      previousEndDate: e.previousEndDate,
      newEndDate: e.newEndDate,
      extraDays: e.extraDays,
      extraRentalCents: e.extraRentalCents,
      paymentDueAt: e.paymentDueAt,
      reason: e.reason,
    })
    .from(e)
    .where(
      and(
        inArray(e.bookingId, bookings.map((b) => b.id)),
        inArray(e.status, [...ACTIVE_EXTENSION_STATUSES, "refused", "expired"]),
      ),
    )
    .orderBy(desc(e.createdAt));
  return new Map(
    await Promise.all(
      bookings.map(async (b) => {
        const window = extensionWindow(b.status, b.endDate, today);
        const latest = rows.find((r) => r.bookingId === b.id);
        const view: CustomerExtension | null = latest
          ? {
              id: latest.id,
              status: latest.status,
              newEndDate: latest.newEndDate,
              extraDays: latest.extraDays,
              extraRentalCents: latest.extraRentalCents,
              paymentDueAt: latest.paymentDueAt,
              reason: latest.reason,
            }
          : null;
        const active = latest && (ACTIVE_EXTENSION_STATUSES as readonly string[]).includes(latest.status);
        const current = active ? view : null;
        const last = !active && latest?.previousEndDate === b.endDate ? view : null;
        const options = window === "open" && !current ? await loadExtensionOptionsFor(b.id) : null;
        return [b.id, { window, options, current, last }] as const;
      }),
    ),
  );
}
