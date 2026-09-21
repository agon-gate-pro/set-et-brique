import type { GiftVoucherStatus } from "@/lib/db/schema";

export type GiftVoucherDisplayStatus = GiftVoucherStatus | "expired";

/** `status` en base ne connaît pas "expiré" : il se déduit de la date. */
export function giftVoucherDisplayStatus(voucher: {
  status: GiftVoucherStatus;
  expiresAt: Date;
}): GiftVoucherDisplayStatus {
  if (voucher.status === "valid" && voucher.expiresAt.getTime() < Date.now()) return "expired";
  return voucher.status;
}
