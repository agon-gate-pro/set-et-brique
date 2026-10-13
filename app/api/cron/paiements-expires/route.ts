import { NextResponse } from "next/server";
import { syncDepositHolds } from "@/lib/deposits";
import { expireStaleExtensions } from "@/lib/extensions";
import { expireOverduePayments } from "@/lib/payment-expiry";

/**
 * Tâche planifiée Vercel (`vercel.json`, une fois par jour, limite du plan gratuit) : annule les
 * demandes acceptées dont le délai de paiement est dépassé, même si personne ne passe sur le site.
 * Le gros du travail est fait avant chaque lecture du planning (voir `expireOverduePayments`) ;
 * cette route n'est qu'un filet de sécurité. Elle est en revanche le moteur des empreintes de
 * caution (`syncDepositHolds`) : c'est son passage du matin qui les pose le jour de la remise et
 * les renouvelle. Vercel envoie `Authorization: Bearer <CRON_SECRET>`
 * quand la variable `CRON_SECRET` est définie dans le projet : sans elle, la route refuse tout.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const cancelled = await expireOverduePayments();
  // Même filet pour les prolongations restées sans réponse ou sans paiement à temps.
  const expiredExtensions = await expireStaleExtensions();
  // Empreintes de caution : à poser le jour de la remise, à renouveler avant leur terme. Après les
  // annulations ci-dessus, pour ne rien bloquer sur la carte d'une réservation qui vient de tomber.
  // Une erreur ici ne doit pas masquer le résultat des deux passages précédents.
  let deposits: Awaited<ReturnType<typeof syncDepositHolds>> | { error: string };
  try {
    deposits = await syncDepositHolds();
  } catch (e) {
    console.error("[cron] empreintes de caution", e);
    deposits = { error: e instanceof Error ? e.message : String(e) };
  }
  return NextResponse.json({ cancelled, expiredExtensions, deposits });
}
