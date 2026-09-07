import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { setStatusLabels } from "@/lib/format";
import { updateSet } from "../actions";
import { SetForm } from "../set-form";
import { CopiesSection, DeleteSetForm, ImagesSection } from "./sections";

export const metadata: Metadata = { title: "Fiche set", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditSetPage({ params }: PageProps<"/admin/sets/[id]">) {
  const { id } = await params;
  const set = await db.query.sets.findFirst({
    where: eq(schema.sets.id, id),
    with: {
      images: { orderBy: [asc(schema.setImages.sortOrder), asc(schema.setImages.createdAt)] },
      copies: { orderBy: [asc(schema.setCopies.createdAt)] },
    },
  });
  if (!set) notFound();

  const ratePlans = await db
    .select({
      id: schema.ratePlans.id,
      name: schema.ratePlans.name,
      priceCentsPerDay: schema.ratePlans.priceCentsPerDay,
      isDefault: schema.ratePlans.isDefault,
    })
    .from(schema.ratePlans)
    .orderBy(asc(schema.ratePlans.sortOrder));

  const { images, copies, ...setRow } = set;

  return (
    <>
      <Link href="/admin/sets" className="font-bold underline underline-offset-4">
        Retour aux sets
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold">{set.name}</h1>
        <span className="text-sm font-bold px-2 py-1 border-2 border-ink bg-paper">
          {setStatusLabels[set.status]}
        </span>
      </div>

      <section className="mt-8 brick-card p-6">
        <h2 className="text-2xl font-semibold">Fiche</h2>
        <div className="mt-4">
          <SetForm action={updateSet} set={setRow} ratePlans={ratePlans} submitLabel="Enregistrer" />
        </div>
      </section>

      <ImagesSection setId={set.id} images={images} />
      <CopiesSection setId={set.id} copies={copies} />

      <section className="mt-8 brick-card p-6 border-brick">
        <h2 className="text-2xl font-semibold">Supprimer ce set</h2>
        <p className="mt-2 text-slate-ink">
          Possible uniquement s&apos;il n&apos;a jamais été réservé. Sinon, passez-le en
          « Archivé » pour le retirer du site en gardant l&apos;historique.
        </p>
        <DeleteSetForm setId={set.id} />
      </section>
    </>
  );
}
