import "server-only";

import { and, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import StripeSdk, { type Stripe } from "stripe";
import { db, schema } from "@/lib/db";
import { queueBookingEmails, queueExtensionEmails } from "@/lib/email/booking-emails";
import { queueDepositHoldIfDue, queueDepositRenewal } from "@/lib/deposits";
import { ExtensionError, markExtensionPaid } from "@/lib/extensions";
import { formatCents } from "@/lib/format";
import { queueGiftVoucherEmail } from "@/lib/email/gift-voucher-emails";
import { formatBatchNumber, generateGiftVoucherCode, giftVoucherDisplayStatus, giftVoucherExpiresAt } from "@/lib/gift-vouchers";
import { giftVoucherAmounts } from "@/lib/site";
import { stripe } from "@/lib/stripe";

/**
 * Paiement en ligne (module 4), par Stripe Checkout hébergé : le client est envoyé sur la page de
 * paiement Stripe, puis revient sur le site. Trois achats passent par ici :
 *
 * - le loyer d'une réservation acceptée (`pending_payment` → `confirmed`), bon cadeau déduit ;
 * - le supplément d'une prolongation acceptée (date de retour repoussée), bon cadeau déduit ;
 * - un bon cadeau (création d'un bon `origin = "purchase"`, code envoyé par e-mail).
 *
 * La livraison (`fulfillCheckoutSession`) est faite par le webhook Stripe (`/api/stripe/webhook`),
 * et aussi par la page de retour, pour que le client voie tout de suite le résultat même si le
 * webhook tarde (ou n'est pas branché en local). Elle est idempotente : une réservation ne se
 * confirme qu'une fois (`where status = 'pending_payment'`), un bon ne se crée qu'une fois par
 * session (index unique sur `stripe_checkout_session_id`).
 *
 * La caution (empreinte bancaire à la remise) n'est pas gérée ici : voir `docs/AVANCEMENT.md`.
 */

/** Durée de vie d'une page de paiement ; 30 minutes est le minimum Stripe. */
const CHECKOUT_LIFETIME_SECONDS = 30 * 60;

/** Clé de suivi des parcours dans le Dashboard Stripe (suffixe aléatoire figé, demandé par Stripe). */
const INTEGRATION_IDS = {
  booking: "set-et-brique-location-QKZPMWTR",
  gift_voucher: "set-et-brique-bon-cadeau-HJVXNDLB",
  extension: "set-et-brique-prolongation-TBWFRKSC",
};

type CheckoutMetadata = {
  kind: "booking" | "gift_voucher" | "extension";
  booking_id?: string;
  extension_id?: string;
  voucher_code?: string;
  amount_cents?: string;
  clerk_user_id?: string;
};

function expiresAt() {
  return Math.floor(Date.now() / 1000) + CHECKOUT_LIFETIME_SECONDS;
}

/* -------------------------------------------------------------------------- */
/* Bons cadeaux : vérification d'un code                                      */
/* -------------------------------------------------------------------------- */

export type VoucherLookup = { error: string } | { voucher: typeof schema.giftVouchers.$inferSelect };

/** Bon cadeau utilisable pour un code saisi, ou le message d'erreur à montrer au client. */
export async function lookupGiftVoucher(rawCode: string): Promise<VoucherLookup> {
  const code = rawCode.replace(/\s+/g, "").toUpperCase();
  if (!code) return { error: "Saisissez le code de votre bon cadeau." };
  const voucher = await db.query.giftVouchers.findFirst({ where: eq(schema.giftVouchers.code, code) });
  if (!voucher) return { error: "Ce code n'est pas reconnu. Vérifiez sa saisie." };
  switch (giftVoucherDisplayStatus(voucher)) {
    case "used":
      return { error: "Ce bon cadeau a déjà été utilisé." };
    case "expired":
      return { error: "Ce bon cadeau a expiré." };
    case "cancelled":
      return { error: "Ce bon cadeau n'est plus valable." };
    default:
      return { voucher };
  }
}

/* -------------------------------------------------------------------------- */
/* Carte enregistrée pour la caution                                          */
/* -------------------------------------------------------------------------- */

/**
 * Client Stripe du client, créé au besoin. `fresh` en recrée un quand celui gardé en base est
 * inconnu de Stripe (autre compte, ou passage des clés de test aux clés réelles).
 */
async function stripeCustomerFor(customerId: string, fresh = false) {
  const customer = await db.query.customers.findFirst({
    where: eq(schema.customers.id, customerId),
    columns: { id: true, email: true, firstName: true, lastName: true, phone: true, stripeCustomerId: true },
  });
  if (!customer) throw new Error(`Client ${customerId} introuvable`);
  if (customer.stripeCustomerId && !fresh) return customer.stripeCustomerId;
  const created = await stripe().customers.create({
    email: customer.email,
    name: [customer.firstName, customer.lastName].filter(Boolean).join(" ") || undefined,
    phone: customer.phone ?? undefined,
    metadata: { customer_id: customer.id },
  });
  await db.update(schema.customers).set({ stripeCustomerId: created.id }).where(eq(schema.customers.id, customer.id));
  return created.id;
}

/**
 * Page de paiement d'une location ou d'une prolongation. En plus d'encaisser, elle enregistre la
 * carte chez Stripe (`setup_future_usage`), rattachée au client Stripe : c'est sur elle que le site
 * posera l'empreinte de caution le jour de la remise, sans redemander la carte. La page le dit au
 * client juste sous le bouton de paiement.
 */
type RentalSessionParams = Omit<
  Stripe.Checkout.SessionCreateParams,
  "mode" | "locale" | "customer" | "customer_email" | "custom_text" | "expires_at" | "currency"
>;

const guaranteeText = (depositCents: number) =>
  `la garantie de votre location (${formatCents(depositCents)}) : une empreinte bancaire, jamais débitée sauf casse, perte ou retard (conditions générales, article 6).`;

/** Ouvre une page Stripe au nom du client Stripe du client, recréé une fois si Stripe ne le connaît pas. */
async function createCustomerSession(customerId: string, build: (customer: string) => Stripe.Checkout.SessionCreateParams) {
  try {
    return await stripe().checkout.sessions.create(build(await stripeCustomerFor(customerId)));
  } catch (e) {
    const unknownCustomer = e instanceof StripeSdk.errors.StripeInvalidRequestError && e.code === "resource_missing" && e.param === "customer";
    if (!unknownCustomer) throw e;
    return stripe().checkout.sessions.create(build(await stripeCustomerFor(customerId, true)));
  }
}

function createRentalCheckoutSession(customerId: string, depositCents: number, params: RentalSessionParams) {
  return createCustomerSession(customerId, (customer) => ({
    ...params,
    mode: "payment",
    locale: "fr",
    customer,
    payment_intent_data: { ...params.payment_intent_data, setup_future_usage: "off_session" },
    custom_text: { submit: { message: `Votre carte est enregistrée par Stripe pour ${guaranteeText(depositCents)}` } },
    expires_at: expiresAt(),
  }));
}

/**
 * Même page sans rien encaisser (mode `setup`) : un bon cadeau couvre tout le prix, mais la caution
 * reste due, et l'empreinte ne peut être posée que sur une carte enregistrée. Le client saisit donc
 * sa carte avant que sa réservation soit confirmée (décision d'Alexis, 13 octobre 2026). Le bon est
 * consommé à la livraison de la session, pas avant.
 */
function createCardOnlyCheckoutSession(
  customerId: string,
  depositCents: number,
  params: Omit<RentalSessionParams, "line_items" | "payment_intent_data"> & { description: string },
) {
  const { description, ...rest } = params;
  return createCustomerSession(customerId, (customer) => ({
    ...rest,
    mode: "setup",
    currency: "eur",
    locale: "fr",
    customer,
    setup_intent_data: { description, metadata: rest.metadata ?? undefined },
    custom_text: {
      submit: {
        message: `Rien n'est débité : votre bon cadeau règle la location. Votre carte est seulement enregistrée par Stripe pour ${guaranteeText(depositCents)}`,
      },
    },
    expires_at: expiresAt(),
  }));
}

/** Carte utilisée pour un paiement Stripe, à garder sur la réservation. */
async function paymentMethodOf(paymentIntentId: string | null) {
  if (!paymentIntentId) return null;
  try {
    const intent = await stripe().paymentIntents.retrieve(paymentIntentId);
    return typeof intent.payment_method === "string" ? intent.payment_method : (intent.payment_method?.id ?? null);
  } catch (e) {
    console.error("[stripe] carte du paiement illisible", paymentIntentId, e);
    return null;
  }
}

/** Carte enregistrée par une page Stripe sans paiement (mode `setup`). */
async function savedCardOf(session: Stripe.Checkout.Session) {
  const id = typeof session.setup_intent === "string" ? session.setup_intent : (session.setup_intent?.id ?? null);
  if (!id) return null;
  try {
    const intent = await stripe().setupIntents.retrieve(id);
    return typeof intent.payment_method === "string" ? intent.payment_method : (intent.payment_method?.id ?? null);
  } catch (e) {
    console.error("[stripe] carte enregistrée illisible", id, e);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Réservation : lancement du paiement                                        */
/* -------------------------------------------------------------------------- */

export type BookingCheckoutResult = { error: string } | { url: string } | { confirmed: true };

/**
 * Prépare le paiement du loyer d'une réservation acceptée. Si un bon cadeau couvre tout, la page
 * Stripe n'encaisse rien et enregistre seulement la carte pour la caution (`createCardOnlyCheckoutSession`) ;
 * la réservation est confirmée au retour, comme après un paiement.
 * `origin` est l'adresse du site telle que le navigateur la voit (localhost en développement).
 */
export async function createBookingCheckout(opts: {
  bookingId: string;
  customerId: string;
  voucherCode: string | null;
  origin: string;
}): Promise<BookingCheckoutResult> {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(schema.bookings.id, opts.bookingId), eq(schema.bookings.customerId, opts.customerId)),
    with: { set: { columns: { name: true } } },
  });
  if (!booking || booking.status !== "pending_payment") {
    return { error: "Cette réservation n'est pas en attente de paiement." };
  }
  if (booking.paymentDueAt && booking.paymentDueAt.getTime() < Date.now()) {
    return { error: "Le délai de paiement est dépassé. Contactez-nous pour prolonger votre réservation." };
  }

  const total = booking.rentalCents + (booking.disassemblyCents ?? 0);
  let voucherCode: string | null = null;
  let deducted = 0;
  if (opts.voucherCode) {
    const found = await lookupGiftVoucher(opts.voucherCode);
    if ("error" in found) return { error: found.error };
    voucherCode = found.voucher.code;
    deducted = Math.min(found.voucher.amountCents, total);
  }
  const net = total - deducted;

  const rentalName = `Location ${booking.set.name}, ${booking.days} jour${booking.days > 1 ? "s" : ""}`;
  const successUrl = `${opts.origin}/compte?paye=${encodeURIComponent(booking.reference)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${opts.origin}/compte?payer=${encodeURIComponent(booking.reference)}`;

  if (net === 0 && voucherCode) {
    // Rien à encaisser, mais la carte est demandée pour la caution : la réservation est confirmée
    // (et le bon consommé) quand le client revient de la page Stripe.
    const session = await createCardOnlyCheckoutSession(booking.customerId, booking.depositCents, {
      client_reference_id: booking.id,
      metadata: { kind: "booking", booking_id: booking.id, voucher_code: voucherCode } satisfies CheckoutMetadata,
      description: `${rentalName} (${booking.reference}), réglée par bon cadeau : carte pour la caution`,
      success_url: successUrl,
      cancel_url: cancelUrl,
      integration_identifier: INTEGRATION_IDS.booking,
    });
    if (!session.url) return { error: "Stripe n'a pas renvoyé de page. Réessayez." };
    await db.update(schema.bookings).set({ stripeCheckoutSessionId: session.id }).where(eq(schema.bookings.id, booking.id));
    return { url: session.url };
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = voucherCode
    ? [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: net,
            product_data: {
              name: rentalName,
              description: `Réservation ${booking.reference}${booking.disassemblyCents != null ? ", option set rendu monté" : ""}, bon cadeau ${voucherCode} déduit`,
            },
          },
        },
      ]
    : [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: booking.rentalCents,
            product_data: { name: rentalName, description: `Réservation ${booking.reference}` },
          },
        },
        ...(booking.disassemblyCents != null
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "eur",
                  unit_amount: booking.disassemblyCents,
                  product_data: { name: "Option set rendu monté" },
                },
              },
            ]
          : []),
      ];

  const metadata: CheckoutMetadata = { kind: "booking", booking_id: booking.id };
  if (voucherCode) metadata.voucher_code = voucherCode;

  const session = await createRentalCheckoutSession(booking.customerId, booking.depositCents, {
    client_reference_id: booking.id,
    line_items: lineItems,
    metadata,
    payment_intent_data: { description: `${rentalName} (${booking.reference})`, metadata },
    success_url: successUrl,
    cancel_url: cancelUrl,
    integration_identifier: INTEGRATION_IDS.booking,
  });
  if (!session.url) return { error: "Stripe n'a pas renvoyé de page de paiement. Réessayez." };

  // Dernière session ouverte, pour retrouver la réservation depuis Stripe et l'afficher aux gérants.
  await db.update(schema.bookings).set({ stripeCheckoutSessionId: session.id }).where(eq(schema.bookings.id, booking.id));
  return { url: session.url };
}

