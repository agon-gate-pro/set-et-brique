"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatCents, formatSetNumbers, setStatusLabels } from "@/lib/format";

export type SetRow = {
  id: string;
  name: string;
  brand: string;
  setNumbers: string[];
  theme: string | null;
  status: "draft" | "published" | "archived";
  depositCents: number;
  planName: string | null;
  pricePerDay: number | null;
  copies: number;
  cover: string | null;
};

type StatusFilter = "" | SetRow["status"];

export function SetsTable({ rows }: { rows: SetRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [theme, setTheme] = useState("");

  const themes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.theme).filter((t): t is string => Boolean(t)))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((s) => {
      if (status && s.status !== status) return false;
      if (theme && s.theme !== theme) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.setNumbers.some((n) => n.toLowerCase().includes(q));
    });
  }, [rows, query, status, theme]);

  const hasFilters = Boolean(query || status || theme);

  return (
    <>
      <div className="mt-4 brick-card bg-sky p-4 sm:p-5 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block font-bold text-ink-deep">Statut</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="focus-outline-none mt-1 rounded-xl border-2 border-slate-ink/25 bg-paper px-3 py-2 text-ink-deep shadow-sm"
          >
            <option value="">Tous</option>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="archived">Archivé</option>
          </select>
        </label>
        <label className="block">
          <span className="block font-bold text-ink-deep">Thème</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="focus-outline-none mt-1 rounded-xl border-2 border-slate-ink/25 bg-paper px-3 py-2 text-ink-deep shadow-sm"
          >
            <option value="">Tous</option>
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block flex-1 min-w-[16rem]">
          <span className="block font-bold text-ink-deep">Recherche</span>
          <span className="mt-1 relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-ink" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom ou numéro de set"
              className="focus-outline-none w-full rounded-xl border-2 border-slate-ink/25 bg-paper pl-9 pr-3 py-2 text-ink-deep shadow-sm"
            />
          </span>
        </label>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatus("");
              setTheme("");
            }}
            className="focus-outline-none font-bold underline underline-offset-4 self-center"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 brick-card p-6 bg-sky max-w-xl">
          {hasFilters
            ? "Aucun set ne correspond à ces filtres."
            : "Aucun set pour l'instant. Ajoutez votre premier set : nom, caution, forfait, puis ses photos et ses exemplaires."}
        </p>
      ) : (
        <div className="mt-6 brick-card overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm table-fixed">
            <colgroup>
              <col className="w-14" />
              <col className="w-[24%]" />
              <col className="w-[14%]" />
              <col className="w-20" />
              <col className="w-[20%]" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-ink/10 bg-sky text-left">
                <th className="p-2 sm:p-3" aria-hidden="true" />
                <th className="p-2 sm:p-3 font-bold text-ink-deep">Set</th>
                <th className="p-2 sm:p-3 font-bold text-ink-deep">Thème</th>
                <th className="p-2 sm:p-3 font-bold text-ink-deep">Exempl.</th>
                <th className="p-2 sm:p-3 font-bold text-ink-deep">Tarif</th>
                <th className="p-2 sm:p-3 font-bold text-ink-deep">Caution</th>
                <th className="p-2 sm:p-3 font-bold text-ink-deep">Statut</th>
                <th className="p-2 sm:p-3" aria-hidden="true" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-ink/10">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-sky/60">
                  <td className="p-2 sm:p-3">
                    <span className="block h-10 w-10 rounded-lg bg-sky border border-slate-ink/15 overflow-hidden relative">
                      {s.cover ? <Image src={s.cover} alt="" fill sizes="40px" className="object-cover" /> : null}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3">
                    <span className="display font-semibold block break-words">{s.name}</span>
                    {s.setNumbers.length > 0 ? (
                      <span className="block text-slate-ink text-xs">n° {formatSetNumbers(s.setNumbers)}</span>
                    ) : null}
                    {s.brand !== "LEGO" ? (
                      <span className="mt-1 inline-block text-xs font-bold px-2 py-0.5 rounded-md bg-sky border border-slate-ink/15">{s.brand}</span>
                    ) : null}
                  </td>
                  <td className="p-2 sm:p-3 text-slate-ink break-words">{s.theme ?? "—"}</td>
                  <td className="p-2 sm:p-3">{s.copies}</td>
                  <td className="p-2 sm:p-3 text-slate-ink break-words">
                    {s.planName ?? "forfait par défaut"}
                    {s.pricePerDay != null ? ` (${formatCents(s.pricePerDay)}/jour)` : ""}
                  </td>
                  <td className="p-2 sm:p-3 break-words">{formatCents(s.depositCents)}</td>
                  <td className="p-2 sm:p-3">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-md border border-slate-ink/15 inline-block ${
                        s.status === "published" ? "bg-sun" : s.status === "archived" ? "bg-slate-200" : "bg-paper"
                      }`}
                    >
                      {setStatusLabels[s.status]}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3 text-right">
                    <Link href={`/admin/sets/${s.id}`} className="font-bold text-brick hover:underline underline-offset-4">
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
