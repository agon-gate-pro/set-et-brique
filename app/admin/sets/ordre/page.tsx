import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import type { ImageCrop } from "@/lib/image-crop";
import { SetOrderList } from "./set-order-list";
import { AdminPageTitle } from "@/components/admin/sections";

export const metadata: Metadata = { title: "Ordre du catalogue", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SetOrderPage() {
  await requireRole("admin");
  // Même tri que le catalogue public : coups de cœur d'abord, puis l'ordre réglé ici, puis le nom.
  const rows = await db
    .select({
      id: schema.sets.id,
      name: schema.sets.name,
      theme: schema.sets.theme,
      featured: schema.sets.featured,
      cover: sql<string | null>`(select url from ${schema.setImages} i where i.set_id = ${schema.sets}.id order by i.sort_order asc, i.created_at asc limit 1)`,
      coverCrop: sql<ImageCrop | null>`(select json_build_object('x', i.crop_x, 'y', i.crop_y, 'zoom', i.crop_zoom, 'rect', i.crop_rect) from ${schema.setImages} i where i.set_id = ${schema.sets}.id order by i.sort_order asc, i.created_at asc limit 1)`,
    })
    .from(schema.sets)
    .where(eq(schema.sets.status, "published"))
    .orderBy(desc(schema.sets.featured), asc(schema.sets.sortOrder), asc(schema.sets.name));

  return (
    <>
      <Link href="/admin/sets" className="font-bold underline underline-offset-4">
        Retour aux sets
      </Link>
      <AdminPageTitle section="/admin/sets" className="mt-3">Ordre du catalogue</AdminPageTitle>
      <p className="mt-2 text-sm text-slate-ink max-w-2xl">
        L&apos;ordre dans lequel les sets publiés apparaissent dans le catalogue. Glissez un set pour le
        déplacer, ou utilisez les flèches : c&apos;est enregistré tout de suite. Les coups de cœur restent
        toujours en tête ; cochez ou décochez « Coup de cœur » dans la fiche d&apos;un set pour le faire
        changer de groupe. Un nouveau set se place à la fin.
      </p>

      <SetOrderList rows={rows} />
    </>
  );
}
