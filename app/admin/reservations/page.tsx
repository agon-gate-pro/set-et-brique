import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { todayIso } from "@/lib/dates";
import { BookingsTable, UPCOMING_GROUP_KEYS, type BookingRow } from "./bookings-table";
import { requireRole } from "@/lib/auth";
import { expireOverduePayments } from "@/lib/payment-expiry";

export const metadata: Metadata = { title: "Réservations", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BookingsPage({ searchParams }: PageProps<"/admin/reservations">) {
  await requireRole("admin");
  // Demandes acceptées non payées dans le délai : annulées avant de lire la liste.
  await expireOverduePayments();
  const today = todayIso();
  const [bookings, pickupPoints] = await Promise.all([
    db.query.bookings.findMany({
      with: {
        customer: { columns: { firstName: true, lastName: true, phone: true, blocked: true } },
        set: { columns: { name: true } },
        pickupPoint: { columns: { name: true } },
      },
      orderBy: [asc(schema.bookings.startDate), desc(schema.bookings.createdAt)],
    }),
    db
      .select({ id: schema.pickupPoints.id, name: schema.pickupPoints.name })
      .from(schema.pickupPoints)
      .orderBy(asc(schema.pickupPoints.sortOrder), asc(schema.pickupPoints.createdAt)),
  ]);

  // `?lieu=<id>` : lien « N réservations à venir » de la page Lieux de remise. Le tableau s'ouvre
  // filtré sur ce lieu et sur les statuts à venir ; ce ne sont que des filtres de départ, modifiables.
  const { lieu } = await searchParams;
  const place = typeof lieu === "string" ? pickupPoints.find((p) => p.id === lieu) : undefined;

  const rows: BookingRow[] = bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    status: b.status,
    startDate: b.startDate,
    endDate: b.endDate,
    days: b.days,
    rentalCents: b.rentalCents,
    disassemblyCents: b.disassemblyCents,
    pickupTime: b.pickupTime,
    setName: b.set.name,
    pickupPointId: b.pickupPointId,
    pickupPointName: b.pickupPoint?.name ?? null,
    customerFirstName: b.customer.firstName,
    customerLastName: b.customer.lastName,
    customerPhone: b.customer.phone,
    customerBlocked: b.customer.blocked,
  }));

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Réservations</h1>
      <p className="mt-3 text-sm text-slate-ink max-w-xl">
        Chaque demande passe par vous : acceptez-la, refusez-la, ou proposez d&apos;autres dates. Touchez une ligne
        pour voir le détail.
      </p>

      <BookingsTable
        // Nouvelle clé à chaque lien de lieu : les filtres de départ s'appliquent même si l'on vient
        // déjà de la page Réservations.
        key={place?.id ?? "tous"}
        rows={rows}
        today={today}
        pickupPoints={pickupPoints}
        initialPickupPointId={place?.id}
        initialGroups={place ? UPCOMING_GROUP_KEYS : []}
      />
    </>
  );
}
