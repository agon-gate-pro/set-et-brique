"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Printer } from "lucide-react";
import { formatCents, formatDateTime, giftVoucherOriginLabels, giftVoucherStatusLabels } from "@/lib/format";
import { giftVoucherDisplayStatus, type GiftVoucherDisplayStatus } from "@/lib/gift-vouchers-core";
import type { GiftVoucher } from "@/lib/db/schema";
import { GiftVoucherCancelButton, GiftVoucherMarkUsedButton } from "./forms";

const statusBadgeClass: Record<GiftVoucherDisplayStatus, string> = {
  valid: "bg-sun",
  used: "bg-green-50 text-leaf-deep",
  expired: "bg-paper",
  cancelled: "bg-red-50 text-brick-deep",
};

const statusOrder: GiftVoucherDisplayStatus[] = ["valid", "used", "expired", "cancelled"];

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
      <div className="mt-8 brick-card bg-sky p-4 sm:p-5 flex flex-wrap items-end gap-4">
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
        <label className="block flex-1 min-w-[16rem]">
          <span className="block font-bold text-ink-deep">Recherche</span>
          <span className="mt-1 relative block">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Code, numéro ou étiquette de lot"
              className="focus-outline-none w-full rounded-xl border-2 border-slate-ink/25 bg-paper px-3 py-2 text-ink-deep shadow-sm"
            />
          </span>
        </label>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setStatus("");
              setOrigin("");
              setQuery("");
            }}
            className="focus-outline-none font-bold underline underline-offset-4 self-center"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

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
        <div className="mt-6 brick-card overflow-x-auto hidden md:block">
          <table className="w-full min-w-[48rem] text-sm table-fixed">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-24" />
              <col className="w-[18%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-32" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-ink/10 bg-sky text-left">
                <th className="py-3 px-2 sm:px-3 font-bold text-ink-deep">Lot</th>
                <th className="py-3 px-2 sm:px-3 font-bold text-ink-deep">Montant</th>
                <th className="py-3 px-2 sm:px-3 font-bold text-ink-deep">Origine</th>
                <th className="py-3 px-2 sm:px-3 font-bold text-ink-deep">Dates</th>
                <th className="py-3 px-2 sm:px-3 font-bold text-ink-deep">État</th>
                <th className="py-3 px-2 sm:px-3" aria-hidden="true" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-ink/15">
              {batches.map(({ batchNumber, items }) => {
                const open = openBatches.has(batchNumber);
                const first = items[0];
                const counts = countByStatus(items);
                return (
                  <Fragment key={batchNumber}>
                    <tr className={open ? "bg-sea/8 hover:bg-sea/15" : "bg-sky/40 hover:bg-sky/60"}>
                      <td className="py-3 px-2 sm:px-3">
                        <button
                          type="button"
                          onClick={() => toggleBatch(batchNumber)}
                          className="focus-outline-none flex items-center gap-2 text-left cursor-pointer"
                          aria-expanded={open}
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-ink" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-ink" aria-hidden="true" />
                          )}
                          <span>
                            <span className="display font-semibold block break-words">{batchNumber}</span>
                            {first.batchLabel ? (
                              <span className="block text-slate-ink text-xs break-words">
                                lot « {first.batchLabel} »
                              </span>
                            ) : null}
                            <span className="block text-slate-ink text-xs">
                              {items.length > 1 ? `${items.length} bons` : "1 bon"}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="py-3 px-2 sm:px-3">{formatCents(first.amountCents)}</td>
                      <td className="py-3 px-2 sm:px-3 text-slate-ink break-words">{giftVoucherOriginLabels[first.origin]}</td>
                      <td className="py-3 px-2 sm:px-3 text-slate-ink text-xs">
                        <span className="block">Créé le {formatDateTime(first.createdAt)}</span>
                        <span className="block">Expire le {formatDateTime(first.expiresAt)}</span>
                      </td>
                      <td className="py-3 px-2 sm:px-3">
                        <StatusCounts counts={counts} />
                      </td>
                      <td className="py-3 px-2 sm:px-3 text-right">
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
                              <td className="py-3 px-2 sm:px-3 pl-10">
                                <span className="display font-semibold font-mono tracking-wide block break-words">
                                  {v.code}
                                </span>
                                {displayStatus === "valid" ? (
                                  <div className="mt-1.5">
                                    <GiftVoucherCancelButton id={v.id} />
                                  </div>
                                ) : null}
                              </td>
                              <td className="py-3 px-2 sm:px-3" colSpan={2} />
                              <td className="py-3 px-2 sm:px-3 text-slate-ink text-xs">
                                {v.usedAt ? <span className="block">Utilisé le {formatDateTime(v.usedAt)}</span> : null}
                                {v.cancelledAt ? (
                                  <span className="block">Annulé le {formatDateTime(v.cancelledAt)}</span>
                                ) : null}
                              </td>
                              <td className="py-3 px-2 sm:px-3">
                                <span
                                  className={`text-xs font-bold px-2 py-1 rounded-md border border-slate-ink/15 inline-block ${statusBadgeClass[displayStatus]}`}
                                >
                                  {giftVoucherStatusLabels[displayStatus]}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-3">
                                <div className="flex w-full items-center justify-end gap-2">
                                  <Link
                                    href={`/admin/bons-cadeaux/${v.id}/imprimer`}
                                    target="_blank"
                                    title="Imprimer ce bon"
                                    aria-label="Imprimer ce bon"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-ink/15 bg-paper text-ink-deep transition-colors hover:bg-sea/15"
                                  >
                                    <Printer className="h-4 w-4" aria-hidden="true" />
                                  </Link>
                                  {displayStatus === "valid" ? <GiftVoucherMarkUsedButton id={v.id} /> : null}
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
