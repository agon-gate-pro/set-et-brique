"use server";

import { del, put } from "@vercel/blob";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { todayIso } from "@/lib/dates";
import { db, schema } from "@/lib/db";
import { slugify } from "@/lib/format";
import { copySchema, firstError, formToObject, setSchema } from "@/lib/validation";
import type { ActionState } from "@/components/admin/form";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** Limite fixée avec la cliente (spécification, module 1). */
const MAX_IMAGES_PER_SET = 10;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function revalidateSet(id?: string) {
  revalidatePath("/admin/sets");
  revalidatePath("/catalogue");
  if (id) revalidatePath(`/admin/sets/${id}`);
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "set";
  let slug = root;
  for (let i = 2; i < 100; i++) {
    const [existing] = await db
      .select({ id: schema.sets.id })
      .from(schema.sets)
      .where(eq(schema.sets.slug, slug));
    if (!existing || existing.id === excludeId) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

export async function createSet(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = setSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const [created] = await db
    .insert(schema.sets)
    .values({
      slug: await uniqueSlug(d.name),
      name: d.name,
      brand: d.brand,
      setNumbers: d.setNumbers,
      theme: d.theme,
      description: d.description,
      publicNote: d.publicNote,
      pieces: d.pieces,
      minifigCount: d.minifigCount,
      instructionCount: d.instructionCount,
      instructionType: d.instructionType,
      dimensions: d.dimensions,
      buildTime: d.buildTime,
      ageMin: d.ageMin,
      weightGrams: d.weightGrams,
      depositCents: d.depositEuros,
      turnaroundDays: d.turnaroundDays,
      ratePlanId: d.ratePlanId,
      status: d.status,
      featured: d.featured,
    })
    .returning({ id: schema.sets.id });

  // Un premier exemplaire par défaut : la plupart des sets n'existent qu'en un seul.
  await db.insert(schema.setCopies).values({ setId: created.id, label: "Exemplaire 1", stockEntryDate: todayIso() });

  revalidateSet(created.id);
  redirect(`/admin/sets/${created.id}`);
}

export async function updateSet(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = setSchema.safeParse(formToObject(formData));
  if (!id) return { error: "Set introuvable" };
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const [current] = await db.select({ name: schema.sets.name, slug: schema.sets.slug }).from(schema.sets).where(eq(schema.sets.id, id));
  if (!current) return { error: "Set introuvable" };

  await db
    .update(schema.sets)
    .set({
      slug: current.name === d.name ? current.slug : await uniqueSlug(d.name, id),
      name: d.name,
      brand: d.brand,
      setNumbers: d.setNumbers,
      theme: d.theme,
      description: d.description,
      publicNote: d.publicNote,
      pieces: d.pieces,
      minifigCount: d.minifigCount,
      instructionCount: d.instructionCount,
      instructionType: d.instructionType,
      dimensions: d.dimensions,
      buildTime: d.buildTime,
      ageMin: d.ageMin,
      weightGrams: d.weightGrams,
      depositCents: d.depositEuros,
      turnaroundDays: d.turnaroundDays,
      ratePlanId: d.ratePlanId,
      status: d.status,
      featured: d.featured,
    })
    .where(eq(schema.sets.id, id));

  revalidateSet(id);
  return { ok: "Modification enregistrée." };
}

export async function deleteSet(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(eq(schema.bookings.setId, id));
  if (n > 0) {
    return { error: `Ce set a ${n} réservation(s). Archivez-le plutôt que de le supprimer.` };
  }

  const images = await db.select().from(schema.setImages).where(eq(schema.setImages.setId, id));
  await db.delete(schema.sets).where(eq(schema.sets.id, id));
  if (images.length > 0) {
    await del(images.map((i) => i.url)).catch(() => undefined);
  }
  revalidateSet();
  redirect("/admin/sets");
}

/* ---------------- Images ---------------- */

/**
 * Une photo par appel, invoquée directement depuis le client (pas de `<form>`) :
 * en boucle, ça permet d'ajouter plusieurs photos d'un coup sans jamais
 * dépasser la limite de taille d'une requête (`serverActions.bodySizeLimit`,
 * `next.config.ts`), quel que soit le nombre de photos choisies.
 */
export async function addSetImage(setId: string, file: File, alt: string | null): Promise<{ error?: string }> {
  await requireRole("admin");
  if (!IMAGE_TYPES.includes(file.type)) return { error: `Format non accepté pour « ${file.name} » : JPEG, PNG ou WebP.` };
  if (file.size > MAX_IMAGE_BYTES) return { error: `« ${file.name} » dépasse 8 Mo.` };

  const [set] = await db.select({ slug: schema.sets.slug }).from(schema.sets).where(eq(schema.sets.id, setId));
  if (!set) return { error: "Set introuvable" };

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.setImages)
    .where(eq(schema.setImages.setId, setId));
  if (n >= MAX_IMAGES_PER_SET) {
    return { error: `${MAX_IMAGES_PER_SET} photos maximum par set. Retirez-en une avant d'en ajouter.` };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const blob = await put(`sets/${set.slug}/${Date.now()}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  await db.insert(schema.setImages).values({ setId, url: blob.url, alt, sortOrder: n });
  revalidateSet(setId);
  return {};
}

export async function deleteSetImage(id: string) {
  await requireRole("admin");
  const [image] = await db.select().from(schema.setImages).where(eq(schema.setImages.id, id));
  if (!image) return;
  await db.delete(schema.setImages).where(eq(schema.setImages.id, id));
  await del(image.url).catch(() => undefined);
  revalidateSet(image.setId);
}

export async function moveSetImage(id: string, direction: "up" | "down") {
  await requireRole("admin");
  const [image] = await db.select().from(schema.setImages).where(eq(schema.setImages.id, id));
  if (!image) return;

  const siblings = await db
    .select()
    .from(schema.setImages)
    .where(eq(schema.setImages.setId, image.setId))
    .orderBy(asc(schema.setImages.sortOrder), asc(schema.setImages.createdAt));
  const index = siblings.findIndex((s) => s.id === id);
  const target = index + (direction === "up" ? -1 : 1);
  if (target < 0 || target >= siblings.length) return;

  [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
  await db.transaction(async (tx) => {
    for (const [i, s] of siblings.entries()) {
      await tx.update(schema.setImages).set({ sortOrder: i }).where(eq(schema.setImages.id, s.id));
    }
  });
  revalidateSet(image.setId);
}

/** Glisser-déposer : ordre complet envoyé en une fois, pour un déplacement à une position quelconque. */
export async function reorderSetImages(setId: string, orderedIds: string[]) {
  await requireRole("admin");
  await db.transaction(async (tx) => {
    for (const [i, id] of orderedIds.entries()) {
      await tx.update(schema.setImages).set({ sortOrder: i }).where(eq(schema.setImages.id, id));
    }
  });
  revalidateSet(setId);
}

/** Description d'une photo déjà en place, modifiable après coup (une par une, plutôt qu'un texte commun au lot importé). */
export async function updateSetImageAlt(id: string, alt: string | null) {
  await requireRole("admin");
  const [image] = await db.select({ setId: schema.setImages.setId }).from(schema.setImages).where(eq(schema.setImages.id, id));
  if (!image) return;
  await db.update(schema.setImages).set({ alt }).where(eq(schema.setImages.id, id));
  revalidateSet(image.setId);
}

/* ---------------- Exemplaires ---------------- */

export async function addCopy(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const setId = String(formData.get("setId") ?? "");
  const parsed = copySchema.safeParse(formToObject(formData));
  if (!setId) return { error: "Set introuvable" };
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.insert(schema.setCopies).values({ setId, ...parsed.data });
  revalidateSet(setId);
  return { ok: "Exemplaire ajouté." };
}

export async function updateCopy(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = copySchema.safeParse(formToObject(formData));
  if (!id) return { error: "Exemplaire introuvable" };
  if (!parsed.success) return { error: firstError(parsed.error) };
  const [copy] = await db
    .update(schema.setCopies)
    .set(parsed.data)
    .where(eq(schema.setCopies.id, id))
    .returning({ setId: schema.setCopies.setId });
  if (copy) revalidateSet(copy.setId);
  return { ok: "Exemplaire enregistré." };
}

export async function deleteCopy(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const [copyToDelete] = await db.select({ setId: schema.setCopies.setId }).from(schema.setCopies).where(eq(schema.setCopies.id, id));
  if (!copyToDelete) return { error: "Exemplaire introuvable." };

  const [{ n: siblingCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.setCopies)
    .where(eq(schema.setCopies.setId, copyToDelete.setId));
  if (siblingCount <= 1) {
    return { error: "Dernier exemplaire du set : supprimez ou archivez plutôt le set entier." };
  }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(eq(schema.bookings.copyId, id));
  if (n > 0) return { error: `Cet exemplaire a ${n} réservation(s). Passez-le en « Retiré » plutôt que de le supprimer.` };
  const [copy] = await db
    .delete(schema.setCopies)
    .where(eq(schema.setCopies.id, id))
    .returning({ setId: schema.setCopies.setId });
  if (copy) revalidateSet(copy.setId);
  return { ok: "Exemplaire supprimé." };
}
