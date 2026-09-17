import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { asc, desc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { formatCents, formatSetNumbers, setStatusLabels } from "@/lib/format";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Sets", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SetsPage() {
  await requireRole("admin");
  const rows = await db
    .select({
      id: schema.sets.id,
      name: schema.sets.name,
      brand: schema.sets.brand,
      setNumbers: schema.sets.setNumbers,
      theme: schema.sets.theme,
      status: schema.sets.status,
      depositCents: schema.sets.depositCents,
      planName: sql<string | null>`(select name from ${schema.ratePlans} rp where rp.id = ${schema.sets}.rate_plan_id)`,
      pricePerDay: sql<number | null>`coalesce((select price_cents_per_day from ${schema.ratePlans} rp where rp.id = ${schema.sets}.rate_plan_id), (select price_cents_per_day from ${schema.ratePlans} rp where rp.is_default limit 1))`,
      copies: sql<number>`(select count(*)::int from ${schema.setCopies} c where c.set_id = ${schema.sets}.id)`,
      cover: sql<string | null>`(select url from ${schema.setImages} i where i.set_id = ${schema.sets}.id order by i.sort_order asc, i.created_at asc limit 1)`,
    })
    .from(schema.sets)
    .orderBy(asc(schema.sets.status), asc(schema.sets.sortOrder), desc(schema.sets.createdAt));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold">Sets</h1>
        <Link href="/admin/sets/nouveau" className="btn btn-brick">
          Ajouter un set
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 brick-card p-6 bg-sky max-w-xl">
          Aucun set pour l&apos;instant. Ajoutez votre premier set : nom, caution,
          forfait, puis ses photos et ses exemplaires.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/sets/${s.id}`}
                className="brick-card p-4 grid gap-4 grid-cols-[5rem_1fr] sm:grid-cols-[5rem_1fr_auto] items-center hover:bg-sky"
              >
                <span className="block h-20 w-20 rounded-xl bg-sky border border-slate-ink/15 overflow-hidden relative">
                  {s.cover ? (
                    <Image src={s.cover} alt="" fill sizes="80px" className="object-cover" />
                  ) : null}
                </span>
                <span>
                  <span className="display text-xl font-semibold block">
                    {s.name}
                    {s.setNumbers.length > 0 ? (
                      <span className="ml-2 text-slate-ink font-normal text-base">n° {formatSetNumbers(s.setNumbers)}</span>
                    ) : null}
                    {s.brand !== "LEGO" ? (
                      <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-md bg-sky border border-slate-ink/15 align-middle">{s.brand}</span>
                    ) : null}
                  </span>
                  <span className="block text-slate-ink text-sm">
                    {s.theme ? `${s.theme} · ` : ""}
                    {s.copies} exemplaire{s.copies > 1 ? "s" : ""} · {s.planName ?? "forfait par défaut"}
                    {s.pricePerDay != null ? ` (${formatCents(s.pricePerDay)}/jour)` : ""} · caution {formatCents(s.depositCents)}
                  </span>
                </span>
                <span
                  className={`justify-self-start sm:justify-self-end text-sm font-bold px-2 py-1 rounded-md border border-slate-ink/15 ${
                    s.status === "published" ? "bg-sun" : s.status === "archived" ? "bg-slate-200" : "bg-paper"
                  }`}
                >
                  {setStatusLabels[s.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
