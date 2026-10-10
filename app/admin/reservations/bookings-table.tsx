"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, MapPin } from "lucide-react";
import { daysLate } from "@/lib/dates";
import { bookingStatusLabels, formatCents, formatDateRangeShort, formatDateShort, formatTime } from "@/lib/format";
import { neutralBadge, statusTone } from "./status-tone";
import type { BookingStatus } from "@/lib/db/schema";
import { BookingDialog } from "./booking-dialog";
import { FilterBar } from "@/components/admin/filter-bar";

export type BookingRow = {
  id: string;
  reference: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  days: number;
  rentalCents: number;
  /** Option « rendre le set monté » choisie, prix figé ; null = non choisie. */
  disassemblyCents: number | null;
  pickupTime: string | null;
  setName: string;
  pickupPointId: string | null;
  pickupPointName: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  customerBlocked: boolean;
  /** Demande de prolongation en cours sur cette location : à traiter, ou acceptée et à payer. */
  extension: "pending_review" | "pending_payment" | null;
};

type Group = { key: string; title: string; statuses: BookingStatus[] };

/** Même découpage que l'ancien écran en sections, repris ici comme filtres rapides. */
const groups: Group[] = [
  { key: "pending_review", title: "À traiter", statuses: ["pending_review"] },
  { key: "date_proposed", title: "En attente du client", statuses: ["date_proposed"] },
  // Paiement en attente et « à remettre » séparés (10 octobre 2026) : un set non payé n'est pas encore à remettre.
  { key: "pending_payment", title: "Paiement en attente", statuses: ["pending_payment"] },
  { key: "to_handover", title: "À remettre", statuses: ["confirmed"] },
  { key: "ongoing", title: "En cours de location", statuses: ["picked_up"] },
  { key: "done", title: "Terminées et annulées", statuses: ["returned", "cancelled"] },
];

/**
 * Groupes d'une ligne : celui de son statut, plus « À traiter » quand une prolongation attend une
 * réponse (la location est en cours, mais les gérants ont une décision à prendre).
 */
function groupKeysOf(r: BookingRow): string[] {
  const keys = groups.filter((g) => g.statuses.includes(r.status)).map((g) => g.key);
  if (r.extension === "pending_review" && !keys.includes("pending_review")) keys.push("pending_review");
  return keys;
}

/**
 * Couleur et libellé d'une ligne : une prolongation en cours prime sur « En location » (jaune à
 * traiter, orange à payer), le retard prime sur tout pour la pastille.
 */
function displayOf(r: BookingRow, late: number) {
  const tone = statusTone(r.extension ?? r.status);
  const label =
    late > 0
      ? `Retard ${late} j`
      : r.extension === "pending_review"
        ? "Prolongation demandée"
        : r.extension === "pending_payment"
          ? "Prolongation à payer"
          : bookingStatusLabels[r.status];
  return { row: tone?.row, badge: late > 0 ? "border-brick bg-brick text-paper" : (tone?.badge ?? neutralBadge), label };
}

/** Statuts « à venir » (remise pas encore faite), présélectionnés par le lien d'un lieu de remise. */
export const UPCOMING_GROUP_KEYS = ["pending_review", "date_proposed", "pending_payment", "to_handover"];

