import "server-only";

import { and, eq, gte, isNotNull, lt, lte, or, sql } from "drizzle-orm";
import { after } from "next/server";
import StripeSdk from "stripe";
import { addDays, todayIso } from "@/lib/dates";
import { db, schema } from "@/lib/db";
import { queueBookingEmails } from "@/lib/email/booking-emails";
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
 * Au retour (étape 4) : les gérants libèrent l'empreinte ou retiennent une somme ; sans geste de
 * leur part, elle est libérée d'office 48 heures après le retour. À la prolongation (étape 5) :
 * une nouvelle empreinte est posée au paiement du supplément, puis l'ancienne libérée.
 *
 * Empreinte refusée (étape 3) : e-mail au client, qui enregistre une autre carte (ou la même,
 * validée par sa banque) depuis son espace (`createDepositCardCheckout`, `lib/payments.ts`),
 * l'empreinte étant alors reposée aussitôt ; les gérants ont « Redemander l'empreinte » sur la
 * fiche, et « Set remis » reste bloqué tant qu'elle n'est pas en place (décision d'Alexis).
 *
 * Seules une carte ou Link acceptent une empreinte : les pages de paiement n'offrent qu'eux, et
 * `lib/payments.ts` ne garde que ces moyens dans `stripe_payment_method_id`.
 */

/** Validité retenue quand Stripe n'annonce pas de date : la plus courte, celle de Visa. */
const FALLBACK_VALIDITY_MS = (4 * 24 + 18) * 3_600_000;

/** Une empreinte qui tombe avant le prochain passage quotidien (plus une marge) est renouvelée. */
const RENEW_BEFORE_MS = 30 * 3_600_000;

/**
 * Réservation payée dont la remise n'a pas eu lieu : au-delà de ce nombre de jours après la date
 * prévue, la tâche du matin ne pose ni ne renouvelle plus l'empreinte (sinon elle tournerait tous
 * les cinq jours tant que personne n'annule). La fiche de gestion, elle, pose encore à l'ouverture.
 */
const PICKUP_GRACE_DAYS = 3;

/** Délai de contrôle du set après son retour, au bout duquel la caution est libérée d'office (CGL, article 6). */
export const RELEASE_AFTER_RETURN_MS = 48 * 3_600_000;

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
  // Verrou sur la ligne le temps de l'appel Stripe : la tâche du matin et l'ouverture de la fiche
  // peuvent se croiser, le second passage relit l'empreinte posée par le premier et s'arrête.
  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${schema.bookings} where ${schema.bookings.id} = ${bookingId} for update`);
    const booking = await tx.query.bookings.findFirst({
      where: eq(schema.bookings.id, bookingId),
      with: { customer: { columns: { stripeCustomerId: true } }, set: { columns: { name: true } } },
    });
    if (!booking || booking.depositCents <= 0) return { result: "skipped" as const };
    // Set rendu : on ne pose plus rien, mais une empreinte en place peut encore être renouvelée
    // pendant les 48 heures de contrôle, pour que les gérants gardent de quoi retenir une somme.
    const out = booking.status === "confirmed" || booking.status === "picked_up";
    const underReview = booking.status === "returned" && booking.depositStatus === "held" && opts.renew;
    if (!out && !underReview) return { result: "skipped" as const };
    if (booking.depositStatus === "held" && !opts.renew) return { result: "skipped" as const };
    if (booking.depositStatus === "released" || booking.depositStatus === "captured") return { result: "skipped" as const };

    const previousIntentId = booking.depositStatus === "held" ? booking.stripeDepositPaymentIntentId : null;
    const amount = formatCents(booking.depositCents);

    async function fail(reason: string) {
      // Un renouvellement refusé laisse l'empreinte en cours jusqu'à son terme : elle reste « en place ».
      if (previousIntentId) {
        await tx.insert(schema.bookingEvents).values({
          bookingId,
          actor: "system",
          message: `Renouvellement de l'empreinte de caution refusé : ${reason}. L'empreinte en cours reste valable jusqu'au ${booking!.depositExpiresAt ? dateTime.format(booking!.depositExpiresAt) : "terme prévu"}`,
        });
        await tx.update(schema.bookings).set({ depositError: reason }).where(eq(schema.bookings.id, bookingId));
        return { result: "failed" as const };
      }
      // Même refus déjà noté (la tâche repasse chaque jour) : pas de nouvelle ligne d'historique,
      // pas de nouvel e-mail au client.
      const alreadyNoted = booking!.depositStatus === "failed" && booking!.depositError === reason;
      if (!alreadyNoted) {
        await tx.insert(schema.bookingEvents).values({
          bookingId,
          actor: "system",
          message: `Empreinte de caution de ${amount} refusée : ${reason}`,
        });
      }
      await tx.update(schema.bookings).set({ depositStatus: "failed", depositError: reason }).where(eq(schema.bookings.id, bookingId));
      return { result: "failed" as const, notify: !alreadyNoted };
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
        // Même appel rejoué (coupure réseau) dans les dix minutes : Stripe rend la même empreinte.
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
    return { result: "held" as const, intentId: intent.id, previousIntentId, firstHold: !previousIntentId && out };
  });

  if (outcome.result === "failed") {
    // Le client peut lever le refus lui-même (autre carte, validation par sa banque) depuis son
    // espace : l'e-mail le lui dit, une fois par motif. Les gérants ont la pastille et la fiche.
    if (outcome.notify) queueBookingEmails("deposit_failed", bookingId);
    return "failed";
  }
  if (outcome.result !== "held") return outcome.result;
  // La nouvelle empreinte est en place : l'ancienne peut être libérée.
  if (outcome.previousIntentId && outcome.previousIntentId !== outcome.intentId) {
    await stripe()
      .paymentIntents.cancel(outcome.previousIntentId)
      .catch((e) => console.error("[stripe] ancienne empreinte non libérée", outcome.previousIntentId, e));
  }
  // Le client voit la somme bloquée sur son relevé : on le prévient à la première pose (pas à un
  // renouvellement, qui ne change rien pour lui).
  if (outcome.firstHold) queueBookingEmails("deposit_held", bookingId);
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
 * Prolongation payée (étape 5) : une nouvelle empreinte est posée, puis l'ancienne libérée, comme
 * l'annonce l'article 9 des conditions générales. Elle repart ainsi pour toute sa durée de validité
 * au début de la période ajoutée. Si la précédente avait été refusée, c'est une nouvelle tentative,
 * sur la carte du paiement de la prolongation quand il y en a une.
 */
