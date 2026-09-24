import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { RatePlanCreateDialog, RatePlanRow } from "./forms";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Forfaits", robots: { index: false } };

export default async function RatePlansPage() {
  await requireRole("admin");
  const plans = await db
    .select({
      id: schema.ratePlans.id,
      name: schema.ratePlans.name,
      priceCentsPerDay: schema.ratePlans.priceCentsPerDay,
      isDefault: schema.ratePlans.isDefault,
      setCount: sql<number>`(select count(*)::int from ${schema.sets} where ${schema.sets.ratePlanId} = ${schema.ratePlans.id})`,
    })
    .from(schema.ratePlans)
    .orderBy(asc(schema.ratePlans.sortOrder), asc(schema.ratePlans.createdAt));

  const [{ n: unassigned }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.sets)
    .where(sql`${schema.sets.ratePlanId} is null`);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold">Forfaits</h1>
        <RatePlanCreateDialog />
      </div>
      <p className="mt-3 text-sm text-slate-ink whitespace-nowrap">
        Un forfait fixe un prix par jour ; chaque set utilise le sien ou celui par défaut
        {unassigned > 0 ? ` (${unassigned} set${unassigned > 1 ? "s" : ""})` : ""}.
      </p>

      <ul className="mt-8 space-y-4">
        {plans.map((plan) => (
          <li key={plan.id} className="brick-card p-5">
            <RatePlanRow plan={plan} />
          </li>
        ))}
      </ul>
    </>
  );
}

export const dynamic = "force-dynamic";
