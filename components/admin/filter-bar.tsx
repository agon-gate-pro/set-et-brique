"use client";

import { useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, ChevronUp } from "lucide-react";

/**
 * Bloc de filtres des listes de l'espace de gestion (sets, bons cadeaux, réservations).
 * Grand écran : tout sur une ligne, comme avant (filtres, recherche, « Réinitialiser »).
 * Téléphone : la recherche reste visible, les autres filtres se replient derrière un bouton
 * « Filtres (N) », jaune quand un filtre est actif, et se déplient sous la barre avec
 * « Réinitialiser » et « Voir N résultats » (qui referme le bloc). Les résultats suivent en direct.
 */
export function FilterBar({
  query,
  onQueryChange,
  placeholder,
  activeCount,
  hasFilters,
  onReset,
  resultCount,
  defaultOpen = false,
  className = "mt-4",
  children,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  /** Nombre de filtres actifs hors recherche, affiché sur le bouton. */
  activeCount: number;
  /** Un filtre ou une recherche en cours : affiche « Réinitialiser ». */
  hasFilters: boolean;
  onReset: () => void;
  resultCount: number;
  /** Bloc déplié d'entrée sur téléphone, ex. liste ouverte avec des filtres présélectionnés. */
  defaultOpen?: boolean;
  className?: string;
  /** Les champs de filtre (hors recherche). */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`${className} brick-card bg-sky p-4 sm:p-5 flex flex-wrap items-end gap-4`}>
      <div
        id="admin-filters"
        className={`${open ? "flex" : "hidden"} order-2 w-full flex-col items-start gap-4 md:order-none md:contents`}
      >
        {children}
      </div>
      <div className="order-1 flex w-full items-end gap-2 md:order-none md:w-auto md:flex-1 md:min-w-[16rem]">
        <label className="block flex-1 min-w-0">
          <span className="sr-only md:not-sr-only md:block font-bold text-ink-deep">Recherche</span>
          <span className="md:mt-1 relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-ink" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={placeholder}
              className="focus-outline-none w-full rounded-xl border-2 border-slate-ink/25 bg-paper pl-9 pr-3 py-2 text-ink-deep shadow-sm"
            />
          </span>
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="admin-filters"
          className={`md:hidden shrink-0 inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 font-bold text-ink-deep shadow-sm cursor-pointer ${
            activeCount > 0 ? "border-sun-deep bg-sun" : "border-slate-ink/25 bg-paper"
          }`}
        >
          {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
          Filtres{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>
      {hasFilters ? (
        <button
          type="button"
          onClick={onReset}
          className="hidden md:block focus-outline-none font-bold underline underline-offset-4 self-center cursor-pointer"
        >
          Réinitialiser
        </button>
      ) : null}
      {open ? (
        <div className="order-3 flex w-full items-center justify-between gap-3 md:hidden">
          {hasFilters ? (
            <button type="button" onClick={onReset} className="focus-outline-none font-bold underline underline-offset-4 cursor-pointer">
              Réinitialiser
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={() => setOpen(false)} className="btn btn-leaf whitespace-nowrap">
            Voir {resultCount} résultat{resultCount > 1 ? "s" : ""}
          </button>
        </div>
      ) : null}
    </div>
  );
}
