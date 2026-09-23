"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays } from "@/lib/dates";
import type { DayAvailability } from "@/lib/availability-core";

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];

const dayStyles: Record<DayAvailability, string> = {
  free: "bg-leaf/15 text-leaf-deep font-semibold",
  booked: "bg-brick/10 text-brick-deep line-through decoration-brick/40",
  closed: "bg-slate-200 text-slate-ink/70",
  past: "text-slate-ink/35",
};

const legend: [DayAvailability, string][] = [
  ["free", "Disponible"],
  ["booked", "Déjà loué"],
  ["closed", "Fermé"],
];

function monthLabel(iso: string) {
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function nextMonth(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function prevMonth(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 10);
}

/** Lundi = 0 … dimanche = 6. */
function weekdayIndex(iso: string) {
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * Premier jour de son mois. `days` est trié par construction (clés ISO,
 * `from` à `to`), donc le premier jour trouvé « libre » donne directement le
 * premier mois à afficher — pas la peine de rouvrir sur le mois en cours si
 * ses jours restants sont déjà tous pris.
 */
function firstFreeMonth(from: string, days: Record<string, DayAvailability>) {
  const firstFree = Object.keys(days)
    .sort()
    .find((day) => days[day] === "free");
  return firstFree ? `${firstFree.slice(0, 7)}-01` : from;
}

/**
 * Calendrier mensuel des jours où le set peut être loué. `days` couvre du
 * premier jour du mois de `from` au dernier jour du mois de `to` ; la
 * navigation reste dans cette fenêtre.
 */
export function AvailabilityCalendar({
  from,
  to,
  days,
}: {
  from: string;
  to: string;
  days: Record<string, DayAvailability>;
}) {
  const [month, setMonth] = useState(() => firstFreeMonth(from, days));
  const end = addDays(nextMonth(month), -1);
  const canPrev = month > from;
  const canNext = end < to;

  const cells: (string | null)[] = Array.from({ length: weekdayIndex(month) }, () => null);
  for (let day = month; day <= end; day = addDays(day, 1)) cells.push(day);

  return (
    <div className="brick-card p-6">
      <h2 className="text-2xl font-semibold">Disponibilités</h2>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMonth(prevMonth(month))}
          disabled={!canPrev}
          aria-label="Mois précédent"
          className="rounded-lg p-1.5 text-ink-deep hover:bg-sky disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="font-bold text-ink-deep" aria-live="polite">
          {monthLabel(month)}
        </p>
        <button
          type="button"
          onClick={() => setMonth(nextMonth(month))}
          disabled={!canNext}
          aria-label="Mois suivant"
          className="rounded-lg p-1.5 text-ink-deep hover:bg-sky disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-sm">
        {weekdays.map((w, i) => (
          <div key={i} className="py-1 text-xs font-bold text-slate-ink" aria-hidden>
            {w}
          </div>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <div
              key={day}
              title={legend.find(([k]) => k === days[day])?.[1]}
              className={`rounded-md py-1.5 ${dayStyles[days[day] ?? "past"]}`}
            >
              <span className="sr-only">{legend.find(([k]) => k === days[day])?.[1] ?? "Passé"} : </span>
              {Number(day.slice(8, 10))}
            </div>
          ),
        )}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-ink">
        {legend.map(([key, label]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span className={`inline-block h-3.5 w-3.5 rounded ${dayStyles[key].split(" ")[0]}`} aria-hidden />
            {label}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-ink">
        Les jours de remise en état entre deux locations sont comptés comme indisponibles.
      </p>
    </div>
  );
}
