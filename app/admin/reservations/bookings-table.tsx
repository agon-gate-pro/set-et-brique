"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { daysLate } from "@/lib/dates";
import { bookingStatusLabels, formatCents, formatDateShort, formatTime } from "@/lib/format";
import type { BookingStatus } from "@/lib/db/schema";
import { BookingDialog } from "./booking-dialog";

export type BookingRow = {
  id: string;
  reference: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  days: number;
  rentalCents: number;
  pickupTime: string | null;
  setName: string;
  pickupPointName: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  customerBlocked: boolean;
};

type Group = { key: string; title: string; statuses: BookingStatus[] };

/** Même découpage que l'ancien écran en sections, repris ici comme filtres rapides et ordre de tri. */
const groups: Group[] = [
  { key: "pending_review", title: "À traiter", statuses: ["pending_review"] },
  { key: "date_proposed", title: "En attente du client", statuses: ["date_proposed"] },
  { key: "to_handover", title: "À remettre", statuses: ["pending_payment", "confirmed"] },
  { key: "ongoing", title: "En cours de location", statuses: ["picked_up"] },
  { key: "done", title: "Terminées et annulées", statuses: ["returned", "cancelled"] },
];

function groupIndexFor(status: BookingStatus): number {
  const i = groups.findIndex((g) => g.statuses.includes(status));
  return i === -1 ? groups.length : i;
}

