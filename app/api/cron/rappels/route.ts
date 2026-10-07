import { runReminders } from "@/lib/email/reminders";

/**
 * Tâche planifiée Vercel (`vercel.json`, chaque matin) : rappels de fin de location par e-mail.
 * Vercel appelle la route avec `Authorization: Bearer <CRON_SECRET>` ; sans ce secret, refus.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const sent = await runReminders();
  return Response.json({ sent });
}
