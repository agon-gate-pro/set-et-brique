import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL manquante : lance `vercel env pull` pour récupérer .env.local");
}

/**
 * Neon fournit `sslmode=require`. Le pilote `pg` 8 le traite déjà comme
 * `verify-full` mais émet un avertissement à la première connexion ; Node
 * l'écrit via console.error et Next l'affiche en dev comme une erreur sur la
 * première page qui touche la base. On écrit donc le mode explicitement,
 * à comportement identique.
 */
export function normalizeSslMode(url: string) {
  return url.replace(/sslmode=(require|prefer|verify-ca)\b/, "sslmode=verify-full");
}

const connectionString = normalizeSslMode(rawUrl);

// Un seul pool par instance de fonction, réutilisé entre les requêtes
// (Fluid Compute). attachDatabasePool ferme proprement les connexions
// quand l'instance s'arrête.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
  });

if (!globalForDb.pool) {
  globalForDb.pool = pool;
  attachDatabasePool(pool);
}

export const db = drizzle(pool, { schema, casing: "snake_case" });
export { schema };
