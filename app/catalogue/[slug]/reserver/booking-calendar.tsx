"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { addDays, daysBetween } from "@/lib/dates";
import { findFreeCopy, isInBlackout, type CopyInput, type RangeBooking } from "@/lib/availability-core";
import { formatCents } from "@/lib/format";
import { DateReadable } from "./date-readable";

type Props = {
  copies: CopyInput[];
  bookings: RangeBooking[];
  blackouts: { startDate: string; endDate: string }[];
  turnaroundDays: number;
  minStartDate: string;
  minDays: number;
  pricePerDay: number | null;
  initialStartDate: string | null;
  initialDays: number | null;
  onConfirm: (range: { startDate: string; days: number }) => void;
  onClose: () => void;
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MAX_MONTHS_AHEAD = 12;

const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });

function daysInMonth(year: number, month0: number) {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function isoOf(year: number, month0: number, day: number) {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Calendrier de sélection de la période, en popup. Réutilise les mêmes
 * fonctions pures (`findFreeCopy`, `isInBlackout`) que la validation finale
 * côté serveur (`lib/availability-core.ts`), pour ne jamais afficher une
 * période comme libre alors que la demande serait ensuite refusée.
 */
export function BookingCalendar({
  copies,
  bookings,
  blackouts,
  turnaroundDays,
  minStartDate,
  minDays,
  pricePerDay,
  initialStartDate,
  initialDays,
  onConfirm,
  onClose,
}: Props) {
  const baseYear = Number(minStartDate.slice(0, 4));
  const baseMonth0 = Number(minStartDate.slice(5, 7)) - 1;
  const [monthOffset, setMonthOffset] = useState(0);
  const [rangeStart, setRangeStart] = useState<string | null>(initialStartDate);
  const [rangeEnd, setRangeEnd] = useState<string | null>(
    initialStartDate && initialDays ? addDays(initialStartDate, initialDays - 1) : null,
  );

  const monthDate = new Date(Date.UTC(baseYear, baseMonth0 + monthOffset, 1));
  const year = monthDate.getUTCFullYear();
  const month0 = monthDate.getUTCMonth();
  const canGoBack = monthOffset > 0;
  const canGoForward = monthOffset < MAX_MONTHS_AHEAD;

  function dayStatus(iso: string): "past" | "unavailable" | "free" {
    if (iso < minStartDate) return "past";
    if (isInBlackout(iso, blackouts)) return "unavailable";
    return findFreeCopy(copies, bookings, turnaroundDays, iso, iso, null) ? "free" : "unavailable";
  }

  function handlePick(iso: string) {
    if (dayStatus(iso) !== "free") return;
    if (!rangeStart || rangeEnd || iso < rangeStart) {
      setRangeStart(iso);
      setRangeEnd(null);
      return;
    }
    setRangeEnd(iso);
  }

  const days = rangeStart && rangeEnd ? daysBetween(rangeStart, rangeEnd) + 1 : null;
  const meetsMin = days !== null && days >= minDays;
  const freeCopy = rangeStart && rangeEnd ? findFreeCopy(copies, bookings, turnaroundDays, rangeStart, rangeEnd, null) : null;
  const valid = rangeStart != null && rangeEnd != null && meetsMin && freeCopy != null;
  const total = days !== null && pricePerDay != null ? days * pricePerDay : null;

  const firstWeekday = (new Date(Date.UTC(year, month0, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth(year, month0) }, (_, i) => isoOf(year, month0, i + 1)),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-4" onClick={onClose}>
      <div className="brick-card bg-paper p-5 sm:p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-ink-deep">Choisissez vos dates</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-ink cursor-pointer transition-colors hover:bg-sky hover:text-brick-deep"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m - 1)}
            disabled={!canGoBack}
            aria-label="Mois précédent"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-ink/15 text-ink-deep cursor-pointer transition-colors hover:bg-sky disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="font-bold text-ink-deep capitalize">{monthLabel.format(monthDate)}</p>
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m + 1)}
            disabled={!canGoForward}
            aria-label="Mois suivant"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-ink/15 text-ink-deep cursor-pointer transition-colors hover:bg-sky disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-ink">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`empty-${i}`} />;
            const status = dayStatus(iso);
            const inRange = rangeStart && rangeEnd && iso >= rangeStart && iso <= rangeEnd;
            const isEndpoint = iso === rangeStart || iso === rangeEnd;
            return (
              <button
                key={iso}
                type="button"
                disabled={status !== "free"}
                onClick={() => handlePick(iso)}
                className={`aspect-square rounded-lg text-sm font-semibold transition-colors ${
                  isEndpoint
                    ? "bg-sun text-ink-deep"
                    : inRange
                      ? "bg-sun/40 text-ink-deep"
                      : status === "free"
                        ? "bg-leaf/10 text-ink-deep cursor-pointer hover:bg-leaf/25"
                        : "text-slate-ink/30 cursor-not-allowed"
                }`}
              >
                {Number(iso.slice(8, 10))}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-slate-ink">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-leaf/40" /> Libre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-ink/20" /> Indisponible
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-sky border border-slate-ink/15 p-4 text-sm">
          {rangeStart && rangeEnd ? (
            <>
              <p className="text-ink-deep leading-snug">
                Du <DateReadable iso={rangeStart} /> au <DateReadable iso={rangeEnd} />
              </p>
              {!meetsMin ? (
                <p className="mt-1.5 text-brick-deep">
                  Durée minimale : {minDays} jour{minDays > 1 ? "s" : ""}.
                </p>
              ) : !freeCopy ? (
                <p className="mt-1.5 text-brick-deep">Ce set n&apos;est pas libre sur toute cette période. Essayez d&apos;autres dates.</p>
              ) : (
                <p className="mt-1.5 text-slate-ink">
                  {days} jour{days && days > 1 ? "s" : ""}
                  {total != null ? (
                    <>
                      {" · "}
                      <strong className="text-leaf-deep">{formatCents(total)}</strong>
                    </>
                  ) : null}
                </p>
              )}
            </>
          ) : rangeStart ? (
            <p className="text-slate-ink">
              Départ le <DateReadable iso={rangeStart} />. Choisissez maintenant la date de retour.
            </p>
          ) : (
            <p className="text-slate-ink">Choisissez la date de remise souhaitée.</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-4">
          <button type="button" onClick={onClose} className="font-bold underline underline-offset-4 cursor-pointer">
            Annuler
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => valid && rangeStart && days && onConfirm({ startDate: rangeStart, days })}
            className="btn btn-brick disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Valider ces dates
          </button>
        </div>
      </div>
    </div>
  );
}
