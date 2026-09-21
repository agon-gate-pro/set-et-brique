import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { todayIso } from "@/lib/availability";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { BlackoutCreateForm, BlackoutRow } from "./forms";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Périodes fermées", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BlackoutsPage() {
  await requireRole("admin");
  const today = todayIso();
  const rows = await db
    .select({
      period: schema.blackoutPeriods,
      // Réservations actives dont la remise ou le retour tombe dans la période.
      affected: sql<number>`(
        select count(*)::int from ${schema.bookings} b
        where b.status in ('pending_payment', 'confirmed', 'picked_up')
          and (
            (b.start_date between ${schema.blackoutPeriods}.start_date and ${schema.blackoutPeriods}.end_date)
            or (b.end_date between ${schema.blackoutPeriods}.start_date and ${schema.blackoutPeriods}.end_date)
          )
      )`,
    })
    .from(schema.blackoutPeriods)
    .orderBy(asc(schema.blackoutPeriods.startDate));

  const upcoming = rows.filter((r) => r.period.endDate >= today);
  const past = rows.filter((r) => r.period.endDate < today);

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Périodes fermées</h1>
      <p className="mt-3 text-sm text-slate-ink whitespace-nowrap">
        Vos congés et absences : aucune remise ni aucun retour n&apos;est possible à ces dates.
      </p>

      {upcoming.length === 0 ? (
        <p className="mt-8 brick-card p-6 bg-sky max-w-xl">Aucune fermeture à venir.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {upcoming.map(({ period, affected }) => (
            <BlackoutRow key={period.id} period={period} affected={affected} />
          ))}
        </ul>
      )}

      <section className="mt-10 brick-card p-5 bg-sky">
        <h2 className="text-2xl font-semibold">Nouvelle période</h2>
        <BlackoutCreateForm />
      </section>

      {past.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Périodes passées</h2>
          <ul className="mt-3 space-y-1 text-slate-ink">
            {past.map(({ period }) => (
              <li key={period.id}>
                Du {formatDate(period.startDate)} au {formatDate(period.endDate)}
                {period.reason ? ` · ${period.reason}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
