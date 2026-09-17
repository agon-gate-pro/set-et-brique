import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { todayIso } from "@/lib/dates";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Gestion", robots: { index: false } };

export default async function AdminHome() {
  await requireRole("admin");
  const today = todayIso();
  const [[sets], [copies], [bookings], [customers], [pending], [late]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.sets),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.setCopies),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(sql`${schema.bookings.status} = 'picked_up'`),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.customers),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(sql`${schema.bookings.status} = 'pending_review'`),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(sql`${schema.bookings.status} = 'picked_up' and ${schema.bookings.endDate} < ${today}`),
  ]);

  const tiles = [
    ["Sets au catalogue", sets.n],
    ["Exemplaires", copies.n],
    ["Sets en location", bookings.n],
    ["Clients", customers.n],
  ] as const;

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Tableau de bord</h1>
      {pending.n > 0 ? (
        <Link href="/admin/reservations" className="mt-6 block brick-card bg-sun p-5 font-semibold text-ink-deep hover:bg-sun-deep transition-colors">
          {pending.n} demande{pending.n > 1 ? "s" : ""} de réservation à traiter
        </Link>
      ) : null}
      {late.n > 0 ? (
        <Link href="/admin/reservations" className="mt-4 block brick-card bg-brick/10 border-brick p-5 font-semibold text-brick-deep hover:bg-brick/25 transition-colors">
          {late.n} set{late.n > 1 ? "s" : ""} en retard de retour
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
