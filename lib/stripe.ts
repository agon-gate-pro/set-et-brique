import "server-only";

import Stripe from "stripe";

/**
 * Client Stripe (module 4). Les clés viennent de l'intégration Vercel Marketplace
 * (`STRIPE_SECRET_KEY`, bac à sable Vercel tant que Set et Brique n'a pas son propre compte,
 * voir `docs/FONCTIONNEMENT.md`, section Paiement). La version d'API est celle du SDK installé.
 */

let client: Stripe | null = null;

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante : lance `vercel env pull` pour récupérer .env.local");
  client ??= new Stripe(key, { appInfo: { name: "Set et Brique" } });
  return client;
}

/** Vrai quand les clés sont des clés de test (bac à sable) : affiché dans l'espace de gestion. */
export function stripeIsTestMode() {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_") || (process.env.STRIPE_SECRET_KEY ?? "").startsWith("rk_test_");
}
