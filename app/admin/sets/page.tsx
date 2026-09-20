import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { SetsTable } from "@/components/admin/sets-table";

export const metadata: Metadata = { title: "Sets", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SetsPage() {
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold">Sets</h1>
        <Link href="/admin/sets/nouveau" className="btn btn-leaf">
          Ajouter un set
        </Link>
      </div>
      <p className="mt-2 text-sm text-slate-ink max-w-2xl">
        Le catalogue complet des sets, publiés ou non : cherchez-en un et modifiez ses informations.
      </p>

      <SetsTable rows={rows} />
    </>
  );
}
