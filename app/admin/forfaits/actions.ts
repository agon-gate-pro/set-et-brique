"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { firstError, formToObject, ratePlanSchema } from "@/lib/validation";
import type { ActionState } from "@/components/admin/form";

export async function createRatePlan(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = ratePlanSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.ratePlans);
  await db.insert(schema.ratePlans).values({
    name: parsed.data.name,
    priceCentsPerDay: parsed.data.priceEuros,
    isDefault: n === 0,
    sortOrder: n,
  });
  revalidatePath("/admin/forfaits");
  revalidatePath("/bons-cadeaux"); // jours de location équivalents à chaque montant
  return { ok: `Forfait « ${parsed.data.name} » créé.` };
}

export async function updateRatePlan(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = ratePlanSchema.safeParse(formToObject(formData));
  if (!id || !parsed.success) return { error: parsed.success ? "Forfait introuvable" : firstError(parsed.error) };

  await db
    .update(schema.ratePlans)
    .set({ name: parsed.data.name, priceCentsPerDay: parsed.data.priceEuros })
    .where(eq(schema.ratePlans.id, id));
  revalidatePath("/admin/forfaits");
  revalidatePath("/bons-cadeaux"); // jours de location équivalents à chaque montant
  return { ok: "Forfait enregistré." };
}

export async function setDefaultRatePlan(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.transaction(async (tx) => {
    await tx.update(schema.ratePlans).set({ isDefault: false }).where(ne(schema.ratePlans.id, id));
    await tx.update(schema.ratePlans).set({ isDefault: true }).where(eq(schema.ratePlans.id, id));
  });
  revalidatePath("/admin/forfaits");
  revalidatePath("/bons-cadeaux"); // jours de location équivalents à chaque montant
}

export async function deleteRatePlan(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const [plan] = await db.select().from(schema.ratePlans).where(eq(schema.ratePlans.id, id));
  if (!plan) return { error: "Forfait introuvable" };
  if (plan.isDefault) return { error: "Impossible de supprimer le forfait par défaut. Choisissez-en un autre par défaut d'abord." };

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.sets)
    .where(and(eq(schema.sets.ratePlanId, id)));
  if (n > 0) return { error: `${n} set(s) utilisent ce forfait. Changez leur forfait avant de le supprimer.` };

  await db.delete(schema.ratePlans).where(eq(schema.ratePlans.id, id));
  revalidatePath("/admin/forfaits");
  revalidatePath("/bons-cadeaux"); // jours de location équivalents à chaque montant
  return { ok: "Forfait supprimé." };
}
