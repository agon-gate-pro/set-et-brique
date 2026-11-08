import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { addDays, monthStartIso, todayIso } from "@/lib/dates";
import { formatCents, formatDateShort } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { AdminPageTitle } from "@/components/admin/sections";

export const metadata: Metadata = { title: "Statistiques", robots: { index: false } };

const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "Europe/Paris" });
const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "Europe/Paris" });

/** Réservations comptées dans les statistiques : confirmées ou au-delà (même règle que le tableau de bord). */
const COUNTED = sql.raw(`('confirmed', 'picked_up', 'returned')`);
/** Réservations qui retiennent encore un set, demandes en attente comprises : un set ainsi réservé ne « dort » pas. */
const UPCOMING = sql.raw(`('pending_review', 'date_proposed', 'pending_payment', 'confirmed', 'picked_up')`);
/** Un set publié sans location terminée depuis ce nombre de jours, ni location à venir, « dort ». */
const SLEEPING_DAYS = 60;

/** « 3 jours », « 2,5 jours », « 1 jour ». */
function formatDays(n: number) {
  const rounded = Math.round(n * 10) / 10;
  return `${rounded.toLocaleString("fr-FR")} jour${rounded >= 2 ? "s" : ""}`;
}

/** Libellé de mois avec majuscule : « Novembre ». */
function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function StatistiquesPage() {
  await requireRole("admin");
  const today = todayIso();
  const months = Array.from({ length: 12 }, (_, i) => monthStartIso(today, i - 11).slice(0, 7));
  const historyStart = `${months[0]}-01`;
  const occupancyStart = addDays(today, -29);
  const sleepingSince = addDays(today, -SLEEPING_DAYS);

  const perCustomer = db
    .select({ customerId: schema.bookings.customerId, n: sql<number>`count(*)::int`.as("n") })
    .from(schema.bookings)
    .where(sql`${schema.bookings.status} in ${COUNTED}`)
    .groupBy(schema.bookings.customerId)
    .as("per_customer");

  const [monthly, topSets, [occupancyDays], [activeCopies], [vouchers], publishedSets, [customers], [newsletter]] =
    await Promise.all([
      db
        .select({
          month: sql<string>`to_char(${schema.bookings.startDate}, 'YYYY-MM')`,
          total: sql<number>`coalesce(sum(${schema.bookings.rentalCents}), 0)::int`,
          count: sql<number>`count(*)::int`,
          days: sql<number>`coalesce(sum(${schema.bookings.days}), 0)::int`,
        })
        .from(schema.bookings)
        .where(sql`${schema.bookings.status} in ${COUNTED} and ${schema.bookings.startDate} >= ${historyStart}`)
        .groupBy(sql`to_char(${schema.bookings.startDate}, 'YYYY-MM')`),
      db
        .select({
          id: schema.sets.id,
          name: schema.sets.name,
          n: sql<number>`count(*)::int`,
        })
        .from(schema.bookings)
        .innerJoin(schema.sets, eq(schema.bookings.setId, schema.sets.id))
        .where(sql`${schema.bookings.status} in ${COUNTED}`)
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
          sql`${schema.bookings.status} in ${COUNTED} and ${schema.bookings.startDate} <= ${today} and ${schema.bookings.endDate} >= ${occupancyStart}`,
        ),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.setCopies).where(sql`${schema.setCopies.status} != 'retired'`),
      db
        .select({
          total: sql<number>`coalesce(sum(${schema.giftVouchers.amountCents}), 0)::int`,
          used: sql<number>`coalesce(sum(${schema.giftVouchers.amountCents}) filter (where ${schema.giftVouchers.status} = 'used'), 0)::int`,
          circulating: sql<number>`coalesce(sum(${schema.giftVouchers.amountCents}) filter (where ${schema.giftVouchers.status} = 'valid' and ${schema.giftVouchers.expiresAt} > now()), 0)::int`,
        })
        .from(schema.giftVouchers),
      // Sets publiés sans location en cours ni à venir, avec la date de fin de leur dernière location.
      db
        .select({
          id: schema.sets.id,
          name: schema.sets.name,
          lastEnd: sql<string | null>`(select max(b.end_date)::text from ${schema.bookings} b where b.set_id = ${schema.sets}.id and b.status in ${COUNTED})`,
        })
        .from(schema.sets)
        .where(
          and(
            eq(schema.sets.status, "published"),
            sql`not exists (select 1 from ${schema.bookings} b where b.set_id = ${schema.sets}.id and b.status in ${UPCOMING} and b.end_date >= ${today}::date)`,
          ),
        )
        .orderBy(asc(schema.sets.name)),
      db
        .select({
          total: sql<number>`count(*)::int`,
          returning: sql<number>`(count(*) filter (where ${perCustomer.n} >= 2))::int`,
        })
        .from(perCustomer),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.customers).where(isNotNull(schema.customers.newsletterConsentAt)),
    ]);

  const byMonth = new Map(monthly.map((r) => [r.month, r]));
  const history = months.map((month) => ({ month, total: byMonth.get(month)?.total ?? 0 }));
  const maxRevenue = Math.max(1, ...history.map((h) => h.total));

  // Chiffres clés : mois en cours et mois précédent, à la date de début de location (comme le graphique).
  const [previousMonth, currentMonth] = months.slice(-2).map((month) => {
    const row = byMonth.get(month);
    const count = row?.count ?? 0;
    const total = row?.total ?? 0;
    return {
      name: monthName.format(new Date(`${month}-01T12:00:00Z`)),
      count,
      total,
      basket: count > 0 ? Math.round(total / count) : null,
      duration: count > 0 ? (row?.days ?? 0) / count : null,
    };
  });
  const keyFigures = [
    { label: "Locations", current: String(currentMonth.count), previous: String(previousMonth.count) },
    { label: "Chiffre d'affaires", current: formatCents(currentMonth.total), previous: formatCents(previousMonth.total) },
    {
      label: "Panier moyen",
      current: currentMonth.basket != null ? formatCents(currentMonth.basket) : "—",
      previous: previousMonth.basket != null ? formatCents(previousMonth.basket) : "—",
    },
    {
      label: "Durée moyenne",
      current: currentMonth.duration != null ? formatDays(currentMonth.duration) : "—",
      previous: previousMonth.duration != null ? formatDays(previousMonth.duration) : "—",
    },
  ];

  // Jamais loués d'abord (ordre alphabétique conservé), puis du retour le plus ancien au plus récent.
  const sleepingSets = publishedSets
    .filter((s) => s.lastEnd == null || s.lastEnd < sleepingSince)
    .sort((a, b) => (a.lastEnd ?? "").localeCompare(b.lastEnd ?? ""));

  const occupancyRate = activeCopies.n > 0 ? Math.round((occupancyDays.n / (activeCopies.n * 30)) * 100) : 0;

  return (
    <>
      <AdminPageTitle section="/admin/statistiques">Statistiques</AdminPageTitle>

      <section className="mt-8 brick-card p-5">
        <h2 className="text-xl font-semibold">{capitalize(currentMonth.name)}</h2>
        <p className="mt-1 text-sm text-slate-ink">
          Locations confirmées ou au-delà qui démarrent ce mois-ci, comparées à {previousMonth.name}.
        </p>
        <ul className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {keyFigures.map((f) => (
            <li key={f.label}>
              <p className="text-sm text-slate-ink">{f.label}</p>
              <p className="mt-0.5 display text-2xl md:text-3xl font-bold text-ink-deep">{f.current}</p>
              <p className="mt-0.5 text-sm text-slate-ink">
                {capitalize(previousMonth.name)} : {f.previous}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 brick-card p-5">
        <h2 className="text-xl font-semibold">Chiffre d&apos;affaires par mois</h2>
        <p className="mt-1 text-sm text-slate-ink">Réservations confirmées ou au-delà, à la date de début de location.</p>
        {/* Téléphone : barres horizontales, une ligne par mois (12 colonnes verticales ne tiennent pas en largeur). */}
        <ul className="mt-5 space-y-2 md:hidden">
          {history.map((h) => (
            <li key={h.month} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 text-slate-ink">{monthLabel.format(new Date(`${h.month}-01T12:00:00Z`))}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-sky">
                <span
                  className="block h-full rounded-full bg-brick"
                  style={{ width: `${h.total > 0 ? Math.max(2, Math.round((h.total / maxRevenue) * 100)) : 0}%` }}
                />
              </span>
              <span className="w-20 shrink-0 text-right font-semibold text-ink-deep">{h.total > 0 ? formatCents(h.total) : "—"}</span>
            </li>
          ))}
        </ul>
        {/*
          Chaque colonne prend toute la hauteur du graphique : sans hauteur définie, le pourcentage de la
          barre retombait à 0 et seuls les montants s'affichaient. La barre la plus haute laisse la place
          de son montant au-dessus (1,5 rem). Mois sans location : simple trait gris.
        */}
        <div className="mt-6 hidden md:flex gap-2 md:gap-3 h-48">
          {history.map((h) => (
            <div key={h.month} className="flex-1 h-full flex flex-col items-center gap-1.5 min-w-0">
              <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-end gap-1.5">
                {h.total > 0 ? (
                  <span className="text-xs font-semibold text-ink-deep whitespace-nowrap">{formatCents(h.total)}</span>
                ) : null}
                <div
                  className={`w-full rounded-t ${h.total > 0 ? "bg-brick" : "bg-slate-ink/15"}`}
                  style={{ height: h.total > 0 ? `max(4px, calc((100% - 1.5rem) * ${h.total / maxRevenue}))` : "2px" }}
                />
              </div>
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
                <li key={s.id} className="flex items-center gap-3">
                  <span className="display text-lg font-bold text-brick w-6 shrink-0">{i + 1}</span>
                  <Link href={`/admin/sets/${s.id}`} className="flex-1 font-medium hover:underline truncate">
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
        <h2 className="text-xl font-semibold">
          Sets qui dorment{sleepingSets.length > 0 ? ` (${sleepingSets.length})` : ""}
        </h2>
        <p className="mt-1 text-sm text-slate-ink">
          Sets publiés jamais loués, ou dont la dernière location est terminée depuis plus de {SLEEPING_DAYS} jours, sans
          location à venir.
        </p>
        {sleepingSets.length === 0 ? (
          <p className="mt-4 text-slate-ink">Tous les sets publiés ont été loués récemment ou ont une location à venir.</p>
        ) : (
          <ul className="mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
            {sleepingSets.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-3 min-w-0">
                <Link href={`/admin/sets/${s.id}`} className="font-medium hover:underline truncate">
                  {s.name}
                </Link>
                <span className="text-sm text-slate-ink shrink-0">
                  {s.lastEnd ? `Dernière location : ${formatDateShort(s.lastEnd)}` : "Jamais loué"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 brick-card p-5">
        <h2 className="text-xl font-semibold">Clients</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          <li>
            <p className="display text-3xl font-bold text-ink-deep">{customers.total}</p>
            <p className="mt-1 text-slate-ink">Ont loué au moins une fois</p>
          </li>
          <li>
            <p className="display text-3xl font-bold text-ink-deep">{customers.returning}</p>
            <p className="mt-1 text-slate-ink">Sont revenus (2 locations ou plus)</p>
          </li>
          <li>
            <p className="display text-3xl font-bold text-ink-deep">{newsletter.n}</p>
            <p className="mt-1 text-slate-ink">Inscrits à la newsletter</p>
          </li>
        </ul>
      </section>

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
