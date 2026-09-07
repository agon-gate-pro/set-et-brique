import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const metadata: Metadata = { title: "Gestion", robots: { index: false } };

export default async function AdminHome() {
  const [[sets], [copies], [bookings], [customers]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.sets),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.setCopies),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(sql`${schema.bookings.status} in ('confirmed', 'picked_up')`),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.customers),
  ]);

  const tiles = [
    ["Sets au catalogue", sets.n],
    ["Exemplaires", copies.n],
    ["Locations en cours", bookings.n],
    ["Clients", customers.n],
  ] as const;

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Tableau de bord</h1>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, n]) => (
          <li key={label} className="brick-card p-5">
            <p className="display text-4xl font-bold text-brick">{n}</p>
            <p className="mt-1 font-semibold text-slate-ink">{label}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-slate-ink max-w-xl">
        Les écrans de gestion des sets, des réservations, des forfaits et des
        contenus arrivent dans les prochaines étapes.
      </p>
    </>
  );
}
