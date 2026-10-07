"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { daysLate, todayIso } from "@/lib/availability";
import { paymentDeadline } from "@/lib/bookings";
import { hasUnseenHandoverChange } from "@/lib/handover";
import { db, schema } from "@/lib/db";
import { queueBookingEmails } from "@/lib/email/booking-emails";
import {
  firstError,
  formToObject,
  cancelBookingSchema,
  handoverSchema,
  markPaidSchema,
  paymentMethods,
  pickupSchema,
  refuseBookingSchema,
  returnSchema,
} from "@/lib/validation";
import { getSetting } from "@/lib/settings";
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
  await transition(id, r.booking.status, "pending_payment", "Demande acceptée", { paymentDueAt: await paymentDeadline(r.booking.startDate) });
  queueBookingEmails("accepted", id);
  revalidate(id);
  return { ok: "Demande acceptée. Pensez à convenir de l'heure de remise avec le client." };
}

/**
 * Paiement reçu hors ligne (espèces, virement, TPE…) : la réservation est confirmée et le délai de
 * paiement ne s'applique plus. Le moyen est inscrit dans l'historique, pas dans une colonne (pas de
 * migration pour l'instant ; à reprendre avec les notes, module 8). Le paiement en ligne (module 4)
 * fera la même transition.
 */
export async function markPaid(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = markPaidSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
  const r = await loadBooking(id, ["pending_payment"]);
  if ("error" in r) return { error: r.error };
  const method = paymentMethods[parsed.data.method];
  const note = parsed.data.note;
  await transition(id, r.booking.status, "confirmed", `Paiement reçu (${method})${note ? `. ${note}` : ""}`, {
    paymentDueAt: null,
  });
  revalidate(id);
  return { ok: `Paiement enregistré (${method}). La réservation est confirmée.` };
}

/**
 * Prolonger le délai de paiement d'une durée égale au réglage (24 h par défaut), à partir de
 * l'échéance actuelle ou de maintenant si elle est passée. Le plafond du jour de remise ne
 * s'applique pas : c'est un geste choisi par les gérants au cas par cas.
 */
export async function extendPaymentDeadline(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const r = await loadBooking(id, ["pending_payment"]);
  if ("error" in r) return { error: r.error };
  const hours = await getSetting("payment_delay_hours");
  const now = new Date();
  const base = r.booking.paymentDueAt && r.booking.paymentDueAt > now ? r.booking.paymentDueAt : now;
  const due = new Date(base.getTime() + hours * 3_600_000);
  const label = dueFormatter.format(due);
  await db.transaction(async (tx) => {
    await tx.update(schema.bookings).set({ paymentDueAt: due }).where(eq(schema.bookings.id, id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: id,
      actor: "admin",
      fromStatus: "pending_payment",
      toStatus: "pending_payment",
      message: `Délai de paiement prolongé de ${hours} h, jusqu'au ${label}`,
    });
  });
  revalidate(id);
  return { ok: `Délai prolongé jusqu'au ${label}.` };
}

const dueFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

/**
 * Annuler une réservation déjà acceptée, à l'initiative de Set et Brique (set indisponible, client
 * qui a appelé pour annuler, client injoignable…). Distinct du refus d'une demande : l'engagement
 * était pris, d'où le motif obligatoire (visible du client) et un historique « Annulée par Set et
 * Brique ». Rien n'est encaissé en `pending_payment`, donc pas de remboursement à gérer ici ;
 * l'annulation d'une réservation payée (`confirmed`) viendra avec le paiement (module 4).
 */
export async function cancelAcceptedBooking(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = cancelBookingSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
  const r = await loadBooking(id, ["pending_payment"]);
  if ("error" in r) return { error: r.error };
  await transition(id, r.booking.status, "cancelled", `Annulée par Set et Brique : ${parsed.data.reason}`, {
    cancelledAt: new Date(),
    cancelReason: parsed.data.reason,
    paymentDueAt: null,
  });
  // Même e-mail qu'un refus (A4 du document « E-mails automatiques »), avec le motif.
  queueBookingEmails("refused", id);
  revalidate(id);
  return { ok: "Réservation annulée. Le client est prévenu par e-mail." };
}

