import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const metadata: Metadata = { title: "Gestion", robots: { index: false } };

export default async function AdminHome() {
  const [[sets], [copies], [bookings], [customers], [pending]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.sets),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.setCopies),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(sql`${schema.bookings.status} in ('confirmed', 'picked_up')`),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.customers),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(sql`${schema.bookings.status} = 'pending_review'`),
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
      {pending.n > 0 ? (
        <Link href="/admin/reservations" className="mt-6 block brick-card bg-sun/40 p-5 font-semibold text-ink-deep hover:bg-sun/60">
          {pending.n} demande{pending.n > 1 ? "s" : ""} de réservation à traiter
        </Link>
      ) : null}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, n]) => (
          <li key={label} className="brick-card p-5">
            <p className="display text-4xl font-bold text-brick">{n}</p>
            <p className="mt-1 font-semibold text-slate-ink">{label}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-slate-ink max-w-xl">
        Les contenus du site et la maintenance arrivent dans les prochaines étapes.
      </p>
    </>
  );
}
