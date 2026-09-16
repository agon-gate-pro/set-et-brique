"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/admin/form";
import { requireRole } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { generateGiftVoucherCode, giftVoucherExpiresAt } from "@/lib/gift-vouchers";
import { firstError, formToObject, giftVoucherCreateSchema } from "@/lib/validation";

const PATH = "/admin/bons-cadeaux";

export async function createGiftVouchers(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = giftVoucherCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { amountEuros: amountCents, quantity, batchLabel, note } = parsed.data;
  const expiresAt = giftVoucherExpiresAt();

  await db.transaction(async (tx) => {
    for (let i = 0; i < quantity; i++) {
      for (let attempt = 0; ; attempt++) {
        try {
          await tx.insert(schema.giftVouchers).values({
            code: generateGiftVoucherCode(),
            amountCents,
            origin: "admin",
            batchLabel,
            note,
            expiresAt,
          });
          break;
        } catch (err) {
          const code = (err as { code?: string }).code;
          if (code !== "23505" || attempt >= 4) throw err;
        }
      }
    }
  });

  revalidatePath(PATH);
  return {
    ok:
      quantity > 1
        ? `${quantity} bons cadeaux créés à ${(amountCents / 100).toFixed(2).replace(".", ",")} € chacun.`
        : "Bon cadeau créé.",
  };
}

export async function markGiftVoucherUsed(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const [voucher] = await db.select().from(schema.giftVouchers).where(eq(schema.giftVouchers.id, id));
  if (!voucher) return { error: "Bon cadeau introuvable." };
  if (voucher.status !== "valid") return { error: "Ce bon n'est plus valide, impossible de le marquer utilisé." };

  await db
    .update(schema.giftVouchers)
    .set({ status: "used", usedAt: new Date() })
    .where(eq(schema.giftVouchers.id, id));
  revalidatePath(PATH);
  return { ok: "Bon marqué comme utilisé." };
}

export async function cancelGiftVoucher(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const [voucher] = await db.select().from(schema.giftVouchers).where(eq(schema.giftVouchers.id, id));
  if (!voucher) return { error: "Bon cadeau introuvable." };
  if (voucher.status !== "valid") return { error: "Ce bon n'est plus valide, impossible de l'annuler." };

  await db
    .update(schema.giftVouchers)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(schema.giftVouchers.id, id));
  revalidatePath(PATH);
  return { ok: "Bon annulé." };
}
