import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { site } from "@/lib/site";

// Régénéré à chaque modification d'un set (`revalidateSet()`), l'heure est un filet de sécurité.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sets = await db
    .select({ slug: schema.sets.slug, updatedAt: schema.sets.updatedAt, createdAt: schema.sets.createdAt })
    .from(schema.sets)
    .where(eq(schema.sets.status, "published"))
    .orderBy(desc(schema.sets.featured), schema.sets.sortOrder);
  const latest = sets.reduce<Date | undefined>((m, s) => {
    const d = s.updatedAt ?? s.createdAt;
    return !m || d > m ? d : m;
  }, undefined);
  return [
    { url: `${site.url}/`, lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/catalogue`, lastModified: latest, changeFrequency: "daily", priority: 0.9 },
    ...sets.map((s) => ({
      url: `${site.url}/catalogue/${s.slug}`,
      lastModified: s.updatedAt ?? s.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${site.url}/bons-cadeaux`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site.url}/qui-sommes-nous`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
