import "server-only";

import { and, eq, inArray, isNotNull, lt, lte } from "drizzle-orm";
import { after } from "next/server";
import StripeSdk from "stripe";
import { todayIso } from "@/lib/dates";
import { db, schema } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { stripe } from "@/lib/stripe";

/**
 * Empreinte de caution (module 4, étape 2 sur 5 ; plan dans `docs/AVANCEMENT.md`, §3).
 *
 * Le site bloque le montant de la caution sur la carte enregistrée au paiement, sans le client
 * (`off_session`) et sans rien débiter (`capture_method: manual`). Décisions d'Alexis du 13 octobre
 * 2026 : empreinte posée automatiquement le jour de la remise, et reposée quand elle arrive à
 * expiration pendant la location.
 *
 * Une empreinte posée sans le client tient 5 jours pour une carte Visa (4 jours et 18 heures en
 * pratique) et 7 jours pour les autres réseaux : c'est pourquoi elle est posée au plus tard, le
 * jour de la remise, et renouvelée ensuite. La date exacte vient de Stripe (`capture_before`).
 *
 * Pas encore là : le client qui valide lui-même une empreinte refusée, « Redemander l'empreinte »
 * et le blocage de « Set remis » (étape 3) ; la libération et les retenues au retour (étape 4).
 */

/** Validité retenue quand Stripe n'annonce pas de date : la plus courte, celle de Visa. */
const FALLBACK_VALIDITY_MS = (4 * 24 + 18) * 3_600_000;

/** Une empreinte qui tombe avant le prochain passage quotidien (plus une marge) est renouvelée. */
const RENEW_BEFORE_MS = 30 * 3_600_000;

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

/** Motif d'un refus, en clair pour les gérants. */
function refusalReason(e: unknown) {
  if (e instanceof StripeSdk.errors.StripeCardError) {
    switch (e.decline_code ?? e.code) {
      case "authentication_required":
        return "la banque demande une validation du client";
      case "insufficient_funds":
        return "plafond ou solde insuffisant";
      case "expired_card":
        return "carte expirée";
      case "lost_card":
      case "stolen_card":
        return "carte déclarée perdue ou volée";
      default:
        return "carte refusée par la banque";
    }
  }
  if (e instanceof StripeSdk.errors.StripeInvalidRequestError && e.code === "resource_missing") {
    return "carte enregistrée introuvable chez Stripe";
  }
  return "erreur technique chez Stripe";
}

export type DepositResult = "held" | "failed" | "skipped";

/**
 * Pose l'empreinte de caution d'une réservation payée (ou la repose, pour un renouvellement).
 * `skipped` quand il n'y a rien à faire : pas de caution, réservation pas en cours, ou empreinte
 * déjà en place (hors renouvellement). Le résultat est écrit sur la réservation et dans l'historique.
 */
export async function placeDepositHold(bookingId: string, opts: { renew?: boolean } = {}): Promise<DepositResult> {
  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, bookingId),
    with: { customer: { columns: { stripeCustomerId: true } }, set: { columns: { name: true } } },
  });
  if (!booking || booking.depositCents <= 0) return "skipped";
  if (booking.status !== "confirmed" && booking.status !== "picked_up") return "skipped";
  if (booking.depositStatus === "held" && !opts.renew) return "skipped";
  if (booking.depositStatus === "released" || booking.depositStatus === "captured") return "skipped";

  const previousIntentId = booking.depositStatus === "held" ? booking.stripeDepositPaymentIntentId : null;
  const amount = formatCents(booking.depositCents);

  async function fail(reason: string) {
    // Un renouvellement refusé laisse l'empreinte en cours jusqu'à son terme : elle reste « en place ».
    if (previousIntentId) {
      await db.insert(schema.bookingEvents).values({
        bookingId,
        actor: "system",
        message: `Renouvellement de l'empreinte de caution refusé : ${reason}. L'empreinte en cours reste valable jusqu'au ${booking!.depositExpiresAt ? dateTime.format(booking!.depositExpiresAt) : "terme prévu"}`,
      });
      await db.update(schema.bookings).set({ depositError: reason }).where(eq(schema.bookings.id, bookingId));
      return "failed" as const;
    }
    // Même refus déjà noté (la tâche repasse chaque jour) : pas de nouvelle ligne d'historique.
    if (!(booking!.depositStatus === "failed" && booking!.depositError === reason)) {
      await db.insert(schema.bookingEvents).values({
        bookingId,
        actor: "system",
        message: `Empreinte de caution de ${amount} refusée : ${reason}`,
      });
    }
    await db.update(schema.bookings).set({ depositStatus: "failed", depositError: reason }).where(eq(schema.bookings.id, bookingId));
    return "failed" as const;
  }

  if (!booking.stripePaymentMethodId || !booking.customer.stripeCustomerId) {
    return fail("aucune carte enregistrée pour cette réservation");
  }

  let intent: StripeSdk.PaymentIntent;
  try {
    intent = await stripe().paymentIntents.create(
      {
        amount: booking.depositCents,
        currency: "eur",
        customer: booking.customer.stripeCustomerId,
        payment_method: booking.stripePaymentMethodId,
        capture_method: "manual",
        confirm: true,
        off_session: true,
        description: `Caution ${booking.set.name} (${booking.reference}), empreinte non débitée`,
        metadata: { kind: "deposit", booking_id: booking.id },
        expand: ["latest_charge"],
      },
      // Deux passages rapprochés (tâche planifiée et ouverture de la fiche) ne posent qu'une empreinte.
      { idempotencyKey: `deposit-${booking.id}-${opts.renew ? "renew-" : ""}${Math.floor(Date.now() / 600_000)}` },
    );
  } catch (e) {
    // Stripe laisse parfois un paiement en attente d'une validation que personne ne fera : on l'annule.
    const pending = e instanceof StripeSdk.errors.StripeCardError ? e.payment_intent?.id : null;
    if (pending) await stripe().paymentIntents.cancel(pending).catch(() => {});
    if (!(e instanceof StripeSdk.errors.StripeError)) console.error("[stripe] empreinte de caution", bookingId, e);
    return fail(refusalReason(e));
  }
  if (intent.status !== "requires_capture") {
    await stripe().paymentIntents.cancel(intent.id).catch(() => {});
    return fail("la banque demande une validation du client");
  }

  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const captureBefore = charge?.payment_method_details?.card?.capture_before;
  const now = new Date();
  const expiresAt = captureBefore ? new Date(captureBefore * 1000) : new Date(now.getTime() + FALLBACK_VALIDITY_MS);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({
        depositStatus: "held",
        stripeDepositPaymentIntentId: intent.id,
        depositHeldAt: now,
        depositExpiresAt: expiresAt,
        depositError: null,
      })
      .where(eq(schema.bookings.id, bookingId));
    await tx.insert(schema.bookingEvents).values({
      bookingId,
      actor: "system",
      message: `Empreinte de caution ${previousIntentId ? "renouvelée" : "posée"} : ${amount} bloqués sur la carte du client, sans débit, jusqu'au ${dateTime.format(expiresAt)}`,
    });
  });

  // La nouvelle empreinte est en place : l'ancienne peut être libérée.
  if (previousIntentId && previousIntentId !== intent.id) {
    await stripe()
      .paymentIntents.cancel(previousIntentId)
      .catch((e) => console.error("[stripe] ancienne empreinte non libérée", previousIntentId, e));
  }
  return "held";
}