export function BookingsTable({ rows, today }: { rows: BookingRow[]; today: string }) {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [statusOpen, setStatusOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of groups) m.set(g.key, rows.filter((r) => g.statuses.includes(r.status)).length);
    return m;
  }, [rows]);

  function toggleGroup(key: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (selectedGroups.size > 0) {
        const g = groups.find((g) => g.statuses.includes(r.status));
        if (!g || !selectedGroups.has(g.key)) return false;
      }
      if (!q) return true;
      const name = `${r.customerFirstName ?? ""} ${r.customerLastName ?? ""}`.toLowerCase();
      return (
        r.reference.toLowerCase().includes(q) ||
        r.setName.toLowerCase().includes(q) ||
        name.includes(q) ||
        (r.customerPhone ?? "").includes(q)
      );
    });
  }, [rows, selectedGroups, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ga = groupIndexFor(a.status);
      const gb = groupIndexFor(b.status);
      if (ga !== gb) return ga - gb;
      if (groups[ga]?.key === "ongoing") return a.endDate.localeCompare(b.endDate);
      return a.startDate.localeCompare(b.startDate);
    });
  }, [filtered]);

  const hasFilters = Boolean(selectedGroups.size > 0 || query);
  const openRow = rows.find((r) => r.id === openId) ?? null;
  const statusLabel =
    selectedGroups.size === 0
      ? "Tous"
      : selectedGroups.size === 1
        ? (groups.find((g) => selectedGroups.has(g.key))?.title ?? "Tous")
        : `${selectedGroups.size} statuts sélectionnés`;

  return (
    <>
      <div className="mt-4 brick-card bg-sky p-4 sm:p-5 flex flex-wrap items-end gap-4">
        <div className="relative block" ref={statusRef}>
          <span className="block font-bold text-ink-deep">Statut</span>
          <button
            type="button"
            onClick={() => setStatusOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={statusOpen}
            className="focus-outline-none mt-1 flex min-w-[13rem] items-center gap-2 rounded-xl border-2 border-slate-ink/25 bg-paper px-3 py-2 text-ink-deep shadow-sm cursor-pointer"
          >
            <span className="flex-1 text-left break-words">{statusLabel}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${statusOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {statusOpen ? (
            <div className="absolute z-10 mt-1 w-64 rounded-xl border-2 border-slate-ink/25 bg-paper p-2 shadow-lg">
              {groups.map((g) => {
                const n = counts.get(g.key) ?? 0;
                return (
                  <label
                    key={g.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sky"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(g.key)}
                      onChange={() => toggleGroup(g.key)}
                      className="h-4 w-4 shrink-0 accent-brick"
                    />
                    <span className="flex-1">{g.title}</span>
                    <span className="text-sm text-slate-ink">{n}</span>
                  </label>
                );
              })}
              {selectedGroups.size > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedGroups(new Set())}
                  className="focus-outline-none mt-1 w-full cursor-pointer text-center text-sm font-bold underline underline-offset-4"
                >
                  Tout désélectionner
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <label className="block flex-1 min-w-[16rem]">
          <span className="block font-bold text-ink-deep">Recherche</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Référence, client, téléphone ou set"
            className="focus-outline-none mt-1 w-full rounded-xl border-2 border-slate-ink/25 bg-paper px-3 py-2 text-ink-deep shadow-sm"
          />
        </label>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setSelectedGroups(new Set());
              setQuery("");
            }}
            className="focus-outline-none font-bold underline underline-offset-4 self-center"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="mt-8 brick-card p-6 bg-sky max-w-xl">
          Aucune réservation {hasFilters ? "ne correspond à ces filtres" : "pour l'instant"}.
        </p>
      ) : (
        <div className="mt-6 brick-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-ink/10 bg-sky text-left">
                <th className="p-2 sm:p-3 font-bold text-ink-deep">Réservation</th>
                <th className="p-2 sm:p-3 font-bold text-ink-deep">Client</th>
                <th className="p-2 sm:p-3 font-bold text-ink-deep hidden sm:table-cell">Période</th>
                <th className="p-2 sm:p-3 font-bold text-ink-deep hidden sm:table-cell">Lieu</th>
                <th className="p-2 sm:p-3 font-bold text-ink-deep">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-ink/10">
              {sorted.map((r) => {
                const late = r.status === "picked_up" ? daysLate(r.endDate, today) : 0;
                const urgent = r.status === "pending_review";
                return (
                  <tr
                    key={r.id}
                    onClick={() => setOpenId(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenId(r.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Voir la réservation ${r.reference}${urgent ? ", à traiter" : ""}`}
                    className={`cursor-pointer border-l-4 ${
                      urgent
                        ? "border-sun-deep bg-sun/20 hover:bg-sun/30 focus:bg-sun/30"
                        : "border-transparent hover:bg-sky/60 focus:bg-sky/60"
                    }`}
                  >
                    <td className="p-2 sm:p-3">
                      <span className="block text-xs font-bold text-slate-ink">{r.reference}</span>
                      <span className="display font-semibold block break-words">{r.setName}</span>
                    </td>
                    <td className="p-2 sm:p-3 text-slate-ink break-words">
                      {r.customerFirstName} {r.customerLastName}
                      {r.customerBlocked ? (
                        <span className="block text-xs font-bold text-brick-deep">compte bloqué</span>
                      ) : null}
                    </td>
                    <td className="p-2 sm:p-3 text-slate-ink hidden sm:table-cell break-words">
                      du {formatDateShort(r.startDate)} au {formatDateShort(r.endDate)}
                      <span className="block text-xs">
                        {r.days} jour{r.days > 1 ? "s" : ""} · {formatCents(r.rentalCents)}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 text-slate-ink hidden sm:table-cell break-words">
                      {r.pickupPointName ?? "à convenir"}
                      <span className="block text-xs">{formatTime(r.pickupTime) ?? "heure à convenir"}</span>
                    </td>
                    <td className="p-2 sm:p-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-md border inline-block whitespace-nowrap ${
                          late > 0
                            ? "border-brick bg-brick text-paper"
                            : urgent
                              ? "border-sun-deep bg-sun text-ink-deep"
                              : "border-slate-ink/15 bg-paper"
                        }`}
                      >
                        {late > 0 ? `Retard ${late} j` : bookingStatusLabels[r.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openRow ? <BookingDialog row={openRow} today={today} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}
