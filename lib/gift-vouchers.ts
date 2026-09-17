import { randomInt } from "node:crypto";
import type { GiftVoucherStatus } from "@/lib/db/schema";

/** Sans 0/O, 1/I/L : ambigus à recopier à la main. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateGiftVoucherCode() {
  let code = "SB-";
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function giftVoucherExpiresAt(from = new Date()) {
  const expires = new Date(from);
  expires.setFullYear(expires.getFullYear() + 1);
  return expires;
}

export type GiftVoucherDisplayStatus = GiftVoucherStatus | "expired";

/** `status` en base ne connaît pas "expiré" : il se déduit de la date. */
export function giftVoucherDisplayStatus(voucher: {
  status: GiftVoucherStatus;
  expiresAt: Date;
}): GiftVoucherDisplayStatus {
  if (voucher.status === "valid" && voucher.expiresAt.getTime() < Date.now()) return "expired";
  return voucher.status;
}