/**
 * Passe une réservation en `confirmed` après un paiement, en consommant le bon cadeau annoncé.
 * `skipped` si elle n'est plus en attente de paiement (déjà confirmée, annulée entre-temps…) :
 * c'est ce qui rend la livraison rejouable sans risque.
 */
export async function confirmBookingPayment(opts: {
  bookingId: string;
  voucherCode: string | null;
  stripe?: { sessionId: string; paymentIntentId: string | null; paymentMethodId?: string | null };
  /** Carte enregistrée sans paiement, quand un bon cadeau a tout réglé. */
  savedCardId?: string | null;
}): Promise<"confirmed" | "skipped"> {
  const now = new Date();
  const cardId = opts.stripe?.paymentMethodId ?? opts.savedCardId ?? null;
  const done = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.bookings)
      .set({
        status: "confirmed",
        paymentDueAt: null,
        reviewedAt: now,
        ...(opts.stripe
          ? { stripeCheckoutSessionId: opts.stripe.sessionId, stripePaymentIntentId: opts.stripe.paymentIntentId }
          : {}),
        ...(cardId ? { stripePaymentMethodId: cardId } : {}),
      })
      .where(and(eq(schema.bookings.id, opts.bookingId), eq(schema.bookings.status, "pending_payment")))
      .returning({ id: schema.bookings.id });
    if (!row) return false;

    let message = opts.stripe ? "Paiement en ligne reçu (carte bancaire, Stripe)" : "Réservation réglée par bon cadeau";
    if (opts.voucherCode) {
      const [used] = await tx
        .update(schema.giftVouchers)
        .set({ status: "used", usedAt: now })
        .where(
          and(
            eq(schema.giftVouchers.code, opts.voucherCode),
            eq(schema.giftVouchers.status, "valid"),
            gt(schema.giftVouchers.expiresAt, now),
          ),
        )
        .returning({ code: schema.giftVouchers.code });
      message += used
        ? `. Bon cadeau ${opts.voucherCode} utilisé`
        : `. Bon cadeau ${opts.voucherCode} annoncé au paiement mais plus valable à ce moment-là : à vérifier`;
    }
    await tx.insert(schema.bookingEvents).values({
      bookingId: opts.bookingId,
      actor: opts.stripe ? "system" : "customer",
      fromStatus: "pending_payment",
      toStatus: "confirmed",
      message,
    });
    return true;
  });
  if (!done) return "skipped";
  queueBookingEmails("paid_online", opts.bookingId);
  // Payée le jour même de la remise : l'empreinte de caution n'attend pas la tâche du lendemain.
  queueDepositHoldIfDue(opts.bookingId);
  return "confirmed";
}

