import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { AvailabilityBadge } from "@/components/catalogue/availability-badge";
import { loadAvailability } from "@/lib/availability";
import { db, schema } from "@/lib/db";
import { formatBuildTime, formatCents, formatSetNumbers, parseBuildHours, slugify } from "@/lib/format";
import { site } from "@/lib/site";
import { CatalogueBrowser, type CatalogueFilters } from "./catalogue-browser";

export const metadata: Metadata = {
  title: "Catalogue",
  description:
    "Le catalogue de sets à louer chez Set et Brique : disponibilité en temps réel, prix par jour et caution de chaque set.",
};
export const dynamic = "force-dynamic";

/** Entrée « Autres » du filtre : les sets sans gamme renseignée. */
const OTHER_THEME = "autres";

type SearchValue = string | string[] | undefined;

/** « 400-2000 » de l'adresse vers un intervalle ramené dans les bornes, `null` si absent ou plein. */
function readRange(raw: SearchValue, bounds: [number, number] | null): [number, number] | null {
  if (!bounds || typeof raw !== "string") return null;
  const match = raw.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  const low = Math.max(bounds[0], Math.min(Number(match[1]), bounds[1]));
  const high = Math.min(bounds[1], Math.max(Number(match[2]), low));
  return low <= bounds[0] && high >= bounds[1] ? null : [low, high];
}

/** Bornes d'un curseur, arrondies au pas pour que les deux extrémités restent atteignables. */
function boundsOf(values: (number | null)[], round: number): [number, number] | null {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return null;
  const low = Math.floor(Math.min(...known) / round) * round;
  const high = Math.ceil(Math.max(...known) / round) * round;
  return low < high ? [low, high] : null;
}

export default async function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  const params = await searchParams;

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
      buildTime: schema.sets.buildTime,
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

  if (allRows.length === 0) {
    return (
      <>
        <section className="studs-sky border-b border-slate-ink/10">
          <div className="mx-auto max-w-7xl px-5 md:px-8 py-5 md:py-6">
            <h1 className="text-2xl md:text-3xl font-bold">Le catalogue</h1>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 md:px-8 py-6 md:py-8">
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
        </section>
      </>
    );
  }

  // Gammes : slug dérivé du champ `theme`, « Autres » pour les sets sans gamme.
  const themeOf = (r: { theme: string | null }) => (r.theme ? slugify(r.theme) : OTHER_THEME);
  const themes = [...new Map(allRows.filter((r) => r.theme).map((r) => [slugify(r.theme!), r.theme!]))]
    .sort(([, a], [, b]) => a.localeCompare(b, "fr"))
    .map(([slug, label]) => ({ slug, label }));
  if (themes.length > 0 && allRows.some((r) => !r.theme)) themes.push({ slug: OTHER_THEME, label: "Autres" });

  const availability = await loadAvailability(allRows);
  const buildHours = new Map(allRows.map((r) => [r.id, parseBuildHours(r.buildTime)]));

  const piecesBounds = boundsOf(allRows.map((r) => r.pieces), 100);
  const hoursBounds = boundsOf([...buildHours.values()], 1);
  // Âges proposés : du plus jeune âge conseillé du catalogue à « 18 ans et plus ».
  const knownAges = allRows.map((r) => r.ageMin).filter((a): a is number => a !== null);
  const youngest = knownAges.length > 0 ? Math.min(18, ...knownAges) : null;
  const ages = youngest === null ? [] : Array.from({ length: 18 - youngest + 1 }, (_, i) => youngest + i);

  const age = typeof params.age === "string" ? Number(params.age) : NaN;
  const theme = typeof params.gamme === "string" ? params.gamme : null;
  const initial: CatalogueFilters = {
    theme: themes.some((t) => t.slug === theme) ? theme : null,
    today: params.dispo === "1",
    age: ages.includes(age) ? age : null,
    pieces: readRange(params.pieces, piecesBounds),
    hours: readRange(params.duree, hoursBounds),
  };

  const items = allRows.map((s) => {
    const a = availability.get(s.id);
    return {
      id: s.id,
      themeSlug: themeOf(s),
      pieces: s.pieces,
      ageMin: s.ageMin,
      buildHours: buildHours.get(s.id) ?? null,
      availableToday: a?.status === "available",
      card: (
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
                sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
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
          <div className="p-4">
            {a ? <AvailabilityBadge availability={a} withDate /> : null}
            <h2 className="mt-2.5 display text-lg font-semibold leading-snug">{s.name}</h2>
            <p className="mt-0.5 text-xs text-slate-ink">
              {[
                s.brand !== "LEGO" ? s.brand : null,
                s.setNumbers.length > 0 ? `n° ${formatSetNumbers(s.setNumbers)}` : null,
                s.theme,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-2 text-sm text-slate-ink">
              {[
                s.pieces != null ? `${s.pieces.toLocaleString("fr-FR")} pièces` : null,
                s.ageMin != null ? `dès ${s.ageMin} ans` : null,
                s.buildTime ? `${formatBuildTime(s.buildTime)} de montage` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {s.pricePerDay != null ? (
                <span className="display text-xl font-bold text-brick">
                  {formatCents(s.pricePerDay)}
                  <span className="text-sm font-semibold text-slate-ink"> / jour</span>
                </span>
              ) : null}
              <span className="text-xs text-slate-ink">caution {formatCents(s.depositCents)}</span>
            </p>
          </div>
        </Link>
      ),
    };
  });

  return (
    <CatalogueBrowser
      items={items}
      themes={themes}
      ages={ages}
      piecesBounds={piecesBounds}
      hoursBounds={hoursBounds}
      initial={initial}
    />
  );
}