/**
 * Pose l'empreinte si le jour de remise est arrivé et qu'elle n'a pas encore été tentée. Pour les
 * moments où l'on ne veut pas attendre la tâche du lendemain : paiement fait le jour même de la
 * remise, ouverture de la fiche par les gérants.
 */
export async function placeDepositHoldIfDue(bookingId: string): Promise<DepositResult> {
  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, bookingId),
    columns: { status: true, depositStatus: true, startDate: true },
  });
  if (!booking || booking.status !== "confirmed" || booking.depositStatus !== "none" || booking.startDate > todayIso()) {
    return "skipped";
  }
  return placeDepositHold(bookingId);
}

/** Même chose après la réponse, sans faire échouer le paiement qui vient d'être livré. */
export function queueDepositHoldIfDue(bookingId: string) {
  after(async () => {
    try {
      await placeDepositHoldIfDue(bookingId);
    } catch (e) {
      console.error("[stripe] empreinte de caution après paiement", bookingId, e);
    }
  });
}

/**
 * Passage régulier (tâche planifiée quotidienne) :
 *
 * 1. empreintes arrivées à leur terme : la banque a déjà libéré la somme, la réservation le dit ;
 * 2. empreintes à poser : réservations payées dont le jour de remise est arrivé ;
 * 3. empreintes à renouveler : set encore à remettre ou chez le client, empreinte qui expire bientôt.
 *
 * Une réservation dont l'empreinte a été refusée n'est pas retentée d'elle-même : une carte refusée
 * le matin le serait encore le lendemain, et chaque essai compte pour la banque du client. La
 * relance viendra des gérants (étape 3).
 */
export async function syncDepositHolds(now = new Date()) {
  const b = schema.bookings;
  const today = todayIso();

  const expired = await db
    .select({ id: b.id, status: b.status })
    .from(b)
    .where(and(eq(b.depositStatus, "held"), lt(b.depositExpiresAt, now)));
  for (const x of expired) {
    const stillOut = x.status === "confirmed" || x.status === "picked_up";
    await db.transaction(async (tx) => {
      await tx
        .update(b)
        .set(stillOut ? { depositStatus: "failed", depositError: "empreinte expirée" } : { depositStatus: "released" })
        .where(and(eq(b.id, x.id), eq(b.depositStatus, "held")));
      await tx.insert(schema.bookingEvents).values({
        bookingId: x.id,
        actor: "system",
        message: stillOut
          ? "Empreinte de caution expirée : la somme n'est plus bloquée sur la carte du client"
          : "Empreinte de caution arrivée à son terme : somme libérée par la banque, sans débit",
      });
    });
  }

  const toPlace = await db
    .select({ id: b.id })
    .from(b)
    .where(and(eq(b.status, "confirmed"), eq(b.depositStatus, "none"), lte(b.startDate, today)));
  const toRenew = await db
    .select({ id: b.id })
    .from(b)
    .where(
      and(
        inArray(b.status, ["confirmed", "picked_up"]),
        eq(b.depositStatus, "held"),
        isNotNull(b.depositExpiresAt),
        lt(b.depositExpiresAt, new Date(now.getTime() + RENEW_BEFORE_MS)),
      ),
    );

  let held = 0;
  let failed = 0;
  for (const x of toPlace) {
    const r = await placeDepositHold(x.id);
    if (r === "held") held++;
    if (r === "failed") failed++;
  }
  for (const x of toRenew) {
    const r = await placeDepositHold(x.id, { renew: true });
    if (r === "held") held++;
    if (r === "failed") failed++;
  }
  return { expired: expired.length, held, failed };
}
