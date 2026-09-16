import type { Metadata } from "next";
import { and, desc, eq, gte, ilike, lt, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  formatCents,
  formatDateTime,
  giftVoucherOriginLabels,
  giftVoucherStatusLabels,
} from "@/lib/format";
import { giftVoucherDisplayStatus, type GiftVoucherDisplayStatus } from "@/lib/gift-vouchers";
import { inputClass } from "@/components/admin/form";
import { GiftVoucherActions, GiftVoucherCreateForm } from "./forms";

export const metadata: Metadata = { title: "Bons cadeaux", robots: { index: false } };
export const dynamic = "force-dynamic";

const statusBadgeClass: Record<GiftVoucherDisplayStatus, string> = {
  valid: "bg-sun",
  used: "bg-slate-200",
  expired: "bg-paper",
  cancelled: "bg-red-50 text-brick-deep",
};

export default async function GiftVouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const origin = typeof params.origin === "string" ? params.origin : "";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const now = new Date();
  const conditions = [];
  if (status === "valid") {
    conditions.push(and(eq(schema.giftVouchers.status, "valid"), gte(schema.giftVouchers.expiresAt, now)));
  } else if (status === "expired") {
    conditions.push(and(eq(schema.giftVouchers.status, "valid"), lt(schema.giftVouchers.expiresAt, now)));
  } else if (status === "used" || status === "cancelled") {
    conditions.push(eq(schema.giftVouchers.status, status));
  }
  if (origin === "admin" || origin === "purchase") {
    conditions.push(eq(schema.giftVouchers.origin, origin));
  }
  if (q) {
    const like = `%${q}%`;
    conditions.push(or(ilike(schema.giftVouchers.code, like), ilike(schema.giftVouchers.batchLabel, like)));
  }

  const vouchers = await db
    .select()
    .from(schema.giftVouchers)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.giftVouchers.createdAt));

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Bons cadeaux</h1>
      <p className="mt-3 text-slate-ink max-w-xl">
        Créez des bons à l&apos;unité ou en lot (même montant pour tout le lot), et suivez leur
        état. Un bon acheté en ligne apparaîtra ici une fois le paiement en place sur le site.
      </p>

      <section className="mt-8 brick-card p-5 bg-sky">
        <h2 className="text-2xl font-semibold">Nouveau bon</h2>
        <GiftVoucherCreateForm />
      </section>

      <form method="get" className="mt-10 grid gap-4 sm:grid-cols-[10rem_14rem_1fr_auto] items-end">
        <label className="block">
          <span className="block font-bold text-ink-deep">État</span>
          <select name="status" defaultValue={status} className={`mt-1 ${inputClass}`}>
            <option value="">Tous</option>
            <option value="valid">Valide</option>
            <option value="used">Utilisé</option>
            <option value="expired">Expiré</option>
            <option value="cancelled">Annulé</option>
          </select>
        </label>
        <label className="block">
          <span className="block font-bold text-ink-deep">Origine</span>
          <select name="origin" defaultValue={origin} className={`mt-1 ${inputClass}`}>
            <option value="">Toutes</option>
            <option value="admin">Émis par Set et Brique</option>
            <option value="purchase">Acheté en ligne</option>
          </select>
        </label>
        <label className="block">
          <span className="block font-bold text-ink-deep">Recherche</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Code ou étiquette de lot"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <div className="flex gap-3">
          <button type="submit" className="btn btn-paper">Filtrer</button>
          {status || origin || q ? (
            <a href="/admin/bons-cadeaux" className="font-bold underline underline-offset-4 self-center">
              Réinitialiser
            </a>
          ) : null}
        </div>
      </form>

      {vouchers.length === 0 ? (
        <p className="mt-8 brick-card p-6 bg-sky max-w-xl">
          Aucun bon cadeau {status || origin || q ? "ne correspond à ces filtres" : "pour l'instant"}.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {vouchers.map((v) => {
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
                <GiftVoucherActions
                  id={v.id}
                  canMarkUsed={displayStatus === "valid"}
                  canCancel={displayStatus === "valid"}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
