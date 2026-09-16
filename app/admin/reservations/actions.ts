"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { daysLate, todayIso } from "@/lib/availability";
import { db, schema } from "@/lib/db";
import { firstError, formToObject, handoverSchema, pickupSchema, refuseBookingSchema, returnSchema } from "@/lib/validation";
import type { ActionState } from "@/components/admin/form";
import type { BookingStatus } from "@/lib/db/schema";

function revalidate(id: string) {
  revalidatePath("/admin/reservations");
  revalidatePath(`/admin/reservations/${id}`);
  revalidatePath("/admin");
  revalidatePath("/compte");
  revalidatePath("/catalogue");
}

async function loadBooking(id: string, allowed: BookingStatus[]) {
  const booking = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, id) });
  if (!booking) return { error: "Réservation introuvable" } as const;
  if (!allowed.includes(booking.status)) {
    return { error: `Action impossible sur une réservation « ${booking.status} ».` } as const;
  }
  return { booking } as const;
}

async function transition(
  bookingId: string,
  from: BookingStatus,
  to: BookingStatus,
  message: string,
  extra: Partial<typeof schema.bookings.$inferInsert> = {},
) {
  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({ status: to, reviewedAt: new Date(), ...extra })
      .where(eq(schema.bookings.id, bookingId));
    await tx.insert(schema.bookingEvents).values({ bookingId, actor: "admin", fromStatus: from, toStatus: to, message });
  });
}

/** Accepter la demande : elle passe en attente de paiement. */
export async function acceptBooking(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const r = await loadBooking(id, ["pending_review"]);
  if ("error" in r) return { error: r.error };
  await transition(id, r.booking.status, "pending_payment", "Demande acceptée");
  revalidate(id);
  return { ok: "Demande acceptée. Pensez à convenir de l'heure de remise avec le client." };
}

/** Refuser la demande, avec un motif visible du client. */
export async function refuseBooking(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = refuseBookingSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const r = await loadBooking(id, ["pending_review", "date_proposed", "pending_payment"]);
  if ("error" in r) return { error: r.error };
  await transition(id, r.booking.status, "cancelled", parsed.data.reason ?? "Demande refusée", {
    cancelledAt: new Date(),
    cancelReason: parsed.data.reason ?? "Demande refusée par Set et Brique",
    proposedStartDate: null,
    proposedEndDate: null,
  });
  revalidate(id);
  return { ok: "Demande refusée." };
}

/**
 * Modifier la remise d'une demande : lieu et heure seulement. Les jours sont
 * ceux choisis par le client, on n'y revient pas. Le client voit la modification
 * dans son espace, la demande reste à accepter.
 */
export async function updateHandover(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = handoverSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const r = await loadBooking(id, ["pending_review", "pending_payment", "confirmed"]);
  if ("error" in r) return { error: r.error };

  const [point] = await db
    .select({ id: schema.pickupPoints.id, name: schema.pickupPoints.name })
    .from(schema.pickupPoints)
    .where(and(eq(schema.pickupPoints.id, parsed.data.pickupPointId), eq(schema.pickupPoints.active, true)));
  if (!point) return { error: "Ce lieu de remise n'est plus proposé." };

  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({ pickupPointId: point.id, pickupTime: parsed.data.pickupTime })
      .where(eq(schema.bookings.id, id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: id,
      actor: "admin",
      fromStatus: r.booking.status,
      toStatus: r.booking.status,
      message: `Remise modifiée : ${point.name} à ${parsed.data.pickupTime}`,
    });
  });
  revalidate(id);
  return { ok: `Remise modifiée : ${point.name} à ${parsed.data.pickupTime}.` };
}

/** Instant d'un jour saisi : maintenant si c'est aujourd'hui, sinon midi à Paris ce jour-là. */
function atDay(date: string) {
  return date === todayIso() ? new Date() : new Date(`${date}T12:00:00+02:00`);
}

/**
 * Remise en main propre faite : la location commence. Possible dès l'acceptation
 * (le loyer peut être réglé par TPE à la remise) ou après paiement en ligne.
 */
export async function markPickedUp(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = pickupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const r = await loadBooking(id, ["pending_payment", "confirmed"]);
  if ("error" in r) return { error: r.error };
  if (parsed.data.date > todayIso()) return { error: "La date de remise ne peut pas être dans le futur." };
  if (!r.booking.copyId) return { error: "Aucun exemplaire attribué à cette réservation." };

  const note = parsed.data.note;
  await transition(id, r.booking.status, "picked_up", note ? `Set remis au client. ${note}` : "Set remis au client", {
    pickedUpAt: atDay(parsed.data.date),
  });
  revalidate(id);
  return { ok: `Remise enregistrée. Retour attendu le ${r.booking.endDate.split("-").reverse().join("/")}.` };
}

/** Retour du set : l'exemplaire se libère (après le battement), la caution suit le module 4. */
export async function markReturned(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = returnSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const r = await loadBooking(id, ["picked_up"]);
  if ("error" in r) return { error: r.error };
  const today = todayIso();
  if (parsed.data.date > today) return { error: "La date de retour ne peut pas être dans le futur." };
  const pickedUpDay = r.booking.pickedUpAt ? new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(r.booking.pickedUpAt) : null;
  if (pickedUpDay && parsed.data.date < pickedUpDay) return { error: "Le retour ne peut pas précéder la remise." };

  const late = daysLate(r.booking.endDate, parsed.data.date);
  const message = late > 0 ? `Set rendu avec ${late} jour${late > 1 ? "s" : ""} de retard` : "Set rendu";
  await transition(id, r.booking.status, "returned", message, {
    returnedAt: atDay(parsed.data.date),
    returnNote: parsed.data.returnNote,
  });
  revalidate(id);
  return { ok: late > 0 ? `Retour enregistré, ${late} jour${late > 1 ? "s" : ""} de retard.` : "Retour enregistré." };
}

export async function saveAdminNote(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim() || null;
  await db.update(schema.bookings).set({ adminNote }).where(eq(schema.bookings.id, id));
  revalidate(id);
  return { ok: "Note enregistrée." };
}

/** Bloquer ou débloquer un client (spécification, module 3). */
export async function toggleCustomerBlock(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const customerId = String(formData.get("customerId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");
  const blocked = formData.get("blocked") === "true";
  const reason = String(formData.get("reason") ?? "").trim() || null;
  await db
    .update(schema.customers)
    .set({ blocked, blockedReason: blocked ? reason : null })
    .where(eq(schema.customers.id, customerId));
  revalidate(bookingId);
  return { ok: blocked ? "Client bloqué : il ne peut plus réserver." : "Client débloqué." };
}
