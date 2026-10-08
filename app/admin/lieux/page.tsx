import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PickupPointCreateDialog, PickupPointRow } from "./forms";
import { requireRole } from "@/lib/auth";
import { HANDOVER_CHANGE_STATUSES } from "@/lib/handover";
import { expireOverduePayments } from "@/lib/payment-expiry";
import { AdminPageTitle } from "@/components/admin/sections";

export const metadata: Metadata = { title: "Lieux de remise", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PickupPointsPage() {
  await requireRole("admin");
  await expireOverduePayments();
  // Réservations à venir sur ce lieu (remise pas encore faite) : celles qu'un changement de créneaux
  // ou une fermeture du lieu toucherait. Les réservations passées ou annulées ne comptent pas.
  const upcoming = sql.join(
    HANDOVER_CHANGE_STATUSES.map((s) => sql`${s}`),
    sql`, `,
  );
  const points = await db
    .select({
      point: schema.pickupPoints,
      bookingCount: sql<number>`(select count(*)::int from ${schema.bookings} b where b.pickup_point_id = ${schema.pickupPoints}.id and b.status in (${upcoming}))`,
    })
    .from(schema.pickupPoints)
    .orderBy(asc(schema.pickupPoints.sortOrder), asc(schema.pickupPoints.createdAt));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageTitle section="/admin/lieux">Lieux de remise</AdminPageTitle>
        <PickupPointCreateDialog />
      </div>
      <p className="mt-3 text-sm text-slate-ink">
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
