import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { db, schema } from "@/lib/db";
import { site } from "@/lib/site";
import { renderEmail, type EmailContent } from "./layout";

/**
 * Envoi par Resend (intégration Vercel Marketplace, `RESEND_API_KEY`).
 *
 * - Expéditeur : `EMAIL_FROM`, par défaut « Set et Brique <bonjour@set-et-brique.com> » ; le
 *   domaine doit être vérifié chez Resend. Réponse à : l'adresse de contact, pour que le client
 *   qui clique sur « Répondre » tombe sur Marion.
 * - `EMAIL_TEST_RECIPIENT` : si renseignée, tous les e-mails partent à cette adresse au lieu du
 *   vrai destinataire (développement en local : la base est partagée avec la production, les
 *   clients sont réels).
 * - Sans clé, rien ne part : l'envoi est journalisé `skipped`.
 *
 * Un envoi raté ne fait jamais échouer l'action qui l'a déclenché : l'erreur est journalisée
 * dans `email_log` et dans les logs de la fonction.
 */

const from = process.env.EMAIL_FROM || "Set et Brique <bonjour@set-et-brique.com>";

let client: Resend | null = null;
function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

export type SendOptions = {
  to: string;
  kind: string;
  bookingId?: string | null;
  content: EmailContent;
  /** Ligne déjà réservée dans `email_log` (rappels) : on la complète au lieu d'en créer une. */
  logId?: string;
};

export async function sendEmail({ to, kind, bookingId = null, content, logId }: SendOptions) {
  const recipient = process.env.EMAIL_TEST_RECIPIENT || to;
  const { html, text } = renderEmail(content);
  const subject = process.env.EMAIL_TEST_RECIPIENT ? `[test → ${to}] ${content.subject}` : content.subject;

  let status: "sent" | "failed" | "skipped" = "skipped";
  let providerId: string | null = null;
  let error: string | null = null;

  const api = resend();
  if (api) {
    try {
      const result = await api.emails.send(
        { from, to: recipient, replyTo: site.email, subject, html, text },
        logId ? { idempotencyKey: `email-log/${logId}` } : undefined,
      );
      if (result.error) {
        status = "failed";
        error = `${result.error.name}: ${result.error.message}`;
      } else {
        status = "sent";
        providerId = result.data?.id ?? null;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
  }
  if (status === "failed") console.error(`[email] ${kind} → ${recipient} : ${error}`);
  if (status === "skipped") console.warn(`[email] ${kind} → ${recipient} non envoyé : RESEND_API_KEY absente`);

  const row = { bookingId, kind, recipient, subject, status, providerId, error };
  try {
    if (logId) {
      await db.update(schema.emailLog).set(row).where(eq(schema.emailLog.id, logId));
    } else {
      await db.insert(schema.emailLog).values(row);
    }
  } catch (e) {
    console.error("[email] journal non écrit", e);
  }
  return status;
}