/* -------------------------------------------------------------------------- */
/* Prolongation : paiement du supplément                                      */
/* -------------------------------------------------------------------------- */

/**
 * Prépare le paiement du supplément d'une prolongation acceptée, sur le modèle du loyer : page de
 * paiement Stripe, ou validation immédiate si un bon cadeau couvre tout. La caution ne change pas.
 */
export async function createExtensionCheckout(opts: {
  extensionId: string;
  customerId: string;
  voucherCode: string | null;
  origin: string;
}): Promise<BookingCheckoutResult> {
  const extension = await db.query.bookingExtensions.findFirst({ where: eq(schema.bookingExtensions.id, opts.extensionId) });
  const booking = extension
    ? await db.query.bookings.findFirst({
        where: and(eq(schema.bookings.id, extension.bookingId), eq(schema.bookings.customerId, opts.customerId)),
        with: { set: { columns: { name: true } } },
      })
    : null;
  if (!extension || !booking || extension.status !== "pending_payment") {
    return { error: "Cette prolongation n'est pas en attente de paiement." };
  }
  if (extension.paymentDueAt && extension.paymentDueAt.getTime() < Date.now()) {
    return { error: "Le délai de paiement est dépassé : le retour reste prévu à la date d'origine. Contactez-nous." };
  }

  const total = extension.extraRentalCents;
  let voucherCode: string | null = null;
  let deducted = 0;
  if (opts.voucherCode) {
    const found = await lookupGiftVoucher(opts.voucherCode);
    if ("error" in found) return { error: found.error };
    voucherCode = found.voucher.code;
    deducted = Math.min(found.voucher.amountCents, total);
  }
  const net = total - deducted;

  const name = `Prolongation ${booking.set.name}, ${extension.extraDays} jour${extension.extraDays > 1 ? "s" : ""} de plus`;
  const metadata: CheckoutMetadata = { kind: "extension", extension_id: extension.id, booking_id: booking.id };
  if (voucherCode) metadata.voucher_code = voucherCode;
  const successUrl = `${opts.origin}/compte?prolongation=${encodeURIComponent(booking.reference)}&session_id={CHECKOUT_SESSION_ID}`;

  if (net === 0 && voucherCode) {
    // Bon cadeau qui couvre tout : appliquée tout de suite si une carte est déjà enregistrée pour la
    // caution (cas courant, celle de la location) ; sinon la carte est demandée d'abord, sans débit.
    if (booking.stripePaymentMethodId) {
      const result = await confirmExtensionPayment({ extensionId: extension.id, voucherCode });
      if (result === "skipped") return { error: "Cette prolongation n'est plus en attente de paiement." };
      return { confirmed: true };
    }
    const session = await createCardOnlyCheckoutSession(booking.customerId, booking.depositCents, {
      client_reference_id: extension.id,
      metadata,
      description: `${name} (${booking.reference}), réglée par bon cadeau : carte pour la caution`,
      success_url: successUrl,
      cancel_url: `${opts.origin}/compte`,
      integration_identifier: INTEGRATION_IDS.extension,
    });
    if (!session.url) return { error: "Stripe n'a pas renvoyé de page. Réessayez." };
    await db
      .update(schema.bookingExtensions)
      .set({ stripeCheckoutSessionId: session.id })
      .where(eq(schema.bookingExtensions.id, extension.id));
    return { url: session.url };
  }

  const session = await createRentalCheckoutSession(booking.customerId, booking.depositCents, {
    client_reference_id: extension.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: net,
          product_data: {
            name,
            description: `Réservation ${booking.reference}${voucherCode ? `, bon cadeau ${voucherCode} déduit` : ""}`,
          },
        },
      },
    ],
    metadata,
    payment_intent_data: { description: `${name} (${booking.reference})`, metadata },
    success_url: successUrl,
    cancel_url: `${opts.origin}/compte`,
    integration_identifier: INTEGRATION_IDS.extension,
  });
  if (!session.url) return { error: "Stripe n'a pas renvoyé de page de paiement. Réessayez." };

  await db
    .update(schema.bookingExtensions)
    .set({ stripeCheckoutSessionId: session.id })
    .where(eq(schema.bookingExtensions.id, extension.id));
  return { url: session.url };
}

