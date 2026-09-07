import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL manquante : lance `vercel env pull` pour récupérer .env.local");
}

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
