import type { Metadata } from "next";
import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { addDays, monthStartIso, todayIso } from "@/lib/dates";
import { formatCents } from "@/lib/format";

export const metadata: Metadata = { title: "Statistiques", robots: { index: false } };

const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "Europe/Paris" });

export default async function StatistiquesPage() {
  const today = todayIso();
  const months = Array.from({ length: 12 }, (_, i) => monthStartIso(today, i - 11).slice(0, 7));
  const historyStart = `${months[0]}-01`;
  const occupancyStart = addDays(today, -29);

  const [monthlyRevenue, topSets, [occupancyDays], [activeCopies], [vouchers]] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(${schema.bookings.startDate}, 'YYYY-MM')`,
        total: sql<number>`coalesce(sum(${schema.bookings.rentalCents}), 0)::int`,
      })
      .from(schema.bookings)
      .where(
        sql`${schema.bookings.status} in ('confirmed', 'picked_up', 'returned') and ${schema.bookings.startDate} >= ${historyStart}`,
      )
      .groupBy(sql`to_char(${schema.bookings.startDate}, 'YYYY-MM')`),
    db
      .select({
        name: schema.sets.name,
        slug: schema.sets.slug,
        n: sql<number>`count(*)::int`,
      })
      .from(schema.bookings)
      .innerJoin(schema.sets, eq(schema.bookings.setId, schema.sets.id))
      .where(sql`${schema.bookings.status} in ('confirmed', 'picked_up', 'returned')`)
      .groupBy(schema.sets.id)
      .orderBy(sql`count(*) desc`)
      .limit(5),
    db
      .select({
        n: sql<number>`coalesce(sum(
          greatest(0, (least(${schema.bookings.endDate}, ${today}::date) - greatest(${schema.bookings.startDate}, ${occupancyStart}::date)) + 1)
        ), 0)::int`,
      })
      .from(schema.bookings)
      .where(
        sql`${schema.bookings.status} in ('confirmed', 'picked_up', 'returned') and ${schema.bookings.startDate} <= ${today} and ${schema.bookings.endDate} >= ${occupancyStart}`,
      ),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.setCopies).where(sql`${schema.setCopies.status} != 'retired'`),
    db
      .select({
        total: sql<number>`coalesce(sum(${schema.giftVouchers.amountCents}), 0)::int`,
        used: sql<number>`coalesce(sum(${schema.giftVouchers.amountCents}) filter (where ${schema.giftVouchers.status} = 'used'), 0)::int`,
        circulating: sql<number>`coalesce(sum(${schema.giftVouchers.amountCents}) filter (where ${schema.giftVouchers.status} = 'valid' and ${schema.giftVouchers.expiresAt} > now()), 0)::int`,
      })
      .from(schema.giftVouchers),
  ]);

  const revenueByMonth = new Map(monthlyRevenue.map((r) => [r.month, r.total]));
  const history = months.map((month) => ({ month, total: revenueByMonth.get(month) ?? 0 }));
  const maxRevenue = Math.max(1, ...history.map((h) => h.total));

  const occupancyRate = activeCopies.n > 0 ? Math.round((occupancyDays.n / (activeCopies.n * 30)) * 100) : 0;

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Statistiques</h1>

      <section className="mt-8 brick-card p-5">
        <h2 className="text-xl font-semibold">Chiffre d&apos;affaires par mois</h2>
        <p className="mt-1 text-sm text-slate-ink">Réservations confirmées ou au-delà, à la date de début de location.</p>
        <div className="mt-6 flex items-end gap-2 md:gap-3 h-40">
          {history.map((h) => (
            <div key={h.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-ink-deep">{h.total > 0 ? formatCents(h.total) : ""}</span>
              <div
                className="w-full rounded-t bg-brick"
                style={{ height: `${Math.max(2, Math.round((h.total / maxRevenue) * 100))}%` }}
              />
              <span className="text-[11px] text-slate-ink whitespace-nowrap">{monthLabel.format(new Date(`${h.month}-01T12:00:00Z`))}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="brick-card p-5">
          <h2 className="text-xl font-semibold">Sets les plus loués</h2>
          <p className="mt-1 text-sm text-slate-ink">Nombre de réservations confirmées ou au-delà.</p>
          {topSets.length === 0 ? (
            <p className="mt-4 text-slate-ink">Aucune réservation confirmée pour l&apos;instant.</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {topSets.map((s, i) => (
                <li key={s.slug} className="flex items-center gap-3">
                  <span className="display text-lg font-bold text-brick w-6 shrink-0">{i + 1}</span>
                  <Link href={`/admin/sets`} className="flex-1 font-medium hover:underline truncate">
                    {s.name}
                  </Link>
                  <span className="font-semibold text-slate-ink shrink-0">
                    {s.n} location{s.n > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="brick-card p-5">
          <h2 className="text-xl font-semibold">Taux d&apos;occupation</h2>
          <p className="mt-1 text-sm text-slate-ink">Jours loués sur les 30 derniers jours, rapportés aux exemplaires actifs.</p>
          <p className="mt-4 display text-4xl font-bold text-brick">{occupancyRate}%</p>
          <p className="mt-1 text-sm text-slate-ink">
            {occupancyDays.n} jour{occupancyDays.n > 1 ? "s" : ""} loué{occupancyDays.n > 1 ? "s" : ""} sur {activeCopies.n * 30} possibles
            ({activeCopies.n} exemplaire{activeCopies.n > 1 ? "s" : ""} actif{activeCopies.n > 1 ? "s" : ""}).
          </p>
        </section>
      </div>

      <section className="mt-6 brick-card p-5">
        <h2 className="text-xl font-semibold">Bons cadeaux</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          <li>
            <p className="display text-3xl font-bold text-ink-deep">{formatCents(vouchers.total)}</p>
            <p className="mt-1 text-slate-ink">Émis au total</p>
          </li>
          <li>
            <p className="display text-3xl font-bold text-ink-deep">{formatCents(vouchers.used)}</p>
            <p className="mt-1 text-slate-ink">Utilisés</p>
          </li>
          <li>
            <p className="display text-3xl font-bold text-ink-deep">{formatCents(vouchers.circulating)}</p>
            <p className="mt-1 text-slate-ink">Encore en circulation</p>
          </li>
        </ul>
      </section>
    </>
  );
}
