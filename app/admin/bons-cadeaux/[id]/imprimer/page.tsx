import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PrintButton } from "../../print-button";
import { PrintVoucherCard } from "../../print-voucher-card";

export const metadata: Metadata = { title: "Bon cadeau", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PrintGiftVoucherPage({ params }: PageProps<"/admin/bons-cadeaux/[id]/imprimer">) {
  await requireRole("admin");
  const { id } = await params;
  const voucher = await db.query.giftVouchers.findFirst({ where: eq(schema.giftVouchers.id, id) });
  if (!voucher) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/admin/bons-cadeaux" className="font-bold underline underline-offset-4">
          ← Retour aux bons cadeaux
        </Link>
        <PrintButton />
      </div>

      <PrintVoucherCard voucher={voucher} className="print-area" />
    </div>
  );
}
