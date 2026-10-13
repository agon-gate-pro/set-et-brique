import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillCheckoutSession, recordBookingPaymentFailure } from "@/lib/payments";
import { stripe } from "@/lib/stripe";

/**
 * Webhook Stripe (module 4) : c'est lui qui fait foi pour la livraison d'un paiement, même si le
 * client ferme son navigateur avant de revenir sur le site. Signature vérifiée avec
 * `STRIPE_WEBHOOK_SECRET` (point de terminaison créé dans Stripe pour `/api/stripe/webhook`).
 *
 * En local, `stripe listen --forward-to localhost:3000/api/stripe/webhook --api-key <clé de test>`
 * donne un secret propre à la session ; sans lui, la page de retour livre quand même.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET manquante");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature absente" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (e) {
    console.error("[stripe] signature invalide", e);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfillCheckoutSession(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
      await recordBookingPaymentFailure(event.data.object);
      break;
    default:
      break;
  }
  return NextResponse.json({ received: true });
}
