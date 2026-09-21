import { randomInt } from "node:crypto";

export * from "@/lib/gift-vouchers-core";

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
