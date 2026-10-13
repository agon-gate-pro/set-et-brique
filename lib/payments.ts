import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db, schema } from "@/lib/db";
import { queueBookingEmails } from "@/lib/email/booking-emails";
import { queueGiftVoucherEmail } from "@/lib/email/gift-voucher-emails";
import { formatBatchNumber, generateGiftVoucherCode, giftVoucherDisplayStatus, giftVoucherExpiresAt } from "@/lib/gift-vouchers";
import { giftVoucherAmounts } from "@/lib/site";
import { stripe } from "@/lib/stripe";

/**
 * Paiement en ligne (module 4), par Stripe Checkout hébergé : le client est envoyé sur la page de
 * paiement Stripe, puis revient sur le site. Deux achats passent par ici :
 *
 * - le loyer d'une réservation acceptée (`pending_payment` → `confirmed`), bon cadeau déduit ;
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
const INTEGRATION_IDS = { booking: "set-et-brique-location-QKZPMWTR", gift_voucher: "set-et-brique-bon-cadeau-HJVXNDLB" };

type CheckoutMetadata = {
  kind: "booking" | "gift_voucher";
  booking_id?: string;
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
/* Réservation : lancement du paiement                                        */
/* -------------------------------------------------------------------------- */

export type BookingCheckoutResult = { error: string } | { url: string } | { confirmed: true };

/**
 * Prépare le paiement du loyer d'une réservation acceptée. Si un bon cadeau couvre tout, la
 * réservation est confirmée sur-le-champ sans passer par Stripe (Stripe refuse un paiement à 0 €).
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
    with: { set: { columns: { name: true } }, customer: { columns: { email: true } } },
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

  if (net === 0 && voucherCode) {
    const result = await confirmBookingPayment({ bookingId: booking.id, voucherCode });
    if (result === "skipped") return { error: "Cette réservation n'est plus en attente de paiement." };
    return { confirmed: true };
  }

  const rentalName = `Location ${booking.set.name}, ${booking.days} jour${booking.days > 1 ? "s" : ""}`;
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

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    locale: "fr",
    customer_email: booking.customer.email,
    client_reference_id: booking.id,
    line_items: lineItems,
    metadata,
    payment_intent_data: { description: `${rentalName} (${booking.reference})`, metadata },
    success_url: `${opts.origin}/compte?paye=${encodeURIComponent(booking.reference)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/compte?payer=${encodeURIComponent(booking.reference)}`,
    expires_at: expiresAt(),
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
  stripe?: { sessionId: string; paymentIntentId: string | null };
}): Promise<"confirmed" | "skipped"> {
  const now = new Date();
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
  return "confirmed";
}

/** Paiement en ligne refusé après coup (moyens à notification différée) : trace dans l'historique, rien d'autre. */
export async function recordBookingPaymentFailure(session: Stripe.Checkout.Session) {
  const meta = (session.metadata ?? {}) as Partial<CheckoutMetadata>;
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
async function createPurchasedVoucher(session: Stripe.Checkout.Session, amountCents: number, email: string | null): Promise<PurchasedVoucher> {
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
  | { status: "gift_voucher"; voucher: PurchasedVoucher };

export async function retrieveCheckoutSession(sessionId: string) {
  return stripe().checkout.sessions.retrieve(sessionId);
}

/**
 * Livre ce qu'une session payée a acheté. Appelée par le webhook (`checkout.session.completed`,
 * `checkout.session.async_payment_succeeded`) et par les pages de retour. Ne fait rien tant que
 * `payment_status` est `unpaid` (moyen de paiement à notification différée : l'événement
 * `async_payment_succeeded` reviendra).
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<FulfillmentResult> {
  if (session.payment_status === "unpaid") return { status: "unpaid" };
  const meta = (session.metadata ?? {}) as Partial<CheckoutMetadata>;

  if (meta.kind === "booking" && meta.booking_id) {
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
    const outcome = await confirmBookingPayment({
      bookingId: meta.booking_id,
      voucherCode: meta.voucher_code ?? null,
      stripe: { sessionId: session.id, paymentIntentId },
    });
    return { status: "booking", bookingId: meta.booking_id, outcome };
  }

  if (meta.kind === "gift_voucher" && meta.amount_cents) {
    const amountCents = Number(meta.amount_cents);
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    const voucher = await createPurchasedVoucher(session, amountCents, email);
    return { status: "gift_voucher", voucher };
  }

  console.error("[stripe] session sans métadonnées reconnues", session.id, meta);
  return { status: "unknown" };
}
