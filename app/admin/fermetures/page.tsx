import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { todayIso } from "@/lib/availability";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { BlackoutCreateDialog, BlackoutRow } from "./forms";
import { requireRole } from "@/lib/auth";
import { AdminPageTitle } from "@/components/admin/sections";

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageTitle section="/admin/fermetures">Périodes fermées</AdminPageTitle>
        <BlackoutCreateDialog />
      </div>
      <p className="mt-3 text-sm text-slate-ink">
        Vos congés et absences : aucune remise ni aucun retour n&apos;est possible à ces dates. Avec une heure, le
        premier jour reste ouvert avant cette heure et le dernier jour à partir de cette heure ; le client voit seulement
        les heures possibles, jamais le motif.
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

      {past.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Périodes passées</h2>
          <ul className="mt-3 space-y-1 text-slate-ink">
            {past.map(({ period }) => (
              <li key={period.id}>
                Du {formatDate(period.startDate)}
                {period.startTime ? ` à ${period.startTime.slice(0, 5)}` : ""} au {formatDate(period.endDate)}
                {period.endTime ? ` à ${period.endTime.slice(0, 5)}` : ""}
                {period.reason ? ` · ${period.reason}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
