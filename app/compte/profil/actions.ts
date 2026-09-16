"use server";

import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeReturnPath, upsertCustomer } from "@/lib/bookings";
import { db, schema } from "@/lib/db";
import { customerProfileSchema, firstError, formToObject } from "@/lib/validation";
import type { ActionState } from "@/components/admin/form";

/** Onglet « Coordonnées » : le client tient lui-même sa fiche à jour. */
export async function saveCustomerProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) return { error: "Connectez-vous pour modifier vos coordonnées." };

  const parsed = customerProfileSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { preferredPickupPointId, ...input } = parsed.data;

  let pickupPointId: string | null = null;
  if (preferredPickupPointId) {
    const [point] = await db
      .select({ id: schema.pickupPoints.id })
      .from(schema.pickupPoints)
      .where(and(eq(schema.pickupPoints.id, preferredPickupPointId), eq(schema.pickupPoints.active, true)));
    if (!point) return { error: "Ce lieu de remise n'est plus proposé." };
    pickupPointId = point.id;
  }

  await upsertCustomer(user, { ...input, preferredPickupPointId: pickupPointId });
  revalidatePath("/compte");
  revalidatePath("/compte/profil");
  const returnTo = safeReturnPath(formData.get("retour"));
  if (returnTo) redirect(returnTo);
  return { ok: "Coordonnées enregistrées." };
}