/**
 * Applique une prolongation payée par le client (date de retour repoussée, bon cadeau consommé).
 * `skipped` si elle n'est plus en attente de paiement : déjà payée (webhook et page de retour se
 * suivent), ou expirée entre-temps. Dans ce dernier cas, un paiement Stripe est quand même encaissé :
 * l'historique de la réservation le signale une fois aux gérants, qui remboursent ou régularisent.
 */
export async function confirmExtensionPayment(opts: {
  extensionId: string;
  voucherCode: string | null;
  stripe?: { sessionId: string; paymentIntentId: string | null };
}): Promise<"confirmed" | "skipped"> {
  let bookingId: string;
  try {
    ({ bookingId } = await markExtensionPaid(
      opts.extensionId,
      opts.stripe ? "carte bancaire, paiement en ligne Stripe" : "bon cadeau",
      { voucherCode: opts.voucherCode, stripe: opts.stripe },
    ));
  } catch (e) {
    if (!(e instanceof ExtensionError)) throw e;
    const paymentIntentId = opts.stripe?.paymentIntentId;
    if (paymentIntentId) {
      // Le paiement Stripe sert de marqueur : l'alerte n'est écrite qu'au premier passage.
      const [orphan] = await db
        .update(schema.bookingExtensions)
        .set({ stripeCheckoutSessionId: opts.stripe!.sessionId, stripePaymentIntentId: paymentIntentId })
        .where(
          and(
            eq(schema.bookingExtensions.id, opts.extensionId),
            ne(schema.bookingExtensions.status, "paid"),
            or(isNull(schema.bookingExtensions.stripePaymentIntentId), ne(schema.bookingExtensions.stripePaymentIntentId, paymentIntentId)),
          ),
        )
        .returning({ bookingId: schema.bookingExtensions.bookingId });
      if (orphan) {
        console.error("[stripe] prolongation payée mais non applicable", opts.extensionId, e.message);
        await db.insert(schema.bookingEvents).values({
          bookingId: orphan.bookingId,
          actor: "system",
          message: `Paiement en ligne reçu pour une prolongation qui n'a pas pu être appliquée (${e.message}) : à rembourser dans Stripe ou à régulariser avec le client`,
        });
      }
    }
    return "skipped";
  }
  queueExtensionEmails("extension_paid_online", opts.extensionId);
  // Nouvelle empreinte de caution pour la période ajoutée, puis libération de l'ancienne (après la
  // réponse : la carte de ce paiement a alors été rangée sur la réservation).
  queueDepositRenewal(bookingId);
  return "confirmed";
}

