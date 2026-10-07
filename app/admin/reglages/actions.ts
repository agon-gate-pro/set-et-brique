"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { formToObject, settingsSchema } from "@/lib/validation";
import type { ActionState } from "@/components/admin/form";

export async function saveSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = settingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };

  await Promise.all([
    setSetting("payment_delay_hours", parsed.data.paymentDelayHours),
    setSetting("turnaround_days", parsed.data.turnaroundDays),
    setSetting("min_rental_days", parsed.data.minRentalDays),
  ]);
  revalidatePath("/admin/reglages");
  return { ok: "Réglages enregistrés." };
}
