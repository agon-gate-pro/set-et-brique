import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { createSet } from "../actions";
import { SetForm } from "../set-form";

export const metadata: Metadata = { title: "Nouveau set", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewSetPage() {
  const ratePlans = await db
    .select({
      id: schema.ratePlans.id,
      name: schema.ratePlans.name,
      priceCentsPerDay: schema.ratePlans.priceCentsPerDay,
      isDefault: schema.ratePlans.isDefault,
    })
    .from(schema.ratePlans)
    .orderBy(asc(schema.ratePlans.sortOrder));
  const defaultTurnaroundDays = await getSetting("turnaround_days");

  return (
    <>
      <Link href="/admin/sets" className="font-bold underline underline-offset-4">
        Retour aux sets
      </Link>
      <h1 className="mt-3 text-3xl md:text-4xl font-bold">Nouveau set</h1>
      <p className="mt-2 text-slate-ink max-w-xl">
        Renseignez la fiche, puis ajoutez les photos et les exemplaires à l&apos;étape
        suivante. Un premier exemplaire est créé automatiquement.
      </p>
      <div className="mt-8 brick-card p-6">
        <SetForm action={createSet} ratePlans={ratePlans} defaultTurnaroundDays={defaultTurnaroundDays} submitLabel="Créer le set" />
      </div>
    </>
  );
}
