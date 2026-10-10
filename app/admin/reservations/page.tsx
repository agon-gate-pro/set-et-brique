import type { Metadata } from "next";
import { asc, desc, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { todayIso } from "@/lib/dates";
import { ACTIVE_EXTENSION_STATUSES, expireStaleExtensions } from "@/lib/extensions";
import { BookingsTable, UPCOMING_GROUP_KEYS, type BookingRow } from "./bookings-table";
import { requireRole } from "@/lib/auth";
import { expireOverduePayments } from "@/lib/payment-expiry";
import { AdminPageTitle } from "@/components/admin/sections";

export const metadata: Metadata = { title: "Réservations", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BookingsPage({ searchParams }: PageProps<"/admin/reservations">) {
  await requireRole("admin");
  // Demandes acceptées non payées dans le délai : annulées avant de lire la liste.
  await expireOverduePayments();
  await expireStaleExtensions();
  const today = todayIso();
  const [bookings, pickupPoints, extensions] = await Promise.all([
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
    // Prolongations en cours : une au plus par location (index unique).
    db
      .select({ bookingId: schema.bookingExtensions.bookingId, status: schema.bookingExtensions.status })
      .from(schema.bookingExtensions)
      .where(inArray(schema.bookingExtensions.status, [...ACTIVE_EXTENSION_STATUSES])),
  ]);

  // `?lieu=<id>` : lien « N réservations à venir » de la page Lieux de remise. Le tableau s'ouvre
  // filtré sur ce lieu et sur les statuts à venir ; ce ne sont que des filtres de départ, modifiables.
  const { lieu, statut } = await searchParams;
  const place = typeof lieu === "string" ? pickupPoints.find((p) => p.id === lieu) : undefined;
  // `?statut=<groupe>[,<groupe>]` : cartes « À faire » du tableau de bord (ex. `pending_review`,
  // `pending_payment`, `to_handover`, `ongoing`). Clés inconnues ignorées par le tableau.
  const statusGroups = typeof statut === "string" && statut ? statut.split(",") : null;

  const extensionByBooking = new Map(extensions.map((e) => [e.bookingId, e.status as "pending_review" | "pending_payment"]));

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
    extension: extensionByBooking.get(b.id) ?? null,
  }));

  return (
    <>
      <AdminPageTitle section="/admin/reservations">Réservations</AdminPageTitle>
      <p className="mt-3 text-sm text-slate-ink max-w-xl">
        Chaque demande passe par vous : acceptez-la, refusez-la, ou proposez d&apos;autres dates. Touchez une ligne
        pour voir le détail.
      </p>

      <BookingsTable
        // Nouvelle clé à chaque lien de lieu : les filtres de départ s'appliquent même si l'on vient
        // déjà de la page Réservations.
        key={`${place?.id ?? "tous"}-${statusGroups?.join(",") ?? ""}`}
        rows={rows}
        today={today}
        pickupPoints={pickupPoints}
        initialPickupPointId={place?.id}
        initialGroups={statusGroups ?? (place ? UPCOMING_GROUP_KEYS : [])}
      />
    </>
  );
}