/** Paiement en ligne refusé après coup (moyens à notification différée) : trace dans l'historique, rien d'autre. */
export async function recordBookingPaymentFailure(session: Stripe.Checkout.Session) {
  const meta = (session.metadata ?? {}) as Partial<CheckoutMetadata>;
  if (meta.kind === "extension" && meta.booking_id) {
    await db.insert(schema.bookingEvents).values({
      bookingId: meta.booking_id,
      actor: "system",
      message: "Paiement en ligne de la prolongation refusé par la banque du client",
    });
    return;
  }
  if (meta.kind !== "booking" || !meta.booking_id) return;
  const booking = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, meta.booking_id), columns: { status: true } });
  if (!booking) return;
  await db.insert(schema.bookingEvents).values({
    bookingId: meta.booking_id,
    actor: "system",
    fromStatus: booking.status,
    toStatus: booking.status,
    message: "Paiement en ligne refusé par la banque du client",
  });
}

/* -------------------------------------------------------------------------- */
/* Bons cadeaux : achat                                                       */
/* -------------------------------------------------------------------------- */

export type GiftVoucherCheckoutResult = { error: string } | { url: string };

/** Prépare l'achat d'un bon cadeau d'un des montants proposés (`giftVoucherAmounts`, en euros). */
export async function createGiftVoucherCheckout(opts: {
  amountEuros: number;
  email: string;
  clerkUserId: string;
  origin: string;
}): Promise<GiftVoucherCheckoutResult> {
  if (!giftVoucherAmounts.includes(opts.amountEuros)) return { error: "Ce montant n'est pas proposé." };
  const amountCents = opts.amountEuros * 100;
  const metadata: CheckoutMetadata = { kind: "gift_voucher", amount_cents: String(amountCents), clerk_user_id: opts.clerkUserId };

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    locale: "fr",
    customer_email: opts.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name: `Bon cadeau Set et Brique de ${opts.amountEuros} €`,
            description: "Valable un an sur tout le catalogue, code envoyé par e-mail après le paiement",
          },
        },
      },
    ],
    metadata,
    payment_intent_data: { description: `Bon cadeau ${opts.amountEuros} €`, metadata },
    success_url: `${opts.origin}/bons-cadeaux/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/bons-cadeaux`,
    expires_at: expiresAt(),
    integration_identifier: INTEGRATION_IDS.gift_voucher,
  });
  if (!session.url) return { error: "Stripe n'a pas renvoyé de page de paiement. Réessayez." };
  return { url: session.url };
}

