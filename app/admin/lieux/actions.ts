"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { RESERVING_STATUSES } from "@/lib/availability";
import { db, schema } from "@/lib/db";
import { firstError, formToObject, pickupPointSchema } from "@/lib/validation";
import type { ActionState } from "@/components/admin/form";

function revalidate() {
  revalidatePath("/admin/lieux");
}

export async function createPickupPoint(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = pickupPointSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.pickupPoints);
  await db.insert(schema.pickupPoints).values({ ...parsed.data, sortOrder: n });
  revalidate();
  return { ok: `Lieu « ${parsed.data.name} » ajouté.` };
}

export async function updatePickupPoint(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = pickupPointSchema.safeParse(formToObject(formData));
  if (!id) return { error: "Lieu introuvable" };
  if (!parsed.success) return { error: firstError(parsed.error) };

  await db.update(schema.pickupPoints).set(parsed.data).where(eq(schema.pickupPoints.id, id));
  revalidate();
  return { ok: "Lieu enregistré." };
}

export async function movePickupPoint(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;

  const points = await db
    .select({ id: schema.pickupPoints.id })
    .from(schema.pickupPoints)
    .orderBy(asc(schema.pickupPoints.sortOrder), asc(schema.pickupPoints.createdAt));
  const index = points.findIndex((p) => p.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= points.length) return;

  [points[index], points[target]] = [points[target], points[index]];
  await db.transaction(async (tx) => {
    for (const [i, p] of points.entries()) {
      await tx.update(schema.pickupPoints).set({ sortOrder: i }).where(eq(schema.pickupPoints.id, p.id));
    }
  });
  revalidate();
}

export async function deletePickupPoint(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.pickupPointId, id), inArray(schema.bookings.status, [...RESERVING_STATUSES])));
  if (n > 0) {
    return { error: `${n} réservation(s) en cours sur ce lieu. Désactivez-le plutôt que de le supprimer.` };
  }
  await db.delete(schema.pickupPoints).where(eq(schema.pickupPoints.id, id));
  revalidate();
  return { ok: "Lieu supprimé." };
}
