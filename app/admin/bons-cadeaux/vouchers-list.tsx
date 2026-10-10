"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Printer } from "lucide-react";
import { formatCents, formatDateTime, giftVoucherOriginLabels, giftVoucherStatusLabels } from "@/lib/format";
import { giftVoucherDisplayStatus, type GiftVoucherDisplayStatus } from "@/lib/gift-vouchers-core";
import type { GiftVoucher } from "@/lib/db/schema";
import { FilterBar } from "@/components/admin/filter-bar";
import { GiftVoucherCancelButton, GiftVoucherMarkUsedButton } from "./forms";

const statusBadgeClass: Record<GiftVoucherDisplayStatus, string> = {
  valid: "bg-sun",
  used: "bg-green-50 text-leaf-deep",
  expired: "bg-paper",
  cancelled: "bg-red-50 text-brick-deep",
};

const statusOrder: GiftVoucherDisplayStatus[] = ["valid", "used", "expired", "cancelled"];

/** Origine en version courte pour la colonne du tableau, dont l'en-tête dit déjà « Origine ». */
const originShortLabels: Record<GiftVoucher["origin"], string> = { purchase: "Achat en ligne", admin: "Set et Brique" };

function countByStatus(items: GiftVoucher[]) {
  const counts = new Map<GiftVoucherDisplayStatus, number>();
  for (const v of items) {
    const s = giftVoucherDisplayStatus(v);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return counts;
}

/** Pastilles « 3 valides », « 1 utilisé »… d'un lot, partagées par le tableau et les cartes. */
function StatusCounts({ counts, className = "" }: { counts: Map<GiftVoucherDisplayStatus, number>; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {statusOrder
        .filter((s) => counts.has(s))
        .map((s) => (
          <span
            key={s}
            className={`text-xs font-bold px-2 py-1 rounded-md border border-slate-ink/15 inline-block whitespace-nowrap ${statusBadgeClass[s]}`}
          >
            {counts.get(s)} {giftVoucherStatusLabels[s].toLowerCase()}
            {counts.get(s)! > 1 ? "s" : ""}
          </span>
        ))}
    </div>
  );
}

export function VouchersList({ vouchers }: { vouchers: GiftVoucher[] }) {
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [query, setQuery] = useState("");
  const [openBatches, setOpenBatches] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vouchers.filter((v) => {
      const displayStatus = giftVoucherDisplayStatus(v);
      if (status && displayStatus !== status) return false;
      if (origin && v.origin !== origin) return false;
      if (!q) return true;
      return (
        v.code.toLowerCase().includes(q) ||
        v.batchNumber.toLowerCase().includes(q) ||
        (v.batchLabel ?? "").toLowerCase().includes(q)
      );
    });
  }, [vouchers, status, origin, query]);

  const batches = useMemo(() => {
    const map = new Map<string, GiftVoucher[]>();
    for (const v of filtered) {
      const group = map.get(v.batchNumber);
      if (group) group.push(v);
      else map.set(v.batchNumber, [v]);
    }
    return Array.from(map.entries()).map(([batchNumber, items]) => ({ batchNumber, items }));
  }, [filtered]);

  const hasFilters = Boolean(status || origin || query);

  function toggleBatch(batchNumber: string) {
    setOpenBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchNumber)) next.delete(batchNumber);
      else next.add(batchNumber);
      return next;
    });
  }

  return (
    <>
      <FilterBar
        className="mt-8"
        query={query}
        onQueryChange={setQuery}
        placeholder="Code, numéro ou étiquette de lot"
        activeCount={(status ? 1 : 0) + (origin ? 1 : 0)}
        hasFilters={hasFilters}
        onReset={() => {
          setStatus("");
          setOrigin("");
          setQuery("");
        }}
        resultCount={batches.length}
      >
        <label className="block">
          <span className="block font-bold text-ink-deep">État</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="focus-outline-none mt-1 rounded-xl border-2 border-slate-ink/25 bg-paper px-3 py-2 text-ink-deep shadow-sm"
          >
            <option value="">Tous</option>
            <option value="valid">Valide</option>
            <option value="used">Utilisé</option>
            <option value="expired">Expiré</option>
            <option value="cancelled">Annulé</option>
          </select>
        </label>
        <label className="block">
          <span className="block font-bold text-ink-deep">Origine</span>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="focus-outline-none mt-1 rounded-xl border-2 border-slate-ink/25 bg-paper px-3 py-2 text-ink-deep shadow-sm"
          >
            <option value="">Toutes</option>
            <option value="admin">Émis par Set et Brique</option>
            <option value="purchase">Acheté en ligne</option>
          </select>
        </label>
      </FilterBar>

      {batches.length === 0 ? (
        <p className="mt-8 brick-card p-6 bg-sky max-w-xl">
          Aucun bon cadeau {hasFilters ? "ne correspond à ces filtres" : "pour l'instant"}.
        </p>
      ) : (
        <>
        {/* Téléphone : une carte par lot, repliée par défaut ; dépliée, un bloc par bon avec ses actions. */}
        <ul className="mt-6 space-y-3 md:hidden">
          {batches.map(({ batchNumber, items }) => {
            const open = openBatches.has(batchNumber);
            const first = items[0];
            const counts = countByStatus(items);
            return (
              <li key={batchNumber} className={`brick-card overflow-hidden ${open ? "bg-sea/5" : ""}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="display font-semibold text-lg break-words text-ink-deep">{batchNumber}</span>
                    <span className="display shrink-0 font-bold text-lg text-ink-deep">{formatCents(first.amountCents)}</span>
                  </div>
                  <p className="text-sm text-slate-ink break-words">
                    {first.batchLabel ? `« ${first.batchLabel} » · ` : ""}
                    {items.length > 1 ? `${items.length} bons` : "1 bon"}
                  </p>
                  <p className="text-sm text-slate-ink">{giftVoucherOriginLabels[first.origin]}</p>
                  <StatusCounts counts={counts} className="mt-2" />
                  <p className="mt-2 text-xs text-slate-ink">Expire le {formatDateTime(first.expiresAt)}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    {counts.get("valid") ? (
                      <Link
                        href={`/admin/bons-cadeaux/lot/${batchNumber}/imprimer`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-ink/15 bg-paper px-3 py-1.5 text-sm font-bold text-ink-deep transition-colors hover:bg-sea/15"
                      >
                        <Printer className="h-4 w-4" aria-hidden="true" /> Imprimer le lot
                      </Link>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => toggleBatch(batchNumber)}
                      aria-expanded={open}
                      className="inline-flex items-center gap-1 text-sm font-bold text-ink-deep underline underline-offset-4 cursor-pointer"
                    >
                      {open ? "Masquer les bons" : "Voir les bons"}
                      <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {open ? (
                  <ul className="divide-y divide-slate-ink/10 border-t border-slate-ink/10 bg-paper">
                    {items.map((v) => {
                      const displayStatus = giftVoucherDisplayStatus(v);
                      return (
                        <li key={v.id} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="display font-semibold font-mono tracking-wide break-all">{v.code}</span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span
                                className={`text-xs font-bold px-2 py-1 rounded-md border border-slate-ink/15 ${statusBadgeClass[displayStatus]}`}
                              >
                                {giftVoucherStatusLabels[displayStatus]}
                              </span>
                              <Link
                                href={`/admin/bons-cadeaux/${v.id}/imprimer`}
                                target="_blank"
                                title="Imprimer ce bon"
                                aria-label="Imprimer ce bon"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-ink/15 bg-paper text-ink-deep transition-colors hover:bg-sea/15"
                              >
                                <Printer className="h-4 w-4" aria-hidden="true" />
                              </Link>
                            </span>
                          </div>
                          {v.usedAt ? <p className="mt-1 text-xs text-slate-ink">Utilisé le {formatDateTime(v.usedAt)}</p> : null}
                          {v.cancelledAt ? <p className="mt-1 text-xs text-slate-ink">Annulé le {formatDateTime(v.cancelledAt)}</p> : null}
                          {displayStatus === "valid" ? (
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                              <GiftVoucherMarkUsedButton id={v.id} />
                              <GiftVoucherCancelButton id={v.id} />
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
        {/* Grand écran : une seule ligne par lot et par bon (10 octobre 2026). Le texte d'un lot est tronqué
            plutôt que renvoyé à la ligne, le libellé complet et la date de création restant en info-bulle ; les bons d'un lot ouvert
            ont leur propre ligne en largeur pleine, libre des colonnes du lot. */}
        <div className="mt-6 brick-card overflow-x-auto hidden md:block">
          <table className="w-full min-w-[48rem] text-sm table-fixed">
            <colgroup>
              <col />
              <col className="w-[4.5rem]" />
              <col className="w-[6.5rem]" />
              <col className="w-28" />
              <col className="w-[12.5rem]" />
              <col className="w-[3.25rem]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-ink/10 bg-sky text-left">
                <th className="py-3 px-2 font-bold text-ink-deep">Lot</th>
                <th className="py-3 px-2 font-bold text-ink-deep">Montant</th>
                <th className="py-3 px-2 font-bold text-ink-deep">Origine</th>
                <th className="py-3 px-2 font-bold text-ink-deep">Expiration</th>
                <th className="py-3 px-2 font-bold text-ink-deep">État</th>
                <th className="py-3 px-2" aria-hidden="true" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-ink/15">
              {batches.map(({ batchNumber, items }) => {
                const open = openBatches.has(batchNumber);
                const first = items[0];
                const counts = countByStatus(items);
                const countLabel = items.length > 1 ? `${items.length} bons` : "1 bon";
                return (
                  <Fragment key={batchNumber}>
                    <tr className={open ? "bg-sea/8 hover:bg-sea/15" : "bg-sky/40 hover:bg-sky/60"}>
                      <td className="py-2 px-2">
                        <button
                          type="button"
                          onClick={() => toggleBatch(batchNumber)}
                          title={`${batchNumber} · ${countLabel}${first.batchLabel ? ` · ${first.batchLabel}` : ""}`}
                          className="focus-outline-none flex w-full min-w-0 items-center gap-2 text-left cursor-pointer"
                          aria-expanded={open}
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-ink" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-ink" aria-hidden="true" />
                          )}
                          <span className="display shrink-0 font-semibold whitespace-nowrap">{batchNumber}</span>
                          {/* Le nom du lot s'il en a un, sinon le nombre de bons : les pastilles d'état donnent déjà le compte. */}
                          <span className="min-w-0 truncate text-xs text-slate-ink">{first.batchLabel || countLabel}</span>
                        </button>
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">{formatCents(first.amountCents)}</td>
                      <td className="py-2 px-2 text-slate-ink truncate" title={giftVoucherOriginLabels[first.origin]}>
                        {originShortLabels[first.origin]}
                      </td>
                      <td
                        className="py-2 px-2 text-slate-ink text-xs whitespace-nowrap"
                        title={`Créé le ${formatDateTime(first.createdAt)}, expire le ${formatDateTime(first.expiresAt)}`}
                      >
                        {formatDateTime(first.expiresAt)}
                      </td>
                      <td className="py-2 px-2">
                        <StatusCounts counts={counts} className="!flex-nowrap" />
                      </td>
                      <td className="py-2 px-2 text-right">
                        {counts.get("valid") ? (
                          <Link
                            href={`/admin/bons-cadeaux/lot/${batchNumber}/imprimer`}
                            target="_blank"
                            title="Imprimer les bons valides du lot"
                            aria-label="Imprimer les bons valides du lot"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-ink/15 bg-paper text-ink-deep transition-colors hover:bg-sea/15"
                          >
                            <Printer className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                    {open
                      ? items.map((v, i) => {
                          const displayStatus = giftVoucherDisplayStatus(v);
                          return (
                            <tr key={v.id} className={i % 2 === 0 ? "bg-paper hover:bg-sky/40" : "bg-sky/20 hover:bg-sky/40"}>
                              <td colSpan={6} className="py-1.5 pr-2 pl-10">
                                <div className="flex items-center gap-3">
                                  <span className="display w-32 shrink-0 font-semibold font-mono tracking-wide whitespace-nowrap">
                                    {v.code}
                                  </span>
                                  {/* Annulation à gauche, à l'écart des actions positives de droite. */}
                                  <span className="min-w-0 flex-1">
                                    {displayStatus === "valid" ? <GiftVoucherCancelButton id={v.id} /> : null}
                                  </span>
                                  {/* Largeur des colonnes « État » et impression du lot, marges déduites : la pastille du bon
                                      tombe sous celles du lot, la date à sa droite, l'impression sous celle du lot. */}
                                  <div className="flex w-[14.75rem] shrink-0 items-center gap-2">
                                    <span
                                      className={`shrink-0 text-xs font-bold px-2 py-1 rounded-md border border-slate-ink/15 whitespace-nowrap ${statusBadgeClass[displayStatus]}`}
                                    >
                                      {giftVoucherStatusLabels[displayStatus]}
                                    </span>
                                    {displayStatus === "valid" ? (
                                      <span className="min-w-0 flex-1">
                                        <GiftVoucherMarkUsedButton id={v.id} />
                                      </span>
                                    ) : (
                                      <span className="min-w-0 flex-1 truncate text-xs text-slate-ink">
                                        {v.usedAt ? `le ${formatDateTime(v.usedAt)}` : ""}
                                        {v.cancelledAt ? `le ${formatDateTime(v.cancelledAt)}` : ""}
                                      </span>
                                    )}
                                    <Link
                                      href={`/admin/bons-cadeaux/${v.id}/imprimer`}
                                      target="_blank"
                                      title="Imprimer ce bon"
                                      aria-label="Imprimer ce bon"
                                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-ink/15 bg-paper text-ink-deep transition-colors hover:bg-sea/15"
                                    >
                                      <Printer className="h-4 w-4" aria-hidden="true" />
                                    </Link>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </>
  );
}