/** Refuser la demande, avec un motif visible du client. */
export async function refuseBooking(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = refuseBookingSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const r = await loadBooking(id, ["pending_review", "date_proposed"]);
  if ("error" in r) return { error: r.error };
  await transition(id, r.booking.status, "cancelled", parsed.data.reason ?? "Demande refusée", {
    cancelledAt: new Date(),
    cancelReason: parsed.data.reason ?? "Demande refusée par Set et Brique",
    proposedStartDate: null,
    proposedEndDate: null,
  });
  queueBookingEmails("refused", id);
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

  const b = r.booking;
  const newTime = parsed.data.pickupTime;
  const oldTime = b.pickupTime?.slice(0, 5) ?? null;
  if (point.id === b.pickupPointId && newTime === oldTime) return { ok: "Rien n'a changé." };

  // Le client doit voir « avant → après » par rapport à ce qu'il connaissait : si une modification
  // précédente n'a pas encore été vue, on garde son « avant ». Revenir exactement à cet « avant »
  // efface la notification (rien n'a changé pour lui).
  const unseen = hasUnseenHandoverChange(b);
  const previousPointId = unseen ? b.previousPickupPointId : b.pickupPointId;
  const previousTime = unseen ? (b.previousPickupTime?.slice(0, 5) ?? null) : oldTime;
  const backToPrevious = point.id === previousPointId && newTime === previousTime;

  const [oldPoint] = b.pickupPointId
    ? await db.select({ name: schema.pickupPoints.name }).from(schema.pickupPoints).where(eq(schema.pickupPoints.id, b.pickupPointId))
    : [];
  const before = `${oldPoint?.name ?? "lieu à convenir"} à ${oldTime ?? "heure à convenir"}`;
  const after = `${point.name} à ${newTime}`;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({
        pickupPointId: point.id,
        pickupTime: newTime,
        ...(backToPrevious
          ? { handoverChangedAt: null, previousPickupPointId: null, previousPickupTime: null }
          : { handoverChangedAt: new Date(), previousPickupPointId: previousPointId, previousPickupTime: previousTime }),
      })
      .where(eq(schema.bookings.id, id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: id,
      actor: "admin",
      fromStatus: b.status,
      toStatus: b.status,
      message: `Remise modifiée : ${before} → ${after}`,
    });
  });
  queueBookingEmails("handover_changed", id);
  revalidate(id);
  return {
    ok: backToPrevious
      ? `Remise remise comme avant : ${after}. Le client n'avait pas encore vu la modification, elle ne lui est plus signalée.`
      : `Remise modifiée : ${after}. Le client le verra dans son espace.`,
  };
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
  queueBookingEmails("picked_up", id);
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
  queueBookingEmails("returned", id);
  revalidate(id);
  return { ok: late > 0 ? `Retour enregistré, ${late} jour${late > 1 ? "s" : ""} de retard.` : "Retour enregistré." };
}

/**
 * Suspendre ou reprendre les rappels de retard par e-mail (retard convenu avec le client) :
 * tant que la séquence est suspendue, le rappel J+1 et son forfait de 30 € ne partent pas.
 */
export async function toggleReminders(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const paused = formData.get("paused") === "true";
  const r = await loadBooking(id, ["picked_up"]);
  if ("error" in r) return { error: r.error };
  await db.transaction(async (tx) => {
    await tx.update(schema.bookings).set({ remindersPaused: paused }).where(eq(schema.bookings.id, id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: id,
      actor: "admin",
      fromStatus: null,
      toStatus: null,
      message: paused ? "Rappel de retard suspendu" : "Rappel de retard réactivé",
    });
  });
  revalidate(id);
  return { ok: paused ? "Rappel de retard suspendu pour cette location." : "Rappel de retard réactivé." };
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