export type PurchasedVoucher = Pick<typeof schema.giftVouchers.$inferSelect, "id" | "code" | "amountCents" | "expiresAt" | "purchaserEmail">;

const purchasedColumns = { id: true, code: true, amountCents: true, expiresAt: true, purchaserEmail: true } as const;

/** Bon déjà créé pour cette session, s'il existe. */
async function findPurchasedVoucher(sessionId: string) {
  return db.query.giftVouchers.findFirst({ where: eq(schema.giftVouchers.stripeCheckoutSessionId, sessionId), columns: purchasedColumns });
}

/**
 * Crée le bon acheté, une seule fois par session. Sur conflit (webhook et page de retour en même
 * temps), le bon déjà créé est renvoyé ; sur collision de code, un autre code est tiré.
 */
async function createPurchasedVoucher(
  session: Stripe.Checkout.Session,
  amountCents: number,
  email: string | null,
  clerkUserId: string | null,
): Promise<PurchasedVoucher> {
  const existing = await findPurchasedVoucher(session.id);
  if (existing) return existing;

  for (let attempt = 0; ; attempt++) {
    try {
      const created = await db.transaction(async (tx) => {
        const [{ n }] = (await tx.execute(sql`select nextval('gift_voucher_batch_seq') as n`)).rows as { n: string }[];
        const [voucher] = await tx
          .insert(schema.giftVouchers)
          .values({
            code: generateGiftVoucherCode(),
            amountCents,
            origin: "purchase",
            batchNumber: formatBatchNumber(Number(n)),
            note: "Achat en ligne",
            expiresAt: giftVoucherExpiresAt(),
            stripeCheckoutSessionId: session.id,
            purchaserEmail: email,
            purchaserClerkUserId: clerkUserId,
          })
          .returning({
            id: schema.giftVouchers.id,
            code: schema.giftVouchers.code,
            amountCents: schema.giftVouchers.amountCents,
            expiresAt: schema.giftVouchers.expiresAt,
            purchaserEmail: schema.giftVouchers.purchaserEmail,
          });
        return voucher;
      });
      queueGiftVoucherEmail(created.id);
      return created;
    } catch (err) {
      const e = err as { code?: string; constraint?: string };
      if (e.code !== "23505") throw err;
      if (e.constraint === "gift_vouchers_stripe_session_idx") {
        const again = await findPurchasedVoucher(session.id);
        if (again) return again;
      }
      if (attempt >= 4) throw err;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Livraison                                                                  */
/* -------------------------------------------------------------------------- */

export type FulfillmentResult =
  | { status: "unpaid" }
  | { status: "unknown" }
  | { status: "booking"; bookingId: string; outcome: "confirmed" | "skipped" }
  | { status: "extension"; extensionId: string; outcome: "confirmed" | "skipped" }
  | { status: "gift_voucher"; voucher: PurchasedVoucher };

export async function retrieveCheckoutSession(sessionId: string) {
  return stripe().checkout.sessions.retrieve(sessionId);
}

/**
 * Retour d'une page Stripe sans paiement : le bon cadeau règle tout, la carte vient d'être
 * enregistrée pour la caution. La carte est gardée dans tous les cas ; le bon est revérifié, car il
 * a pu être utilisé ailleurs pendant que le client était sur la page. S'il ne couvre plus le prix,
 * rien n'est confirmé et l'historique le dit : le client repasse par le paiement.
 */
async function fulfillCardOnlySession(session: Stripe.Checkout.Session, meta: Partial<CheckoutMetadata>): Promise<FulfillmentResult> {
  const voucherCode = meta.voucher_code;
  if (!meta.booking_id || !voucherCode) {
    console.error("[stripe] session sans paiement sans métadonnées reconnues", session.id, meta);
    return { status: "unknown" };
  }
  const bookingId = meta.booking_id;
  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, bookingId),
    columns: { status: true, rentalCents: true, disassemblyCents: true },
  });
  const extension =
    meta.kind === "extension" && meta.extension_id
      ? await db.query.bookingExtensions.findFirst({ where: eq(schema.bookingExtensions.id, meta.extension_id) })
      : null;
  const result = (outcome: "confirmed" | "skipped"): FulfillmentResult =>
    extension ? { status: "extension", extensionId: extension.id, outcome } : { status: "booking", bookingId, outcome };

  // Déjà livrée (webhook et page de retour se suivent), annulée ou expirée entre-temps.
  const stillDue = extension ? extension.status === "pending_payment" : booking?.status === "pending_payment";
  if (!booking || !stillDue) return result("skipped");

  const cardId = await savedCardOf(session);
  if (cardId) await db.update(schema.bookings).set({ stripePaymentMethodId: cardId }).where(eq(schema.bookings.id, bookingId));

  const total = extension ? extension.extraRentalCents : booking.rentalCents + (booking.disassemblyCents ?? 0);
  const found = await lookupGiftVoucher(voucherCode);
  if ("error" in found || found.voucher.amountCents < total) {
    await db.insert(schema.bookingEvents).values({
      bookingId,
      actor: "system",
      message: `Carte enregistrée pour la caution, mais le bon cadeau ${voucherCode} n'est plus valable : ${extension ? "prolongation" : "réservation"} toujours en attente de paiement`,
    });
    return result("skipped");
  }

  if (extension) return result(await confirmExtensionPayment({ extensionId: extension.id, voucherCode }));
  return result(await confirmBookingPayment({ bookingId, voucherCode, savedCardId: cardId }));
}

