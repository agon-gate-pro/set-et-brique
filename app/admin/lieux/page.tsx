import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PickupPointCreateForm, PickupPointRow } from "./forms";

export const metadata: Metadata = { title: "Lieux de remise", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PickupPointsPage() {
  const points = await db
    .select({
      point: schema.pickupPoints,
      bookingCount: sql<number>`(select count(*)::int from ${schema.bookings} b where b.pickup_point_id = ${schema.pickupPoints}.id)`,
    })
    .from(schema.pickupPoints)
    .orderBy(asc(schema.pickupPoints.sortOrder), asc(schema.pickupPoints.createdAt));

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Lieux de remise</h1>
      <p className="mt-3 text-slate-ink max-w-xl">
        Les lieux où vous remettez et récupérez les sets en main propre. Le client en
        choisit un à la réservation, dans l&apos;ordre ci-dessous. L&apos;heure exacte se
        convient ensuite avec lui. Un lieu désactivé n&apos;est plus proposé mais reste
        dans l&apos;historique.
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

      <section className="mt-10 brick-card p-5 bg-sky">
        <h2 className="text-2xl font-semibold">Nouveau lieu</h2>
        <PickupPointCreateForm />
      </section>
    </>
  );
}
