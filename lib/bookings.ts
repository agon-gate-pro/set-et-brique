import { randomInt } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { User } from "@clerk/backend";
import {
  RESERVING_STATUSES,
  endDateFor,
  findFreeCopy,
  isInBlackout,
  todayIso,
  withLateReturn,
} from "@/lib/availability";
import { db, schema } from "@/lib/db";
import type { Customer } from "@/lib/db/schema";
import { getSetting } from "@/lib/settings";

/** Référence courte lisible, sans caractères ambigus (0/O, 1/I). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeReference() {
  let code = "";
  for (let i = 0; i < 5; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `SB-${code}`;
}

export type CustomerInput = {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  postalCode: string;
  city: string;
  preferredPickupPointId?: string | null;
};

/**
 * Fiche client rattachée au compte Clerk, créée à la première demande.
 * Les coordonnées du formulaire écrasent celles en base : c'est le client
 * qui les met à jour.
 */
export async function upsertCustomer(user: User, input: CustomerInput) {
  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";
  const [customer] = await db
    .insert(schema.customers)
    .values({ clerkUserId: user.id, email, ...input })
    .onConflictDoUpdate({
      target: schema.customers.clerkUserId,
      set: { email, ...input },
    })
    .returning();
  return customer;
}

/** Champs obligatoires pour réserver : contrat et facture (spécification, modules 3 et 7). */
export function isCustomerComplete(
  c: Pick<Customer, "firstName" | "lastName" | "phone" | "addressLine" | "postalCode" | "city"> | null | undefined,
) {
  return !!c && [c.firstName, c.lastName, c.phone, c.addressLine, c.postalCode, c.city].every((v) => v && v.trim() !== "");
}

/** Chemin de retour interne (« /catalogue/x/reserver ») ; tout le reste est ignoré. */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\/(?!\/)[^\s]*$/.test(value) ? value : null;
}

/** Adresse de la page Coordonnées, avec retour vers une page une fois enregistrées. */
export function coordinatesUrl(returnTo?: string | null) {
  return returnTo ? `/compte/profil/coordonnees?retour=${encodeURIComponent(returnTo)}` : "/compte/profil/coordonnees";
}

export async function findCustomerByClerkId(clerkUserId: string) {
  return db.query.customers.findFirst({ where: eq(schema.customers.clerkUserId, clerkUserId) });
}

export class BookingError extends Error {}

export type BookingRequest = {
  setId: string;
  customerId: string;
  pickupPointId: string;
  startDate: string;
  days: number;
  pickupTime: string;
  customerNote: string | null;
};

/**
 * Vérifie les dates puis crée la demande, en attente de validation par les
 * gérants. L'exemplaire est attribué tout de suite pour bloquer les dates.
 * Lève `BookingError` avec un message destiné au client.
 */
export async function createBookingRequest(req: BookingRequest) {
  const today = todayIso();
  const minDays = await getSetting("min_rental_days");
  if (req.days < minDays) throw new BookingError(`Durée minimale : ${minDays} jour${minDays > 1 ? "s" : ""}.`);
  if (req.startDate <= today) throw new BookingError("Choisissez une date de remise à partir de demain.");
  const endDate = endDateFor(req.startDate, req.days);

  const [set, pickupPoint, blackouts, defaultPlan, globalTurnaround] = await Promise.all([
    db.query.sets.findFirst({
      where: and(eq(schema.sets.id, req.setId), eq(schema.sets.status, "published")),
      with: { ratePlan: true },
    }),
    db.query.pickupPoints.findFirst({
      where: and(eq(schema.pickupPoints.id, req.pickupPointId), eq(schema.pickupPoints.active, true)),
    }),
    db.select().from(schema.blackoutPeriods),
    db.query.ratePlans.findFirst({ where: eq(schema.ratePlans.isDefault, true) }),
    getSetting("turnaround_days"),
  ]);
  if (!set) throw new BookingError("Ce set n'est plus proposé à la location.");
  if (!pickupPoint) throw new BookingError("Choisissez un lieu de remise.");
  if (isInBlackout(req.startDate, blackouts)) throw new BookingError("Nous sommes fermés à la date de remise choisie.");
  if (isInBlackout(endDate, blackouts)) throw new BookingError("Nous sommes fermés à la date de retour. Choisissez une autre durée ou une autre date.");

  const pricePerDay = set.ratePlan?.priceCentsPerDay ?? defaultPlan?.priceCentsPerDay;
  if (pricePerDay == null) throw new BookingError("Aucun tarif n'est défini pour ce set. Contactez-nous.");
  const turnaround = set.turnaroundDays ?? globalTurnaround;

  return db.transaction(async (tx) => {
    // Verrou sur les exemplaires du set : deux demandes simultanées ne prennent pas le même.
    const copies = await tx
      .select({ id: schema.setCopies.id, status: schema.setCopies.status })
      .from(schema.setCopies)
      .where(eq(schema.setCopies.setId, set.id))
      .for("update");
    const bookings = await tx
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
      .where(and(eq(schema.bookings.setId, set.id), inArray(schema.bookings.status, [...RESERVING_STATUSES])));

    const copy = findFreeCopy(copies, bookings.map((b) => withLateReturn(b, today)), turnaround, req.startDate, endDate, req.customerId);
    if (!copy) throw new BookingError("Ce set n'est pas disponible à ces dates, en comptant le délai de remise en état entre deux locations.");

    let booking: typeof schema.bookings.$inferSelect | undefined;
    for (let attempt = 0; attempt < 5 && !booking; attempt++) {
      const reference = makeReference();
      const exists = await tx.query.bookings.findFirst({ where: eq(schema.bookings.reference, reference) });
      if (exists) continue;
      [booking] = await tx
        .insert(schema.bookings)
        .values({
          reference,
          customerId: req.customerId,
          setId: set.id,
          copyId: copy.id,
          pickupPointId: pickupPoint.id,
          startDate: req.startDate,
          endDate,
          pickupTime: req.pickupTime,
          days: req.days,
          status: "pending_review",
          rentalCents: req.days * pricePerDay,
          depositCents: set.depositCents,
          customerNote: req.customerNote,
          termsAcceptedAt: new Date(),
        })
        .returning();
    }
    if (!booking) throw new BookingError("Impossible de générer une référence. Réessayez.");

    await tx.insert(schema.bookingEvents).values({
      bookingId: booking.id,
      actor: "customer",
      fromStatus: null,
      toStatus: "pending_review",
      message: "Demande envoyée",
    });
    return booking;
  });
}

/** Un autre exemplaire est-il libre sur ces dates pour cette réservation ? */
export async function isRangeFreeFor(
  booking: { id: string; setId: string; customerId: string },
  startDate: string,
  endDate: string,
) {
  const [set, copies, bookings, globalTurnaround] = await Promise.all([
    db.query.sets.findFirst({ where: eq(schema.sets.id, booking.setId) }),
    db
      .select({ id: schema.setCopies.id, status: schema.setCopies.status })
      .from(schema.setCopies)
      .where(eq(schema.setCopies.setId, booking.setId)),
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
      .where(and(eq(schema.bookings.setId, booking.setId), inArray(schema.bookings.status, [...RESERVING_STATUSES]))),
    getSetting("turnaround_days"),
  ]);
  if (!set) return null;
  return findFreeCopy(
    copies,
    bookings.map((b) => withLateReturn(b)),
    set.turnaroundDays ?? globalTurnaround,
    startDate,
    endDate,
    booking.customerId,
    booking.id,
  );
}
