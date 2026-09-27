"use client";

import { useState, type ReactNode } from "react";

/**
 * Onglets Location | Client | Historique de la fiche d'une réservation, sous le bloc de décision.
 * Même style que les onglets des exemplaires (fiche d'un set). Les panneaux restent montés
 * (`hidden`) : une note interne en cours de saisie survit à un changement d'onglet.
 */
export function BookingTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [selected, setSelected] = useState(tabs[0]?.id);

  return (
    <section className="mt-8">
      <div role="tablist" aria-label="Détail de la réservation" className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={selected === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setSelected(t.id)}
            className={`rounded-t-xl px-4 py-2.5 font-bold text-sm border border-b-0 cursor-pointer transition-colors ${
              selected === t.id
                ? "bg-paper border-slate-ink/15 text-ink-deep"
                : "bg-sky/70 border-transparent text-slate-ink hover:bg-sky"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={selected !== t.id}
          className="brick-card -mt-px rounded-tl-none p-6 bg-paper"
        >
          {t.content}
        </div>
      ))}
    </section>
  );
}
