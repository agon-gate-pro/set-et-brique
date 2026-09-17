import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { RatePlanCreateForm, RatePlanRow } from "./forms";
import { setDefaultRatePlan } from "./actions";
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
      <h1 className="text-3xl md:text-4xl font-bold">Forfaits</h1>
      <p className="mt-3 text-slate-ink max-w-xl">
        Un forfait fixe un prix par jour. Chaque set est rattaché à un forfait ;
        les sets sans forfait explicite utilisent le forfait par défaut
        {unassigned > 0 ? ` (${unassigned} set${unassigned > 1 ? "s" : ""} actuellement)` : ""}.
      </p>

      <ul className="mt-8 space-y-4">
        {plans.map((plan) => (
          <li key={plan.id} className="brick-card p-5">
            <RatePlanRow plan={plan} />
            {!plan.isDefault ? (
              <form action={setDefaultRatePlan} className="mt-3">
                <input type="hidden" name="id" value={plan.id} />
                <button type="submit" className="font-bold underline underline-offset-4">
                  Définir comme forfait par défaut
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>

      <section className="mt-10 brick-card p-5 bg-sky">
        <h2 className="text-2xl font-semibold">Nouveau forfait</h2>
        <RatePlanCreateForm />
      </section>
    </>
  );
}

export const dynamic = "force-dynamic";
