"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

export type CatalogueItem = {
  id: string;
  themeSlug: string;
  pieces: number | null;
  ageMin: number | null;
  buildHours: number | null;
  availableToday: boolean;
  /** La carte du set, rendue côté serveur. */
  card: ReactNode;
};

type Range = [number, number];

export type CatalogueFilters = {
  theme: string | null;
  today: boolean;
  age: number | null;
  pieces: Range | null;
  hours: Range | null;
};

type Props = {
  items: CatalogueItem[];
  themes: { slug: string; label: string }[];
  ages: number[];
  piecesBounds: Range | null;
  hoursBounds: Range | null;
  initial: CatalogueFilters;
};

/** Menus déroulants des filtres : sans contour rouge global, bordure bleue au clavier. */
const selectClass =
  "focus-outline-none w-full rounded-xl border border-slate-ink/20 bg-paper px-3 py-2.5 text-[15px] text-ink-deep font-semibold focus-visible:border-sea";

const numberFr = (n: number) => n.toLocaleString("fr-FR");
const formatHours = (n: number) => `${numberFr(n)} h`;
const inRange = (value: number | null, range: Range | null) =>
  range === null || (value !== null && value >= range[0] && value <= range[1]);

/** Adresse de la page pour ces filtres, pour qu'un lien filtré reste partageable. */
function filtersToQuery(f: CatalogueFilters) {
  const params = new URLSearchParams();
  if (f.theme) params.set("gamme", f.theme);
  if (f.today) params.set("dispo", "1");
  if (f.age !== null) params.set("age", String(f.age));
  if (f.pieces) params.set("pieces", f.pieces.join("-"));
  if (f.hours) params.set("duree", f.hours.join("-"));
  const query = params.toString();
  return query ? `/catalogue?${query}` : "/catalogue";
}

/**
 * Catalogue filtrable : colonne de filtres à gauche sur grand écran, panneau repliable sous
 * un bouton « Filtres » sur mobile. Tout se filtre dans le navigateur (les sets tiennent en
 * une page) ; l'adresse suit les filtres via `history.replaceState`, sans recharger la page.
 */
