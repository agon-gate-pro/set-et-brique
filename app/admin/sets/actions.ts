"use server";

import { del, put } from "@vercel/blob";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { slugify } from "@/lib/format";
import { copySchema, firstError, formToObject, setSchema } from "@/lib/validation";
import type { ActionState } from "@/components/admin/form";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
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
      setNumber: d.setNumber,
      theme: d.theme,
      description: d.description,
      pieces: d.pieces,
      ageMin: d.ageMin,
      depositCents: d.depositEuros,
      ratePlanId: d.ratePlanId,
      status: d.status,
      featured: d.featured,
    })
    .returning({ id: schema.sets.id });

  // Un premier exemplaire par défaut : la plupart des sets n'existent qu'en un seul.
  await db.insert(schema.setCopies).values({ setId: created.id, label: "Exemplaire 1" });

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
      setNumber: d.setNumber,
      theme: d.theme,
      description: d.description,
      pieces: d.pieces,
      ageMin: d.ageMin,
      depositCents: d.depositEuros,
      ratePlanId: d.ratePlanId,
      status: d.status,
      featured: d.featured,
    })
    .where(eq(schema.sets.id, id));

  revalidateSet(id);
  return { ok: "Set enregistré." };
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

export async function addSetImage(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const setId = String(formData.get("setId") ?? "");
  const file = formData.get("file");
  if (!setId || !(file instanceof File) || file.size === 0) return { error: "Choisissez une image." };
  if (!IMAGE_TYPES.includes(file.type)) return { error: "Format accepté : JPEG, PNG ou WebP." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Image trop lourde (8 Mo maximum)." };

  const [set] = await db.select({ slug: schema.sets.slug }).from(schema.sets).where(eq(schema.sets.id, setId));
  if (!set) return { error: "Set introuvable" };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const blob = await put(`sets/${set.slug}/${Date.now()}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.setImages)
    .where(eq(schema.setImages.setId, setId));

  await db.insert(schema.setImages).values({
    setId,
    url: blob.url,
    alt: String(formData.get("alt") ?? "").trim() || null,
    sortOrder: n,
  });
  revalidateSet(setId);
  return { ok: "Photo ajoutée." };
}

export async function deleteSetImage(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const [image] = await db.select().from(schema.setImages).where(eq(schema.setImages.id, id));
  if (!image) return;
  await db.delete(schema.setImages).where(eq(schema.setImages.id, id));
  await del(image.url).catch(() => undefined);
  revalidateSet(image.setId);
}

export async function moveSetImage(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  const [image] = await db.select().from(schema.setImages).where(eq(schema.setImages.id, id));
  if (!image) return;

  const siblings = await db
    .select()
    .from(schema.setImages)
    .where(eq(schema.setImages.setId, image.setId))
    .orderBy(asc(schema.setImages.sortOrder), asc(schema.setImages.createdAt));
  const index = siblings.findIndex((s) => s.id === id);
  const target = index + direction;
  if (target < 0 || target >= siblings.length) return;

  [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
  await db.transaction(async (tx) => {
    for (const [i, s] of siblings.entries()) {
      await tx.update(schema.setImages).set({ sortOrder: i }).where(eq(schema.setImages.id, s.id));
    }
  });
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
