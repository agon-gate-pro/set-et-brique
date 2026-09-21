import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { addDays, endOfMonthIso, startOfMonthIso, startOfWeekIso, todayIso } from "@/lib/dates";
import { formatCents } from "@/lib/format";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Gestion", robots: { index: false } };

export default async function AdminHome() {
  await requireRole("admin");
  const today = todayIso();
  const weekStart = startOfWeekIso(today);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonthIso(today);
  const monthEnd = endOfMonthIso(today);

  const [
    [sets],
    [customers],
    [validVouchers],
    [inRental],
    [pending],
    [late],
    [toHandOver],
    [caDay],
    [caWeek],
    [caMonth],
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.sets),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.customers),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.giftVouchers)
      .where(sql`${schema.giftVouchers.status} = 'valid'`),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(sql`${schema.bookings.status} = 'picked_up'`),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(sql`${schema.bookings.status} = 'pending_review'`),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(sql`${schema.bookings.status} = 'picked_up' and ${schema.bookings.endDate} < ${today}`),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(sql`${schema.bookings.status} in ('pending_payment', 'confirmed')`),
    db
      .select({ n: sql<number>`coalesce(sum(${schema.bookings.rentalCents}), 0)::int` })
      .from(schema.bookings)
      .where(
        sql`${schema.bookings.status} in ('confirmed', 'picked_up', 'returned') and ${schema.bookings.startDate} = ${today}`,
      ),
    db
      .select({ n: sql<number>`coalesce(sum(${schema.bookings.rentalCents}), 0)::int` })
      .from(schema.bookings)
      .where(
        sql`${schema.bookings.status} in ('confirmed', 'picked_up', 'returned') and ${schema.bookings.startDate} between ${weekStart} and ${weekEnd}`,
      ),
    db
      .select({ n: sql<number>`coalesce(sum(${schema.bookings.rentalCents}), 0)::int` })
      .from(schema.bookings)
      .where(
        sql`${schema.bookings.status} in ('confirmed', 'picked_up', 'returned') and ${schema.bookings.startDate} between ${monthStart} and ${monthEnd}`,
      ),
  ]);

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

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <Link href="/admin/sets/nouveau" className="flex h-full flex-col justify-between brick-card p-5 hover:bg-sea/15 transition-colors">
            <p className="display text-3xl sm:text-4xl font-bold text-ink-deep">{sets.n}</p>
            <p className="mt-1 font-semibold text-slate-ink">Sets au catalogue</p>
          </Link>
        </li>
        <li className="brick-card p-5">
          <p className="display text-3xl sm:text-4xl font-bold text-ink-deep">{customers.n}</p>
          <p className="mt-1 font-semibold text-slate-ink">Clients</p>
        </li>
        <li>
          <Link href="/admin/bons-cadeaux" className="flex h-full flex-col justify-between brick-card p-5 hover:bg-sea/15 transition-colors">
            <p className="display text-3xl sm:text-4xl font-bold text-ink-deep">{validVouchers.n}</p>
            <p className="mt-1 font-semibold text-slate-ink">Bons cadeaux valides</p>
          </Link>
        </li>
      </ul>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <Link href="/admin/reservations" className="flex h-full flex-col justify-between brick-card p-5 hover:bg-sea/15 transition-colors">
            <p className="display text-3xl sm:text-4xl font-bold text-ink-deep">{inRental.n}</p>
            <p className="mt-1 font-semibold text-slate-ink">Sets en location actuellement</p>
          </Link>
        </li>
        <li>
          <Link href="/admin/reservations" className="flex h-full flex-col justify-between brick-card p-5 hover:bg-sea/15 transition-colors">
            <p className="display text-3xl sm:text-4xl font-bold text-ink-deep">{pending.n}</p>
            <p className="mt-1 font-semibold text-slate-ink">Réservations à traiter</p>
          </Link>
        </li>
        <li>
          <Link href="/admin/reservations" className="flex h-full flex-col justify-between brick-card p-5 hover:bg-sea/15 transition-colors">
            <p className="display text-3xl sm:text-4xl font-bold text-ink-deep">{toHandOver.n}</p>
            <p className="mt-1 font-semibold text-slate-ink">Sets à remettre au client</p>
          </Link>
        </li>
      </ul>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li className="brick-card p-5">
          <p className="display text-3xl sm:text-4xl font-bold text-ink-deep">{formatCents(caDay.n)}</p>
          <p className="mt-1 font-semibold text-slate-ink">CA du jour</p>
        </li>
        <li className="brick-card p-5">
          <p className="display text-3xl sm:text-4xl font-bold text-ink-deep">{formatCents(caWeek.n)}</p>
          <p className="mt-1 font-semibold text-slate-ink">CA de la semaine</p>
        </li>
        <li className="brick-card p-5">
          <p className="display text-3xl sm:text-4xl font-bold text-ink-deep">{formatCents(caMonth.n)}</p>
          <p className="mt-1 font-semibold text-slate-ink">CA du mois</p>
        </li>
      </ul>

      <p className="mt-8 text-slate-ink max-w-xl">
        Les contenus du site et la maintenance arrivent dans les prochaines étapes.
      </p>
    </>
  );
}
