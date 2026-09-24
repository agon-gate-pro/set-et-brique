import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PickupPointCreateDialog, PickupPointRow } from "./forms";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Lieux de remise", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PickupPointsPage() {
  await requireRole("admin");
  const points = await db
    .select({
      point: schema.pickupPoints,
      bookingCount: sql<number>`(select count(*)::int from ${schema.bookings} b where b.pickup_point_id = ${schema.pickupPoints}.id)`,
    })
    .from(schema.pickupPoints)
    .orderBy(asc(schema.pickupPoints.sortOrder), asc(schema.pickupPoints.createdAt));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold">Lieux de remise</h1>
        <PickupPointCreateDialog />
      </div>
      <p className="mt-3 text-sm text-slate-ink whitespace-nowrap">
        Les lieux où vous remettez les sets en main propre, dans l&apos;ordre où le client les choisit.
      </p>

      {points.length === 0 ? (
        <p className="mt-8 brick-card p-6 bg-sky max-w-xl">Aucun lieu pour l&apos;instant.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {points.map(({ point, bookingCount }, i) => (
            <PickupPointRow key={point.id} point={point} index={i} count={points.length} bookingCount={bookingCount} />
          ))}
        </ul>
      )}
    </>
  );
}
