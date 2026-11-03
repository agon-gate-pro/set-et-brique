import type { Metadata } from "next";
import { isNotNull, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { AdminPageTitle } from "@/components/admin/sections";

export const metadata: Metadata = { title: "Export", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Fichiers à télécharger depuis l'espace de gestion. Pour l'instant la liste de la newsletter ;
 * l'export des ventes et des notes (spécification, module 11) viendra ici.
 */
export default async function ExportPage() {
  await requireRole("admin");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.customers)
    .where(isNotNull(schema.customers.newsletterConsentAt));

  return (
    <>
      <AdminPageTitle section="/admin/export">Export</AdminPageTitle>
      <p className="mt-3 text-sm text-slate-ink">Les fichiers à télécharger pour vos outils.</p>

      <section className="mt-8 brick-card p-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
        <div>
          <h2 className="font-bold text-ink-deep">Newsletter</h2>
          <p className="mt-1 text-sm text-slate-ink">
            {n === 0
              ? "Aucun client inscrit pour l'instant."
              : `${n} client${n > 1 ? "s ont" : " a"} accepté de recevoir la newsletter.`}{" "}
            Le fichier (e-mail, prénom, nom, date d&apos;inscription) s&apos;ouvre dans Excel et s&apos;importe dans
            votre outil d&apos;envoi. Seuls y figurent les clients qui ont coché la case, à la réservation ou dans
            leur compte.
          </p>
        </div>
        {n > 0 ? (
          <a href="/admin/export/newsletter" download className="btn btn-leaf justify-self-start sm:justify-self-end">
            Télécharger la liste
          </a>
        ) : null}
      </section>
    </>
  );
}
