"use client";

import { useMemo, useState } from "react";
import { inputClass } from "@/components/admin/form";
import { formatCents, formatDateTime, giftVoucherOriginLabels, giftVoucherStatusLabels } from "@/lib/format";
import { giftVoucherDisplayStatus, type GiftVoucherDisplayStatus } from "@/lib/gift-vouchers-core";
import type { GiftVoucher } from "@/lib/db/schema";
import { GiftVoucherActions } from "./forms";

const statusBadgeClass: Record<GiftVoucherDisplayStatus, string> = {
  valid: "bg-sun",
  used: "bg-slate-200",
  expired: "bg-paper",
  cancelled: "bg-red-50 text-brick-deep",
};

export function VouchersList({ vouchers }: { vouchers: GiftVoucher[] }) {
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vouchers.filter((v) => {
      const displayStatus = giftVoucherDisplayStatus(v);
      if (status && displayStatus !== status) return false;
      if (origin && v.origin !== origin) return false;
      if (!q) return true;
      return v.code.toLowerCase().includes(q) || (v.batchLabel ?? "").toLowerCase().includes(q);
    });
  }, [vouchers, status, origin, query]);

  const hasFilters = Boolean(status || origin || query);

  return (
    <>
      <div className="mt-10 brick-card bg-sky p-4 sm:p-5 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block font-bold text-ink-deep">État</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`mt-1 ${inputClass}`}>
            <option value="">Tous</option>
            <option value="valid">Valide</option>
            <option value="used">Utilisé</option>
            <option value="expired">Expiré</option>
            <option value="cancelled">Annulé</option>
          </select>
        </label>
        <label className="block">
          <span className="block font-bold text-ink-deep">Origine</span>
          <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={`mt-1 ${inputClass}`}>
            <option value="">Toutes</option>
            <option value="admin">Émis par Set et Brique</option>
            <option value="purchase">Acheté en ligne</option>
          </select>
        </label>
        <label className="block flex-1 min-w-[16rem]">
          <span className="block font-bold text-ink-deep">Recherche</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Code ou étiquette de lot"
            className={`mt-1 ${inputClass}`}
          />
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

      {filtered.length === 0 ? (
        <p className="mt-8 brick-card p-6 bg-sky max-w-xl">
          Aucun bon cadeau {hasFilters ? "ne correspond à ces filtres" : "pour l'instant"}.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {filtered.map((v) => {
            const displayStatus = giftVoucherDisplayStatus(v);
            return (
              <li key={v.id} className="brick-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="display text-xl font-semibold font-mono tracking-wide">{v.code}</p>
                  <span className={`text-sm font-bold px-2 py-1 border-2 border-ink ${statusBadgeClass[displayStatus]}`}>
                    {giftVoucherStatusLabels[displayStatus]}
                  </span>
                </div>
                <p className="mt-1 text-slate-ink">
                  {formatCents(v.amountCents)} · {giftVoucherOriginLabels[v.origin]}
                  {v.batchLabel ? ` · lot « ${v.batchLabel} »` : ""}
                </p>
                {v.note ? <p className="mt-1 text-slate-ink italic">{v.note}</p> : null}
                <p className="mt-1 text-sm text-slate-ink">
                  Créé le {formatDateTime(v.createdAt)} · expire le {formatDateTime(v.expiresAt)}
                  {v.usedAt ? ` · utilisé le ${formatDateTime(v.usedAt)}` : ""}
                  {v.cancelledAt ? ` · annulé le ${formatDateTime(v.cancelledAt)}` : ""}
                </p>
                <GiftVoucherActions id={v.id} canMarkUsed={displayStatus === "valid"} canCancel={displayStatus === "valid"} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
