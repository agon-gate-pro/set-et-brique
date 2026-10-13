"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { findCustomerByClerkId, paymentDeadline } from "@/lib/bookings";
import { db, schema } from "@/lib/db";
import { queueBookingEmails, queueExtensionEmails } from "@/lib/email/booking-emails";
import { ExtensionError, cancelExtensionRequest, createExtensionRequest } from "@/lib/extensions";
import { hasUnseenHandoverChange } from "@/lib/handover";
import { createBookingCheckout, createExtensionCheckout, lookupGiftVoucher, type BookingCheckoutResult } from "@/lib/payments";
import { site } from "@/lib/site";
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

export type GiftVoucherCheck = { error: string } | { code: string; amountCents: number };

/**
 * Vérifie un code de bon cadeau saisi dans le récapitulatif de paiement, sans le consommer : le
 * bon ne passe à « utilisé » qu'au paiement, qui le revérifie côté serveur (`createBookingCheckout`).
 */
export async function checkGiftVoucher(bookingId: string, rawCode: string): Promise<GiftVoucherCheck> {
  const booking = await ownBooking(bookingId);
  if (!booking || booking.status !== "pending_payment") {
    return { error: "Cette réservation n'est pas en attente de paiement." };
  }
  return verifyGiftVoucher(rawCode);
}

/** Même vérification pour le supplément d'une prolongation acceptée, que le client s'apprête à régler. */
export async function checkExtensionGiftVoucher(extensionId: string, rawCode: string): Promise<GiftVoucherCheck> {
  const customer = await currentCustomer();
  const [extension] = customer
    ? await db
        .select({ status: schema.bookingExtensions.status })
        .from(schema.bookingExtensions)
        .innerJoin(schema.bookings, eq(schema.bookings.id, schema.bookingExtensions.bookingId))
        .where(and(eq(schema.bookingExtensions.id, extensionId), eq(schema.bookings.customerId, customer.id)))
    : [];
  if (extension?.status !== "pending_payment") return { error: "Cette prolongation n'est pas en attente de paiement." };
  return verifyGiftVoucher(rawCode);
}

async function verifyGiftVoucher(rawCode: string): Promise<GiftVoucherCheck> {
  const found = await lookupGiftVoucher(rawCode);
  if ("error" in found) return found;
  return { code: found.voucher.code, amountCents: found.voucher.amountCents };
}

/** Adresse du site vue par le navigateur, pour les retours de Stripe (localhost en développement). */
async function requestOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return site.url;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * « Payer » du récapitulatif : prépare la page de paiement Stripe et renvoie son adresse, ou
 * confirme directement si le bon cadeau couvre tout (`confirmed`).
 */
export async function startBookingPayment(bookingId: string, voucherCode: string | null): Promise<BookingCheckoutResult> {
  const { userId } = await auth();
  if (!userId) return { error: "Connectez-vous pour payer." };
  const customer = await findCustomerByClerkId(userId);
  if (!customer) return { error: "Compte client introuvable." };
  const result = await createBookingCheckout({ bookingId, customerId: customer.id, voucherCode, origin: await requestOrigin() });
  if ("confirmed" in result) revalidate();
  return result;
}

/** « Payer » du récapitulatif d'une prolongation acceptée : même parcours que pour une location. */
export async function startExtensionPayment(extensionId: string, voucherCode: string | null): Promise<BookingCheckoutResult> {
  const customer = await currentCustomer();
  if (!customer) return { error: "Connectez-vous pour payer." };
  const result = await createExtensionCheckout({ extensionId, customerId: customer.id, voucherCode, origin: await requestOrigin() });
  if ("confirmed" in result) revalidate();
  return result;
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
  const paymentDueAt = await paymentDeadline(booking.proposedStartDate);

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
        paymentDueAt,
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
  queueBookingEmails("accepted", booking.id);
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
  queueBookingEmails("cancelled_by_customer", booking.id);
  revalidate();
  return { ok: "Demande annulée." };
}

/** Le client a vu la modification du lieu ou de l'heure de remise (« J'ai bien noté »). */
export async function acknowledgeHandoverChange(_: ActionState, formData: FormData): Promise<ActionState> {
  const booking = await ownBooking(String(formData.get("id") ?? ""));
  if (!booking || !hasUnseenHandoverChange(booking)) return { ok: "C'est noté." };

  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({ handoverSeenAt: new Date(), previousPickupPointId: null, previousPickupTime: null })
      .where(eq(schema.bookings.id, booking.id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: booking.id,
      actor: "customer",
      fromStatus: booking.status,
      toStatus: booking.status,
      message: "Modification de la remise vue par le client",
    });
  });
  revalidate();
  return { ok: "C'est noté." };
}

/** Client connecté, ou null : les demandes de prolongation revérifient elles-mêmes que la location est la sienne. */
async function currentCustomer() {
  const { userId } = await auth();
  return userId ? ((await findCustomerByClerkId(userId)) ?? null) : null;
}

/** Le client demande à garder son set plus longtemps (bouton « Prolonger ma location »). */
export async function requestExtension(_: ActionState, formData: FormData): Promise<ActionState> {
  const customer = await currentCustomer();
  if (!customer) return { error: "Connectez-vous pour prolonger votre location." };
  try {
    const extension = await createExtensionRequest(
      String(formData.get("id") ?? ""),
      customer.id,
      String(formData.get("newEndDate") ?? ""),
    );
    queueExtensionEmails("extension_requested", extension.id);
  } catch (e) {
    if (e instanceof ExtensionError) return { error: e.message };
    throw e;
  }
  revalidate();
  return { ok: "Demande de prolongation envoyée. Nous revenons vers vous rapidement." };
}

/** Le client retire sa demande de prolongation avant la réponse des gérants. */
export async function cancelExtension(_: ActionState, formData: FormData): Promise<ActionState> {
  const customer = await currentCustomer();
  if (!customer) return { error: "Connectez-vous pour gérer votre location." };
  try {
    await cancelExtensionRequest(String(formData.get("extensionId") ?? ""), customer.id);
  } catch (e) {
    if (e instanceof ExtensionError) return { error: e.message };
    throw e;
  }
  revalidate();
  return { ok: "Demande de prolongation annulée." };
}
