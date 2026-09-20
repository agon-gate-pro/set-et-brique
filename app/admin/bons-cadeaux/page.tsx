import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { GiftVoucherCreateForm } from "./forms";
import { VouchersList } from "./vouchers-list";

export const metadata: Metadata = { title: "Bons cadeaux", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function GiftVouchersPage() {
  const vouchers = await db.select().from(schema.giftVouchers).orderBy(desc(schema.giftVouchers.createdAt));

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Bons cadeaux</h1>
      <p className="mt-3 text-sm text-slate-ink max-w-xl">
        Générez des bons cadeaux à l&apos;unité ou en lot, et suivez leur état.
      </p>

      <section className="mt-8 brick-card p-5 bg-sky">
        <h2 className="text-2xl font-semibold">Nouveau bon</h2>
        <GiftVoucherCreateForm />
      </section>

      <VouchersList vouchers={vouchers} />
    </>
  );
}