/**
 * Livre ce qu'une session payée a acheté. Appelée par le webhook (`checkout.session.completed`,
 * `checkout.session.async_payment_succeeded`) et par les pages de retour. Ne fait rien tant que
 * `payment_status` est `unpaid` (moyen de paiement à notification différée : l'événement
 * `async_payment_succeeded` reviendra).
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<FulfillmentResult> {
  // Une page sans paiement (mode `setup`) n'est jamais « unpaid » : sans ce contrôle, une session
  // encore ouverte passerait pour livrée.
  if (session.status !== "complete" || session.payment_status === "unpaid") return { status: "unpaid" };
  const meta = (session.metadata ?? {}) as Partial<CheckoutMetadata>;

  if (session.mode === "setup") return fulfillCardOnlySession(session, meta);

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

  // Avant la location : une prolongation porte aussi `booking_id`, pour retrouver sa réservation.
  if (meta.kind === "extension" && meta.extension_id) {
    const outcome = await confirmExtensionPayment({
      extensionId: meta.extension_id,
      voucherCode: meta.voucher_code ?? null,
      stripe: { sessionId: session.id, paymentIntentId },
    });
    // Carte de ce paiement gardée pour la caution : la plus récente, et la seule si le loyer avait
    // été réglé par bon cadeau ou hors ligne.
    if (outcome === "confirmed" && meta.booking_id) {
      const paymentMethodId = await paymentMethodOf(paymentIntentId);
      if (paymentMethodId) {
        await db.update(schema.bookings).set({ stripePaymentMethodId: paymentMethodId }).where(eq(schema.bookings.id, meta.booking_id));
      }
    }
    return { status: "extension", extensionId: meta.extension_id, outcome };
  }

  if (meta.kind === "booking" && meta.booking_id) {
    const outcome = await confirmBookingPayment({
      bookingId: meta.booking_id,
      voucherCode: meta.voucher_code ?? null,
      stripe: { sessionId: session.id, paymentIntentId, paymentMethodId: await paymentMethodOf(paymentIntentId) },
    });
    return { status: "booking", bookingId: meta.booking_id, outcome };
  }

  if (meta.kind === "gift_voucher" && meta.amount_cents) {
    const amountCents = Number(meta.amount_cents);
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    const voucher = await createPurchasedVoucher(session, amountCents, email, meta.clerk_user_id ?? null);
    return { status: "gift_voucher", voucher };
  }

  console.error("[stripe] session sans métadonnées reconnues", session.id, meta);
  return { status: "unknown" };
}