export function queueDepositRenewal(bookingId: string) {
  after(async () => {
    try {
      const booking = await db.query.bookings.findFirst({
        where: eq(schema.bookings.id, bookingId),
        columns: { status: true, depositStatus: true },
      });
      if (!booking || booking.status !== "picked_up") return;
      if (booking.depositStatus !== "held" && booking.depositStatus !== "failed" && booking.depositStatus !== "none") return;
      await placeDepositHold(bookingId, { renew: true });
    } catch (e) {
      console.error("[stripe] empreinte de caution après prolongation", bookingId, e);
    }
  });
}

/**
 * Passage régulier (tâche planifiée quotidienne) :
 *
 * 0. empreintes à libérer : set rendu depuis plus de 48 heures, réservation annulée ;
 * 1. empreintes arrivées à leur terme : la banque a déjà libéré la somme, la réservation le dit ;
 *    si le set est encore dû, une nouvelle empreinte est tentée dans la foulée ;
 * 2. empreintes à poser : réservations payées dont le jour de remise est arrivé ;
 * 3. empreintes à renouveler : set encore à remettre ou chez le client, empreinte qui expire bientôt.
 *
 * Une réservation dont l'empreinte a été refusée n'est pas retentée d'elle-même : une carte refusée
 * le matin le serait encore le lendemain, et chaque essai compte pour la banque du client. La
 * relance viendra des gérants (étape 3). Une réservation payée dont la remise a plus de
 * `PICKUP_GRACE_DAYS` jours de retard n'est plus posée ni renouvelée : aux gérants de l'annuler
 * ou de la remettre (l'ouverture de sa fiche pose encore l'empreinte).
 */
export async function syncDepositHolds(now = new Date()) {
  const b = schema.bookings;
  const today = todayIso();

  // Set rendu depuis plus de 48 heures sans retenue, ou réservation annulée : l'empreinte est libérée.
  const toRelease = await db
    .select({ id: b.id })
    .from(b)
    .where(
      and(
        eq(b.depositStatus, "held"),
        or(
          and(eq(b.status, "returned"), lt(b.returnedAt, new Date(now.getTime() - RELEASE_AFTER_RETURN_MS))),
          eq(b.status, "cancelled"),
        ),
      ),
    );
  let released = 0;
  for (const x of toRelease) {
    try {
      if ((await releaseDepositHold(x.id, "system")) === "released") released++;
    } catch (e) {
      console.error("[stripe] libération automatique de la caution", x.id, e);
    }
  }

  // Set encore dû : chez le client, ou à remettre depuis peu (voir `PICKUP_GRACE_DAYS`).
  const pickupNotStale = addDays(today, -PICKUP_GRACE_DAYS);
  const stillDue = or(eq(b.status, "picked_up"), and(eq(b.status, "confirmed"), gte(b.startDate, pickupNotStale)));

  let held = 0;
  let failed = 0;
  const expired = await db
    .select({ id: b.id, status: b.status, startDate: b.startDate })
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
    // Set encore dû (le renouvellement a été manqué, tâche du matin sautée par exemple) : la carte
    // est connue, une nouvelle empreinte est tentée tout de suite plutôt que de laisser la caution
    // sans garantie jusqu'à ce que les gérants s'en aperçoivent.
    if (x.status === "picked_up" || (x.status === "confirmed" && x.startDate >= pickupNotStale)) {
      const r = await placeDepositHold(x.id);
      if (r === "held") held++;
      if (r === "failed") failed++;
    }
  }

  const toPlace = await db
    .select({ id: b.id })
    .from(b)
    .where(and(eq(b.status, "confirmed"), eq(b.depositStatus, "none"), lte(b.startDate, today), gte(b.startDate, pickupNotStale)));
  const toRenew = await db
    .select({ id: b.id })
    .from(b)
    .where(
      and(
        // `returned` : pendant les 48 heures de contrôle (au-delà, elle vient d'être libérée ci-dessus).
        or(stillDue, eq(b.status, "returned")),
        eq(b.depositStatus, "held"),
        isNotNull(b.depositExpiresAt),
        lt(b.depositExpiresAt, new Date(now.getTime() + RENEW_BEFORE_MS)),
      ),
    );

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
  return { released, expired: expired.length, held, failed };
}

