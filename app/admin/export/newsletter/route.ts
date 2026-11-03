import { asc, isNotNull } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { todayIso } from "@/lib/dates";
import { db, schema } from "@/lib/db";

const consentDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" });

/**
 * Cellule CSV entre guillemets. Une valeur qui commence par `=`, `+`, `-` ou `@` serait lue comme
 * une formule par Excel : elle est précédée d'une apostrophe.
 */
function cell(value: string | null) {
  const v = value ?? "";
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Liste des clients qui ont accepté la newsletter (`customers.newsletter_consent_at`), pour l'outil
 * d'envoi de la cliente. CSV au séparateur `;` avec BOM UTF-8 : Excel l'ouvre en français avec les
 * accents, et Brevo, Mailchimp et les autres l'importent tel quel. Gérants seulement.
 */
export async function GET() {
  if (!(await isAdmin())) return new Response("Non autorisé", { status: 403 });

  const rows = await db
    .select({
      email: schema.customers.email,
      firstName: schema.customers.firstName,
      lastName: schema.customers.lastName,
      consentAt: schema.customers.newsletterConsentAt,
    })
    .from(schema.customers)
    .where(isNotNull(schema.customers.newsletterConsentAt))
    .orderBy(asc(schema.customers.newsletterConsentAt));

  const lines = [
    ["E-mail", "Prénom", "Nom", "Inscrit le"],
    ...rows.map((r) => [r.email, r.firstName, r.lastName, r.consentAt ? consentDate.format(r.consentAt) : ""]),
  ].map((line) => line.map(cell).join(";"));

  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-set-et-brique-${todayIso()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
