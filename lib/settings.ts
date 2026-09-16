import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Réglages du site (`site_settings`), avec leur valeur de repli si la ligne n'existe pas.
 * Les valeurs par défaut viennent de la spécification fonctionnelle.
 */
export const settingDefaults = {
  /** Jours de battement entre deux locations d'un même exemplaire (spécification, module 1). */
  turnaround_days: 4,
  min_rental_days: 1,
  max_rental_days: 30,
  radius_km: 30,
} as const;

export type SettingKey = keyof typeof settingDefaults;

export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof settingDefaults)[K]> {
  const [row] = await db
    .select({ value: schema.siteSettings.value })
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.key, key));
  const fallback = settingDefaults[key];
  if (!row) return fallback;
  return (typeof row.value === typeof fallback ? row.value : fallback) as (typeof settingDefaults)[K];
}
