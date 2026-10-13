"use server";

import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { createGiftVoucherCheckout, type GiftVoucherCheckoutResult } from "@/lib/payments";
import { site } from "@/lib/site";

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

/** « Payer » du récapitulatif d'achat d'un bon : prépare la page de paiement Stripe et renvoie son adresse. */
export async function startGiftVoucherPayment(amountEuros: number): Promise<GiftVoucherCheckoutResult> {
  const user = await currentUser();
  if (!user) return { error: "Connectez-vous pour commander un bon cadeau." };
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!email) return { error: "Votre compte n'a pas d'adresse e-mail : impossible d'envoyer le bon." };
  return createGiftVoucherCheckout({ amountEuros, email, clerkUserId: user.id, origin: await requestOrigin() });
}
