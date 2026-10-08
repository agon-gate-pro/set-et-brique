import type { Metadata } from "next";
import { DashboardView } from "@/components/admin/dashboard";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { addDays, endOfMonthIso, startOfMonthIso, startOfWeekIso, todayIso } from "@/lib/dates";
import { requireRole } from "@/lib/auth";
import { expireOverduePayments } from "@/lib/payment-expiry";
import { AdminPageTitle } from "@/components/admin/sections";

export const metadata: Metadata = { title: "Gestion", robots: { index: false } };

export default async function AdminHome() {
  await requireRole("admin");
  // Demandes acceptées non payées dans le délai : annulées avant de compter les réservations.
  await expireOverduePayments();
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
      <AdminPageTitle section="/admin">Tableau de bord</AdminPageTitle>
      <DashboardView
        f={{
          sets: sets.n,
          customers: customers.n,
          validVouchers: validVouchers.n,
          inRental: inRental.n,
          pending: pending.n,
          late: late.n,
          toHandOver: toHandOver.n,
          caDayCents: caDay.n,
          caWeekCents: caWeek.n,
          caMonthCents: caMonth.n,
        }}
      />

      <p className="mt-8 text-slate-ink max-w-xl">
        Les contenus du site et la maintenance arrivent dans les prochaines étapes.
      </p>
    </>
  );
}
