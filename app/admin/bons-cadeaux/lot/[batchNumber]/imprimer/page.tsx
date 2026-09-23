import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PrintButton } from "../../../print-button";
import { PrintVoucherCard } from "../../../print-voucher-card";

export const metadata: Metadata = { title: "Bons cadeaux du lot", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PrintGiftVoucherBatchPage({
  params,
}: PageProps<"/admin/bons-cadeaux/lot/[batchNumber]/imprimer">) {
  await requireRole("admin");
  const { batchNumber } = await params;
  const vouchers = await db.query.giftVouchers.findMany({
    where: and(eq(schema.giftVouchers.batchNumber, batchNumber), eq(schema.giftVouchers.status, "valid")),
    orderBy: (v, { asc }) => [asc(v.createdAt)],
  });
  if (vouchers.length === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/admin/bons-cadeaux" className="font-bold underline underline-offset-4">
          ← Retour aux bons cadeaux
        </Link>
        <PrintButton />
      </div>
      <p className="no-print mb-6 text-sm text-slate-ink">
        {batchNumber} · {vouchers.length} bon{vouchers.length > 1 ? "s" : ""} valide{vouchers.length > 1 ? "s" : ""},
        à découper une fois imprimés.
      </p>

      <div className="print-area flex flex-wrap gap-[5mm]">
        {vouchers.map((voucher) => (
          <PrintVoucherCard key={voucher.id} voucher={voucher} className="break-inside-avoid" />
        ))}
      </div>
    </div>
  );
}