export function CatalogueBrowser({ items, themes, ages, piecesBounds, hoursBounds, initial }: Props) {
  const [filters, setFilters] = useState<CatalogueFilters>(initial);
  const [panelOpen, setPanelOpen] = useState(false);
  const set = (patch: Partial<CatalogueFilters>) => setFilters((f) => ({ ...f, ...patch }));

  useEffect(() => {
    // Un curseur qu'on fait glisser change la valeur en continu : on n'écrit l'adresse qu'une fois posé.
    const timer = setTimeout(() => window.history.replaceState(null, "", filtersToQuery(filters)), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const matches = (item: CatalogueItem, f: CatalogueFilters, ignoreTheme = false) =>
    (ignoreTheme || f.theme === null || item.themeSlug === f.theme) &&
    (!f.today || item.availableToday) &&
    (f.age === null || item.ageMin === null || item.ageMin <= f.age) &&
    inRange(item.pieces, f.pieces) &&
    inRange(item.buildHours, f.hours);

  const visible = items.filter((item) => matches(item, filters));
  const availableCount = visible.filter((item) => item.availableToday).length;
  // Compteur de chaque gamme selon les autres filtres : on voit tout de suite les gammes vides.
  const themeCounts = useMemo(() => {
    const counts = new Map<string | null, number>();
    for (const item of items) {
      if (!matches(item, filters, true)) continue;
      counts.set(item.themeSlug, (counts.get(item.themeSlug) ?? 0) + 1);
      counts.set(null, (counts.get(null) ?? 0) + 1);
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filters.today, filters.age, filters.pieces, filters.hours]);

  const activeCount = [
    filters.theme !== null,
    filters.today,
    filters.age !== null,
    filters.pieces !== null,
    filters.hours !== null,
  ].filter(Boolean).length;
  const reset = () => setFilters({ theme: null, today: false, age: null, pieces: null, hours: null });
  const themeLabel = themes.find((t) => t.slug === filters.theme)?.label;

  return (
    <>
      <section className="studs-sky border-b border-slate-ink/10">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-5 md:py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="text-2xl md:text-3xl font-bold">Le catalogue</h1>
            <p className="font-semibold text-ink-deep text-sm" aria-live="polite">
              {visible.length} set{visible.length > 1 ? "s" : ""}
              {activeCount > 0 ? ` sur ${items.length}` : " au catalogue"}
              {themeLabel ? ` · ${themeLabel}` : ""}, {availableCount} disponible{availableCount > 1 ? "s" : ""}{" "}
              aujourd&apos;hui.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 md:px-8 py-6 md:py-8 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8 lg:items-start">
        <div className="mb-5 lg:hidden">
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            aria-controls="catalogue-filters"
            className="btn btn-paper text-sm py-2.5 px-4"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {panelOpen ? "Masquer les filtres" : "Filtres"}
            {activeCount > 0 ? (
              <span className="rounded-full bg-ink-deep text-paper text-xs font-bold px-2 py-0.5">{activeCount}</span>
            ) : null}
          </button>
        </div>

        <aside
          id="catalogue-filters"
          aria-label="Filtres du catalogue"
          className={`${panelOpen ? "block" : "hidden"} lg:block brick-card p-5 mb-6 lg:mb-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold">Filtres</h2>
            {activeCount > 0 ? (
              <button type="button" onClick={reset} className="text-sm font-semibold text-sea-deep underline underline-offset-4">
                Réinitialiser
              </button>
            ) : null}
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-ink/15 bg-sky px-3 py-3 cursor-pointer hover:bg-sea/15">
            <input
              type="checkbox"
              checked={filters.today}
              onChange={(e) => set({ today: e.target.checked })}
              className="h-5 w-5 shrink-0 accent-ink-deep"
            />
            <span className="text-sm font-bold text-ink-deep">Disponible dès aujourd&apos;hui</span>
          </label>

          {/* Juste sous la disponibilité, avant l'âge : la gamme est le premier critère des clients. */}
          {themes.length > 0 ? (
            <FilterGroup title="Gamme" htmlFor="filter-theme">
              <select
                id="filter-theme"
                value={filters.theme ?? ""}
                onChange={(e) => set({ theme: e.target.value || null })}
                className={selectClass}
              >
                <option value="">Toutes les gammes</option>
                {themes.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.label} ({themeCounts.get(t.slug) ?? 0})
                  </option>
                ))}
              </select>
            </FilterGroup>
          ) : null}

          {ages.length > 0 ? (
            <FilterGroup title="Âge du constructeur" htmlFor="filter-age">
              <select
                id="filter-age"
                value={filters.age ?? ""}
                onChange={(e) => set({ age: e.target.value ? Number(e.target.value) : null })}
                className={selectClass}
              >
                <option value="">Tous les âges</option>
                {ages.map((age) => (
                  <option key={age} value={age}>
                    {age === 18 ? "18 ans et plus" : `${age} ans`}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-ink">Les sets conseillés jusqu&apos;à cet âge.</p>
            </FilterGroup>
          ) : null}

          {piecesBounds ? (
            <FilterGroup title="Nombre de pièces">
              <RangeSlider
                bounds={piecesBounds}
                step={50}
                value={filters.pieces}
                onChange={(pieces) => set({ pieces })}
                format={(n) => `${numberFr(n)} pièces`}
                name="pièces"
              />
            </FilterGroup>
          ) : null}

          {hoursBounds ? (
            <FilterGroup title="Temps de montage">
              <RangeSlider
                bounds={hoursBounds}
                step={1}
                value={filters.hours}
                onChange={(hours) => set({ hours })}
                format={formatHours}
                name="heures de montage"
              />
            </FilterGroup>
          ) : null}
        </aside>

        {visible.length === 0 ? (
          <div className="brick-card p-8">
            <h2 className="text-2xl font-semibold">Aucun set ne correspond</h2>
            <p className="mt-3 text-slate-ink leading-relaxed">
              Élargissez un peu vos critères : un autre âge, plus de pièces ou une autre gamme.
            </p>
            <button type="button" onClick={reset} className="btn btn-paper mt-6">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <li key={item.id}>{item.card}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function FilterGroup({ title, htmlFor, children }: { title: string; htmlFor?: string; children: ReactNode }) {
  const Title = htmlFor ? "label" : "p";
  return (
    <div className="mt-5 border-t border-slate-ink/10 pt-4">
      <Title htmlFor={htmlFor} className="block text-sm font-bold text-ink-deep mb-2">
        {title}
      </Title>
      {children}
    </div>
  );
}

/**
 * Curseur à deux poignées (minimum, maximum) : deux `input type="range"` superposés, dont
 * seules les poignées captent le pointeur (`.range-dual`, `globals.css`). Clavier et lecteurs
 * d'écran fonctionnent comme sur un curseur natif. `null` = toute l'étendue, filtre inactif.
 */
function RangeSlider({
  bounds,
  step,
  value,
  onChange,
  format,
  name,
}: {
  bounds: Range;
  step: number;
  value: Range | null;
  onChange: (value: Range | null) => void;
  format: (n: number) => string;
  name: string;
}) {
  const [min, max] = bounds;
  const [low, high] = value ?? bounds;
  const pct = (n: number) => (max === min ? 0 : ((n - min) / (max - min)) * 100);
  const update = (next: Range) => onChange(next[0] <= min && next[1] >= max ? null : next);
  // Poignées confondues au maximum : celle du minimum passe dessus pour rester attrapable.
  const lowOnTop = low > min + (max - min) / 2;

  return (
    <div>
      <p className="text-sm font-semibold text-ink-deep">
        {format(low)} – {format(high)}
      </p>
      <div className="relative mt-2 h-8">
        <div className="absolute inset-x-3.5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200">
          <div
            className="absolute inset-y-0 rounded-full bg-sun-deep"
            style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => update([Math.min(Number(e.target.value), high), high])}
          aria-label={`Minimum, ${name}`}
          aria-valuetext={format(low)}
          className={`range-dual absolute inset-0 w-full ${lowOnTop ? "z-20" : "z-10"}`}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => update([low, Math.max(Number(e.target.value), low)])}
          aria-label={`Maximum, ${name}`}
          aria-valuetext={format(high)}
          className="range-dual absolute inset-0 w-full z-10"
        />
      </div>
    </div>
  );
}