/* -------------------------------------------------------------------------- */
/* Fin de l'empreinte : libération ou retenue (étape 4)                       */
/* -------------------------------------------------------------------------- */

export class DepositError extends Error {}

/** Empreinte en place d'une réservation, ou l'erreur à montrer aux gérants. */
async function heldDeposit(bookingId: string) {
  const booking = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, bookingId) });
  if (!booking) throw new DepositError("Réservation introuvable.");
  if (booking.depositStatus !== "held" || !booking.stripeDepositPaymentIntentId) {
    throw new DepositError("Aucune empreinte de caution n'est en place sur cette réservation.");
  }
  return { booking, intentId: booking.stripeDepositPaymentIntentId };
}

/**
 * Libère l'empreinte sans rien débiter : la somme redevient disponible sur la carte du client (le
 * délai d'affichage dépend ensuite de sa banque). Par les gérants après contrôle du set, ou d'office
 * 48 heures après le retour (`syncDepositHolds`).
 */
export async function releaseDepositHold(bookingId: string, actor: "admin" | "system"): Promise<"released" | "skipped"> {
  const booking = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, bookingId) });
  if (!booking || booking.depositStatus !== "held" || !booking.stripeDepositPaymentIntentId) return "skipped";
  try {
    await stripe().paymentIntents.cancel(booking.stripeDepositPaymentIntentId);
  } catch (e) {
    // Déjà annulée ou expirée chez Stripe : la somme n'est plus bloquée, l'état suit.
    const gone = e instanceof StripeSdk.errors.StripeInvalidRequestError && (e.code === "payment_intent_unexpected_state" || e.code === "resource_missing");
    if (!gone) throw e;
  }
  const done = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.bookings)
      .set({ depositStatus: "released", depositSettledAt: new Date(), depositError: null })
      .where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.depositStatus, "held")))
      .returning({ id: schema.bookings.id });
    if (!row) return false;
    await tx.insert(schema.bookingEvents).values({
      bookingId,
      actor,
      message:
        actor === "system"
          ? `Empreinte de caution de ${formatCents(booking.depositCents)} libérée automatiquement, sans débit`
          : `Empreinte de caution de ${formatCents(booking.depositCents)} libérée, sans débit`,
    });
    return true;
  });
  if (!done) return "skipped";
  // Seulement quand la location a eu lieu : une réservation annulée a déjà son e-mail.
  if (booking.status === "returned") queueBookingEmails("deposit_released", bookingId);
  return "released";
}

/**
 * Retient une somme sur la caution (casse, pièces perdues, retard, set rendu non démonté…) : elle
 * est débitée, le reste de l'empreinte est libéré par Stripe. Une empreinte ne se prélève qu'une
 * fois. Le motif est montré au client, comme l'exigent les conditions générales (article 6).
 */
export async function captureDeposit(bookingId: string, amountCents: number, reason: string) {
  const { booking, intentId } = await heldDeposit(bookingId);
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new DepositError("Indiquez la somme à retenir.");
  if (amountCents > booking.depositCents) {
    throw new DepositError(`La retenue ne peut pas dépasser la caution (${formatCents(booking.depositCents)}).`);
  }
  try {
    await stripe().paymentIntents.capture(intentId, { amount_to_capture: amountCents });
  } catch (e) {
    console.error("[stripe] retenue sur caution", bookingId, e);
    throw new DepositError(
      e instanceof StripeSdk.errors.StripeInvalidRequestError
        ? "L'empreinte n'est plus valable chez Stripe (expirée ou déjà traitée) : rien n'a été prélevé."
        : "Stripe n'a pas pu prélever la somme. Réessayez dans un instant.",
    );
  }
  const rest = booking.depositCents - amountCents;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({
        depositStatus: "captured",
        depositCapturedCents: amountCents,
        depositCaptureReason: reason,
        depositSettledAt: new Date(),
        depositError: null,
      })
      .where(eq(schema.bookings.id, bookingId));
    await tx.insert(schema.bookingEvents).values({
      bookingId,
      actor: "admin",
      message: `Caution : ${formatCents(amountCents)} retenus sur ${formatCents(booking.depositCents)} (${reason})${rest > 0 ? `, ${formatCents(rest)} libérés` : ""}`,
    });
  });
  queueBookingEmails("deposit_captured", bookingId);
  return { amountCents, rest };
}
