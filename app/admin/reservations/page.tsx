import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { todayIso } from "@/lib/dates";
import { BookingsTable, type BookingRow } from "./bookings-table";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Réservations", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  await requireRole("admin");
  const today = todayIso();
  const bookings = await db.query.bookings.findMany({
    with: {
      customer: { columns: { firstName: true, lastName: true, phone: true, blocked: true } },
      set: { columns: { name: true } },
      pickupPoint: { columns: { name: true } },
    },
    orderBy: [asc(schema.bookings.startDate), desc(schema.bookings.createdAt)],
  });

  const rows: BookingRow[] = bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    status: b.status,
    startDate: b.startDate,
    endDate: b.endDate,
    days: b.days,
    rentalCents: b.rentalCents,
    pickupTime: b.pickupTime,
    setName: b.set.name,
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

      <BookingsTable rows={rows} today={today} />
    </>
  );
}
