import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { PrintButton } from "@/app/admin/bons-cadeaux/print-button";
import { PrintVoucherCard } from "@/app/admin/bons-cadeaux/print-voucher-card";
import { db, schema } from "@/lib/db";
import { formatDateLong, giftVoucherStatusLabels } from "@/lib/format";
import { giftVoucherDisplayStatus } from "@/lib/gift-vouchers";
import { AutoPrint } from "./auto-print";

export const metadata: Metadata = { title: "Mon bon cadeau", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Bon cadeau acheté en ligne, à voir et à imprimer par son acheteur (lien depuis la page de retour
 * de l'achat et depuis « Mes bons cadeaux » de l'espace client). Même bon que celui imprimé par les
 * gérants. Réservé au compte qui l'a acheté : pour tout autre, la page n'existe pas.
 */
export default async function CustomerGiftVoucherPage({ params, searchParams }: PageProps<"/compte/bons-cadeaux/[id]">) {
  const { userId } = await auth.protect();
  const { id } = await params;
  const { imprimer } = await searchParams;
  // Un identifiant mal formé ferait échouer la requête au lieu de renvoyer « introuvable ».
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const voucher = await db.query.giftVouchers.findFirst({
    where: and(eq(schema.giftVouchers.id, id), eq(schema.giftVouchers.purchaserClerkUserId, userId)),
  });
  if (!voucher) notFound();
  const status = giftVoucherDisplayStatus(voucher);

  return (
    <section className="mx-auto max-w-4xl px-5 md:px-8 py-14 md:py-20">
      <div className="no-print">
        <Link href="/compte" className="font-bold underline underline-offset-4">
          ← Retour à mon compte
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold">Mon bon cadeau</h1>
          <PrintButton />
        </div>
        {status === "valid" ? (
          <p className="mt-3 text-slate-ink max-w-xl">
            Imprimez-le pour l&apos;offrir, ou transmettez simplement le code. Il est valable jusqu&apos;au{" "}
            {formatDateLong(voucher.expiresAt)}, sur tout le catalogue.
          </p>
        ) : (
          <p role="status" className="mt-3 brick-card bg-sun/40 p-4 font-semibold text-ink-deep max-w-xl">
            Ce bon cadeau n&apos;est plus utilisable : {giftVoucherStatusLabels[status].toLowerCase()}.
          </p>
        )}
      </div>

      <div className="mt-8 overflow-x-auto print:mt-0 print:overflow-visible">
        <PrintVoucherCard voucher={voucher} className="print-area" />
      </div>
      {imprimer === "1" && status === "valid" ? <AutoPrint /> : null}
    </section>
  );
}