export function BookingsTable({
  rows,
  today,
  pickupPoints,
  initialPickupPointId = "",
  initialGroups = [],
}: {
  rows: BookingRow[];
  today: string;
  /** Lieux proposés dans le filtre, dans l'ordre de la page Lieux de remise. */
  pickupPoints: { id: string; name: string }[];
  /** Filtres de départ, ex. depuis le lien « N réservations à venir » d'un lieu (`?lieu=`). */
  initialPickupPointId?: string;
  initialGroups?: string[];
}) {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    () => new Set(initialGroups.filter((k) => groups.some((g) => g.key === k))),
  );
  const [pickupPointId, setPickupPointId] = useState(initialPickupPointId);
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

  // Lieu filtré d'abord : les compteurs du menu Statut portent sur ce lieu.
  const placeRows = useMemo(
    () => (pickupPointId ? rows.filter((r) => r.pickupPointId === pickupPointId) : rows),
    [rows, pickupPointId],
  );

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of groups) m.set(g.key, placeRows.filter((r) => groupKeysOf(r).includes(g.key)).length);
    return m;
  }, [placeRows]);

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
    return placeRows.filter((r) => {
      if (selectedGroups.size > 0) {
        if (!groupKeysOf(r).some((key) => selectedGroups.has(key))) return false;
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
  }, [placeRows, selectedGroups, query]);

  const sorted = useMemo(() => {
    // Par date de remise, la plus récente en haut, tous statuts confondus ; à date égale, l'heure la plus tardive d'abord.
    return [...filtered].sort(
      (a, b) => b.startDate.localeCompare(a.startDate) || (b.pickupTime ?? "").localeCompare(a.pickupTime ?? ""),
    );
  }, [filtered]);

  const hasFilters = Boolean(selectedGroups.size > 0 || query || pickupPointId);
  const openRow = rows.find((r) => r.id === openId) ?? null;
  const statusLabel =
    selectedGroups.size === 0
      ? "Tous"
      : selectedGroups.size === 1
        ? (groups.find((g) => selectedGroups.has(g.key))?.title ?? "Tous")
        : `${selectedGroups.size} statuts sélectionnés`;

  return (
    <>
      <FilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Référence, client, téléphone ou set"
        activeCount={(selectedGroups.size > 0 ? 1 : 0) + (pickupPointId ? 1 : 0)}
        hasFilters={hasFilters}
        onReset={() => {
          setSelectedGroups(new Set());
          setQuery("");
          setPickupPointId("");
        }}
        resultCount={sorted.length}
        // Depuis un lieu : bloc déplié pour montrer pourquoi la liste est réduite. Depuis une carte du
        // tableau de bord (`?statut=`) : replié, le bouton jaune « Filtres (1) » suffit.
        defaultOpen={Boolean(initialPickupPointId)}
      >
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
        <label className="block">
          <span className="block font-bold text-ink-deep">Lieu</span>
          <select
            value={pickupPointId}
            onChange={(e) => setPickupPointId(e.target.value)}
            className="focus-outline-none mt-1 block min-w-[13rem] max-w-[18rem] rounded-xl border-2 border-slate-ink/25 bg-paper px-3 py-2 text-ink-deep shadow-sm cursor-pointer"
          >
            <option value="">Tous les lieux</option>
            {pickupPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      {sorted.length === 0 ? (
        <p className="mt-8 brick-card p-6 bg-sky max-w-xl">
          Aucune réservation {hasFilters ? "ne correspond à ces filtres" : "pour l'instant"}.
        </p>
      ) : (
        <>
        {/* Téléphone : une carte par réservation, le tableau ne garde pas la période ni le lieu à cette largeur. */}
        <ul className="mt-6 space-y-3 md:hidden">
          {sorted.map((r) => {
            const late = r.status === "picked_up" ? daysLate(r.endDate, today) : 0;
            const display = displayOf(r, late);
            const urgent = r.status === "pending_review" || r.extension === "pending_review";
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  aria-label={`Voir la réservation ${r.reference}${urgent ? ", à traiter" : ""}`}
                  className={`brick-card w-full text-left p-4 border-l-4 cursor-pointer ${display.row ?? "border-l-slate-ink/15 hover:bg-sky/60"}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold text-slate-ink">{r.reference}</span>
                    <span
                      className={`shrink-0 text-xs font-bold px-2 py-1 rounded-md border whitespace-nowrap ${display.badge}`}
                    >
                      {display.label}
                    </span>
                  </span>
                  <span className="mt-1 display font-semibold text-lg leading-snug block break-words text-ink-deep">{r.setName}</span>
                  <span className="mt-0.5 block text-ink-deep break-words">
                    {r.customerFirstName} {r.customerLastName}
                    {r.customerBlocked ? <span className="ml-2 text-xs font-bold text-brick-deep">compte bloqué</span> : null}
                  </span>
                  <span className="mt-2 flex items-start gap-2 text-sm text-slate-ink">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {formatDateRangeShort(r.startDate, r.endDate)} · {r.days} jour{r.days > 1 ? "s" : ""} ·{" "}
                      {formatCents(r.rentalCents)}
                      {r.disassemblyCents != null ? ` + ${formatCents(r.disassemblyCents)} rendu monté` : ""}
                    </span>
                  </span>
                  <span className="mt-1 flex items-start gap-2 text-sm text-slate-ink">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {r.pickupPointName ?? "Lieu à convenir"} · {formatTime(r.pickupTime) ?? "heure à convenir"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 brick-card overflow-x-auto hidden md:block">
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
                const urgent = r.status === "pending_review" || r.extension === "pending_review";
                const display = displayOf(r, late);
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
                      display.row ?? "border-transparent hover:bg-sky/60 focus:bg-sky/60"
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
                        {r.disassemblyCents != null ? ` + ${formatCents(r.disassemblyCents)} rendu monté` : ""}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 text-slate-ink hidden sm:table-cell break-words">
                      {r.pickupPointName ?? "à convenir"}
                      <span className="block text-xs">{formatTime(r.pickupTime) ?? "heure à convenir"}</span>
                    </td>
                    <td className="p-2 sm:p-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-md border inline-block whitespace-nowrap ${display.badge}`}
                      >
                        {display.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {openRow ? <BookingDialog row={openRow} today={today} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}
