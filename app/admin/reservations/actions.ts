"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { endDateFor, todayIso } from "@/lib/availability";
import { isRangeFreeFor } from "@/lib/bookings";
import { db, schema } from "@/lib/db";
import { firstError, formToObject, proposeDateSchema, refuseBookingSchema } from "@/lib/validation";
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

/** Proposer d'autres dates : le client accepte ou annule depuis son compte. */
export async function proposeDate(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = proposeDateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const r = await loadBooking(id, ["pending_review", "date_proposed"]);
  if ("error" in r) return { error: r.error };

  const { startDate, days, message } = parsed.data;
  if (startDate <= todayIso()) return { error: "La date de remise doit être à venir." };
  const endDate = endDateFor(startDate, days);
  const copy = await isRangeFreeFor(r.booking, startDate, endDate);
  if (!copy) return { error: "Aucun exemplaire libre sur ces dates (battement compris)." };

  await transition(id, r.booking.status, "date_proposed", `Autre date proposée : du ${startDate} au ${endDate}`, {
    proposedStartDate: startDate,
    proposedEndDate: endDate,
    copyId: copy.id,
    cancelReason: message,
  });
  revalidate(id);
  return { ok: "Proposition envoyée au client : elle apparaît dans son espace." };
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
