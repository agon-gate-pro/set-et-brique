import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db, schema } from "@/lib/db";
import { formatCents, formatDateLong } from "@/lib/format";
import { site } from "@/lib/site";
import { siteLink, type EmailContent } from "./layout";
import { sendEmail } from "./send";

/**
 * E-mail d'un bon cadeau acheté en ligne (module 6) : le code part à l'acheteur dès le paiement
 * confirmé, avec une copie aux gérants. Le bon n'est pas nominatif : c'est à l'acheteur de le
 * transmettre (ou de l'imprimer) pour l'offrir.
 */

async function loadVoucher(id: string) {
  return db.query.giftVouchers.findFirst({ where: eq(schema.giftVouchers.id, id) });
}

type Voucher = NonNullable<Awaited<ReturnType<typeof loadVoucher>>>;

function purchased(v: Voucher): EmailContent {
  return {
    subject: `Votre bon cadeau Set et Brique de ${formatCents(v.amountCents)}`,
    heading: "Un cadeau en briques, c'est dans la boîte !",
    blocks: [
      { type: "p", text: "Bonjour," },
      {
        type: "p",
        text: "Merci pour votre achat. Voici le bon cadeau à offrir : transmettez ce code, ou imprimez le bon depuis votre compte.",
      },
      {
        type: "box",
        lines: [`Code : ${v.code}`, `Valeur : ${formatCents(v.amountCents)}`, `Valable jusqu'au ${formatDateLong(v.expiresAt)}`],
      },
      {
        type: "list",
        items: [
          "Utilisable sur n'importe quel set du catalogue, en une seule fois.",
          "Le code se saisit au moment de régler une réservation acceptée ; s'il ne couvre pas tout, le reste se règle par carte.",
          "La caution reste due séparément, comme pour toute location.",
          "Ni remboursable ni échangeable.",
        ],
      },
      { type: "p", text: `Une question ? Répondez simplement à cet e-mail ou appelez-nous au ${site.phone}.` },
    ],
    // Le bon imprimable se retrouve dans le compte de l'acheteur ; sans compte rattaché, le catalogue.
    button: v.purchaserClerkUserId
      ? { label: "Voir et imprimer mon bon", href: siteLink(`/compte/bons-cadeaux/${v.id}`) }
      : { label: "Voir le catalogue", href: siteLink("/catalogue") },
  };
}

function purchasedAdmin(v: Voucher): EmailContent {
  return {
    subject: `Bon cadeau acheté en ligne : ${formatCents(v.amountCents)} (${v.code})`,
    blocks: [
      { type: "p", text: "Bonjour," },
      { type: "p", text: `Un bon cadeau de ${formatCents(v.amountCents)} vient d'être acheté en ligne par ${v.purchaserEmail ?? "un client"}.` },
      { type: "box", lines: [`Code : ${v.code}`, `Lot : ${v.batchNumber}`, `Valable jusqu'au ${formatDateLong(v.expiresAt)}`] },
    ],
    button: { label: "Voir le bon", href: siteLink(`/admin/bons-cadeaux/${v.id}`) },
    internal: true,
  };
}

export async function sendGiftVoucherEmails(voucherId: string) {
  const voucher = await loadVoucher(voucherId);
  if (!voucher) return;
  if (voucher.purchaserEmail) {
    await sendEmail({ to: voucher.purchaserEmail, kind: "gift_voucher_purchased", content: purchased(voucher) });
  }
  await sendEmail({ to: site.email, kind: "gift_voucher_purchased_admin", content: purchasedAdmin(voucher) });
}

/** Envoi après la réponse, sans faire échouer la livraison du bon si l'e-mail rate. */
export function queueGiftVoucherEmail(voucherId: string) {
  after(async () => {
    try {
      await sendGiftVoucherEmails(voucherId);
    } catch (e) {
      console.error(`[email] bon cadeau ${voucherId}`, e);
    }
  });
}
