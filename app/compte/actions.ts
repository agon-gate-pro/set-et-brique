"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findCustomerByClerkId } from "@/lib/bookings";
import { db, schema } from "@/lib/db";
import type { ActionState } from "@/components/admin/form";

function revalidate() {
  revalidatePath("/compte");
  revalidatePath("/admin/reservations");
}

/** Réservation du client connecté, ou null. */
async function ownBooking(bookingId: string) {
  const { userId } = await auth();
  if (!userId) return null;
  const customer = await findCustomerByClerkId(userId);
  if (!customer) return null;
  return db.query.bookings.findFirst({
    where: and(eq(schema.bookings.id, bookingId), eq(schema.bookings.customerId, customer.id)),
  });
}

/** Le client accepte la date proposée par les gérants : elle remplace la sienne. */
export async function acceptProposedDate(_: ActionState, formData: FormData): Promise<ActionState> {
  const booking = await ownBooking(String(formData.get("id") ?? ""));
  if (!booking || booking.status !== "date_proposed" || !booking.proposedStartDate || !booking.proposedEndDate) {
    return { error: "Aucune proposition en attente sur cette réservation." };
  }
  const pricePerDay = Math.round(booking.rentalCents / booking.days);
  const days =
    Math.round((Date.parse(booking.proposedEndDate) - Date.parse(booking.proposedStartDate)) / 86_400_000) + 1;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({
        startDate: booking.proposedStartDate!,
        endDate: booking.proposedEndDate!,
        days,
        rentalCents: days * pricePerDay,
        proposedStartDate: null,
        proposedEndDate: null,
        status: "pending_payment",
      })
      .where(eq(schema.bookings.id, booking.id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: booking.id,
      actor: "customer",
      fromStatus: "date_proposed",
      toStatus: "pending_payment",
      message: "Nouvelle date acceptée par le client",
    });
  });
  revalidate();
  return { ok: "Nouvelle date acceptée. Nous revenons vers vous pour la remise." };
}

/** Le client annule sa demande tant qu'elle n'est pas confirmée. */
export async function cancelRequest(_: ActionState, formData: FormData): Promise<ActionState> {
  const booking = await ownBooking(String(formData.get("id") ?? ""));
  if (!booking || !["pending_review", "date_proposed"].includes(booking.status)) {
    return { error: "Cette réservation ne peut plus être annulée en ligne. Contactez-nous." };
  }
  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "Annulée par le client" })
      .where(eq(schema.bookings.id, booking.id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: booking.id,
      actor: "customer",
      fromStatus: booking.status,
      toStatus: "cancelled",
      message: booking.status === "date_proposed" ? "Nouvelle date refusée par le client" : "Demande annulée par le client",
    });
  });
  revalidate();
  return { ok: "Demande annulée." };
}
