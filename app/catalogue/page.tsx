import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { AvailabilityBadge } from "@/components/catalogue/availability-badge";
import { loadAvailability } from "@/lib/availability";
import { db, schema } from "@/lib/db";
import { formatCents, formatSetNumbers, slugify } from "@/lib/format";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Catalogue",
  description:
    "Le catalogue de sets à louer chez Set et Brique : disponibilité en temps réel, prix par jour et caution de chaque set.",
};
export const dynamic = "force-dynamic";

/** Pastille « Autres » du filtre : les sets sans gamme renseignée. */
const OTHER_THEME = "autres";

export default async function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  const { gamme } = await searchParams;
  const selectedTheme = typeof gamme === "string" ? gamme : null;

  const allRows = await db
    .select({
      id: schema.sets.id,
      slug: schema.sets.slug,
      name: schema.sets.name,
      brand: schema.sets.brand,
      setNumbers: schema.sets.setNumbers,
      theme: schema.sets.theme,
      pieces: schema.sets.pieces,
      ageMin: schema.sets.ageMin,
      depositCents: schema.sets.depositCents,
      turnaroundDays: schema.sets.turnaroundDays,
      featured: schema.sets.featured,
      pricePerDay: sql<number | null>`coalesce((select price_cents_per_day from ${schema.ratePlans} rp where rp.id = ${schema.sets}.rate_plan_id), (select price_cents_per_day from ${schema.ratePlans} rp where rp.is_default limit 1))`,
      cover: sql<string | null>`(select url from ${schema.setImages} i where i.set_id = ${schema.sets}.id order by i.sort_order asc, i.created_at asc limit 1)`,
      coverAlt: sql<string | null>`(select alt from ${schema.setImages} i where i.set_id = ${schema.sets}.id order by i.sort_order asc, i.created_at asc limit 1)`,
    })
    .from(schema.sets)
    .where(eq(schema.sets.status, "published"))
    .orderBy(desc(schema.sets.featured), asc(schema.sets.sortOrder), asc(schema.sets.name));

  // Filtre par gamme, dans l'URL (`?gamme=star-wars`) pour rester partageable et indexable.
  const themeOf = (r: { theme: string | null }) => (r.theme ? slugify(r.theme) : OTHER_THEME);
  const themes = [...new Map(allRows.filter((r) => r.theme).map((r) => [slugify(r.theme!), r.theme!]))]
    .sort(([, a], [, b]) => a.localeCompare(b, "fr"))
    .map(([slug, label]) => ({ slug, label, count: allRows.filter((r) => themeOf(r) === slug).length }));
  const otherCount = allRows.filter((r) => !r.theme).length;
  if (otherCount > 0 && themes.length > 0) themes.push({ slug: OTHER_THEME, label: "Autres", count: otherCount });
  const activeTheme = themes.find((t) => t.slug === selectedTheme) ?? null;
  const rows = activeTheme ? allRows.filter((r) => themeOf(r) === activeTheme.slug) : allRows;

  const availability = await loadAvailability(rows);
  const availableCount = rows.filter((r) => availability.get(r.id)?.status === "available").length;

  return (
    <>
      <section className="studs-sky border-b border-slate-ink/10">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-14 md:py-20">
          <h1 className="text-4xl md:text-6xl font-bold">Le catalogue</h1>
          <p className="mt-5 text-xl text-slate-ink leading-relaxed max-w-2xl">
            Tous nos sets, avec leur disponibilité du jour. Le prix est par jour de
            location, la caution est bloquée sur votre carte à la remise et jamais
            débitée sauf casse ou perte.
          </p>
          {allRows.length > 0 ? (
            <p className="mt-4 font-semibold text-ink-deep">
              {rows.length} set{rows.length > 1 ? "s" : ""}
              {activeTheme ? ` · ${activeTheme.label}` : " au catalogue"}, {availableCount} disponible
              {availableCount > 1 ? "s" : ""} aujourd&apos;hui.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 md:px-8 py-12 md:py-16">
        {themes.length > 0 ? (
          <nav aria-label="Filtrer par gamme" className="mb-8">
            <p className="text-sm font-semibold text-slate-ink">Gamme</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {[{ slug: null, label: "Toutes", count: allRows.length }, ...themes].map((t) => {
                const active = (activeTheme?.slug ?? null) === t.slug;
                return (
                  <li key={t.slug ?? "all"}>
                    <Link
                      href={t.slug ? `/catalogue?gamme=${t.slug}` : "/catalogue"}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun ${
                        active
                          ? "bg-brick text-paper border-brick"
                          : "bg-paper text-ink-deep border-slate-ink/20 hover:bg-sky"
                      }`}
                    >
                      {t.label}
                      <span className={`text-xs font-semibold ${active ? "text-paper/80" : "text-slate-ink"}`}>{t.count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
        {allRows.length === 0 ? (
          <div className="brick-card p-8 max-w-2xl">
            <h2 className="text-2xl font-semibold">Le catalogue se remplit</h2>
            <p className="mt-3 text-slate-ink leading-relaxed">
              Nos sets sont en cours de mise en ligne. En attendant, ils restent
              visibles et réservables sur l&apos;application Poppins, ou par simple
              message.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <a href={site.links.poppinsWeb} target="_blank" rel="noopener noreferrer" className="btn btn-brick">
                Voir le catalogue sur Poppins
              </a>
              <a href={`mailto:${site.email}`} className="btn btn-paper">
                Nous écrire
              </a>
            </div>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((s) => {
              const a = availability.get(s.id);
              return (
                <li key={s.id}>
                  <Link
                    href={`/catalogue/${s.slug}`}
                    className="brick-card block overflow-hidden h-full hover:bg-sky focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun"
                  >
                    <div className="relative aspect-[4/3] bg-sky border-b border-slate-ink/10">
                      {s.cover ? (
                        <Image
                          src={s.cover}
                          alt={s.coverAlt ?? s.name}
                          fill
                          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-slate-ink/50 font-semibold">
                          Photo à venir
                        </div>
                      )}
                      {s.featured ? (
                        <span className="absolute top-3 left-3 text-xs font-bold bg-sun px-2 py-1 rounded-md border border-slate-ink/15">
                          Coup de cœur
                        </span>
                      ) : null}
                    </div>
                    <div className="p-5">
                      {a ? <AvailabilityBadge availability={a} withDate /> : null}
                      <h2 className="mt-3 display text-2xl font-semibold leading-tight">{s.name}</h2>
                      <p className="mt-1 text-sm text-slate-ink">
                        {[
                          s.brand !== "LEGO" ? s.brand : null,
                          s.setNumbers.length > 0 ? `n° ${formatSetNumbers(s.setNumbers)}` : null,
                          s.theme,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-3 text-slate-ink">
                        {[
                          s.pieces != null ? `${s.pieces.toLocaleString("fr-FR")} pièces` : null,
                          s.ageMin != null ? `dès ${s.ageMin} ans` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {s.pricePerDay != null ? (
                          <span className="display text-2xl font-bold text-brick">
                            {formatCents(s.pricePerDay)}
                            <span className="text-base font-semibold text-slate-ink"> / jour</span>
                          </span>
                        ) : null}
                        <span className="text-sm text-slate-ink">caution {formatCents(s.depositCents)}</span>
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
