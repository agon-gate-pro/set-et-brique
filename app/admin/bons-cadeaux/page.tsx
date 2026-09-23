import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { GiftVoucherCreateDialog } from "./forms";
import { VouchersList } from "./vouchers-list";

export const metadata: Metadata = { title: "Bons cadeaux", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function GiftVouchersPage() {
  await requireRole("admin");
  const vouchers = await db.select().from(schema.giftVouchers).orderBy(desc(schema.giftVouchers.createdAt));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold">Bons cadeaux</h1>
        <GiftVoucherCreateDialog />
      </div>
      <p className="mt-2 text-sm text-slate-ink max-w-xl">
        Générez des bons cadeaux à l&apos;unité ou en lot, et suivez leur état.
      </p>

      <VouchersList vouchers={vouchers} />
    </>
  );
}
