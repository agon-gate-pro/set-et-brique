/**
 * Nettoyage de la base avant la mise en production : efface toutes les réservations (historique,
 * prolongations et journal des e-mails suivent en cascade), tous les bons cadeaux et tous les
 * clients. Les clients repartent de zéro avec l'instance Clerk de production (leurs identifiants
 * Clerk de développement ne vaudront plus rien). Sets, exemplaires, forfaits, lieux, périodes
 * fermées, réglages et contenus sont conservés.
 *
 *   pnpm tsx --env-file=.env.local scripts/cleanup-test-data.ts          → compte, n'efface rien
 *   pnpm tsx --env-file=.env.local scripts/cleanup-test-data.ts --yes    → efface
 *
 * Refuse d'effacer tant qu'une empreinte de caution est encore en place chez Stripe (elle resterait
 * bloquée sur la carte du client jusqu'à son terme) : libérer d'abord depuis la fiche.
 */
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquante (lancer avec --env-file=.env.local)");
const pool = new Pool({ connectionString: url.replace(/sslmode=(require|prefer|verify-ca)\b/, "sslmode=verify-full") });
const yes = process.argv.includes("--yes");

async function count(table: string, where = "") {
  const r = await pool.query(`select count(*)::int as n from ${table} ${where}`);
  return r.rows[0].n as number;
}

async function main() {
  const held = await pool.query("select reference from bookings where deposit_status = 'held'");
  console.log("Réservations :", await count("bookings"));
  console.log("Lignes d'historique :", await count("booking_events"));
  console.log("Prolongations :", await count("booking_extensions"));
  console.log("E-mails journalisés :", await count("email_log"));
  console.log("Bons cadeaux :", await count("gift_vouchers"));
  console.log("Clients :", await count("customers"));
  if (held.rowCount) {
    console.log("\nEmpreintes de caution encore en place :", held.rows.map((r) => r.reference).join(", "));
    console.log("Libérer ces empreintes depuis la fiche de chaque réservation avant de nettoyer. Rien n'est effacé.");
    return;
  }
  if (!yes) {
    console.log("\nRien n'est effacé : relancer avec --yes pour supprimer tout ce qui est compté ci-dessus.");
    return;
  }
  await pool.query("begin");
  await pool.query("delete from email_log");
  await pool.query("delete from bookings");
  await pool.query("delete from gift_vouchers");
  await pool.query("delete from customers");
  await pool.query("commit");
  console.log("\nBase nettoyée : réservations, bons cadeaux, clients et journaux effacés.");
}

main()
  .catch(async (e) => {
    await pool.query("rollback").catch(() => {});
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
