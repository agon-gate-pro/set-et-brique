import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";

/**
 * Arrivée après une connexion sans page de retour (`signInFallbackRedirectUrl`) : un gérant va à
 * l'espace de gestion, un client à son compte. `/compte` ne fait plus ce tri lui-même, pour qu'un
 * gérant puisse y suivre et payer ses propres locations.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) redirect("/connexion");
  redirect((await isAdmin()) ? "/admin" : "/compte");
}
