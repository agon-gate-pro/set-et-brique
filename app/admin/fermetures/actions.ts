"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { blackoutSchema, firstError, formToObject } from "@/lib/validation";
import type { ActionState } from "@/components/admin/form";

function revalidate() {
  revalidatePath("/admin/fermetures");
}

export async function createBlackout(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = blackoutSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.insert(schema.blackoutPeriods).values(parsed.data);
  revalidate();
  return { ok: "Période ajoutée." };
}

export async function updateBlackout(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = blackoutSchema.safeParse(formToObject(formData));
  if (!id) return { error: "Période introuvable" };
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.update(schema.blackoutPeriods).set(parsed.data).where(eq(schema.blackoutPeriods.id, id));
  revalidate();
  return { ok: "Période enregistrée." };
}

export async function deleteBlackout(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  await db.delete(schema.blackoutPeriods).where(eq(schema.blackoutPeriods.id, id));
  revalidate();
  return { ok: "Période supprimée." };
}
