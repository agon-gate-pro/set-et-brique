import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { bookingStatusLabels, formatCents, formatDate, formatPhone, formatTime, phoneHref } from "@/lib/format";
import { daysLate, todayIso } from "@/lib/dates";
import { AdminNoteForm, CustomerBlockForm, HandoverActions, ReviewActions } from "./forms";

export const metadata: Metadata = { title: "Réservation", robots: { index: false } };
export const dynamic = "force-dynamic";

const actorLabels = { customer: "client", admin: "gérants", system: "système" } as const;
const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function BookingPage({ params }: PageProps<"/admin/reservations/[id]">) {
  const { id } = await params;
  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, id),
    with: {
      customer: true,
      set: { columns: { id: true, name: true, slug: true } },
      copy: { columns: { label: true, status: true } },
      pickupPoint: { columns: { name: true } },
      events: { orderBy: [asc(schema.bookingEvents.createdAt)] },
    },
  });
  if (!booking) notFound();
  const pickupPoints = await db
    .select({ id: schema.pickupPoints.id, name: schema.pickupPoints.name })
    .from(schema.pickupPoints)
    .where(eq(schema.pickupPoints.active, true))
    .orderBy(asc(schema.pickupPoints.sortOrder), asc(schema.pickupPoints.createdAt));
  const { customer, set, copy, pickupPoint, events, ...b } = booking;
  const late = b.status === "picked_up" ? daysLate(b.endDate, todayIso()) : 0;

  return (
    <>
      <Link href="/admin/reservations" className="font-bold underline underline-offset-4">
        Retour aux réservations
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold">{b.reference}</h1>
        <span className="text-sm font-bold px-2 py-1 rounded-md border border-slate-ink/15 bg-paper">
          {bookingStatusLabels[b.status]}
        </span>
        {late > 0 ? (
          <span className="text-sm font-bold px-2 py-1 rounded-md border border-brick bg-brick text-paper">
            Retard de {late} jour{late > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="brick-card p-6">
          <h2 className="text-2xl font-semibold">Location</h2>
          <dl className="mt-4 grid gap-2">
            <Row label="Set">
              <Link href={`/admin/sets/${set.id}`} className="underline underline-offset-4">
                {set.name}
              </Link>
              {copy ? ` · ${copy.label}` : " · aucun exemplaire attribué"}
            </Row>
            <Row label="Remise">
              {formatDate(b.startDate)}
              {b.pickupTime ? ` à ${formatTime(b.pickupTime)}` : ", heure à convenir"}
            </Row>
            <Row label="Retour">
              {formatDate(b.endDate)} ({b.days} jour{b.days > 1 ? "s" : ""})
            </Row>
            {b.proposedStartDate && b.proposedEndDate ? (
              <Row label="Dates proposées">
                du {formatDate(b.proposedStartDate)} au {formatDate(b.proposedEndDate)}, en attente du client
              </Row>
            ) : null}
            <Row label="Lieu">{pickupPoint?.name ?? "—"}</Row>
            <Row label="Location">{formatCents(b.rentalCents)}</Row>
            <Row label="Caution">{formatCents(b.depositCents)}</Row>
            <Row label="Demande faite le">{dateTime.format(b.createdAt)}</Row>
            {b.pickedUpAt ? <Row label="Remis le">{dateTime.format(b.pickedUpAt)}</Row> : null}
            {b.returnedAt ? <Row label="Rendu le">{dateTime.format(b.returnedAt)}</Row> : null}
            {b.returnNote ? <Row label="État des lieux">{b.returnNote}</Row> : null}
            {b.customerNote ? <Row label="Message du client">{b.customerNote}</Row> : null}
            {b.cancelReason && b.status === "cancelled" ? <Row label="Motif">{b.cancelReason}</Row> : null}
          </dl>
          <AdminNoteForm booking={b} />
        </section>

        <section className="brick-card p-6">
          <h2 className="text-2xl font-semibold">Client</h2>
          <dl className="mt-4 grid gap-2">
            <Row label="Nom">
              {customer.firstName} {customer.lastName}
            </Row>
            <Row label="Email">
              <a href={`mailto:${customer.email}`} className="underline underline-offset-4">
                {customer.email}
              </a>
            </Row>
            <Row label="Téléphone">
              {customer.phone ? (
                <a href={phoneHref(customer.phone)} className="underline underline-offset-4">
                  {formatPhone(customer.phone)}
                </a>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Adresse">
              {[customer.addressLine, [customer.postalCode, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}
            </Row>
          </dl>
          <CustomerBlockForm customer={customer} bookingId={b.id} />
        </section>
      </div>

      <ReviewActions booking={b} pickupPoints={pickupPoints} />
      <HandoverActions booking={b} />

      <section className="mt-8 brick-card p-6">
        <h2 className="text-2xl font-semibold">Historique</h2>
        <ol className="mt-4 space-y-2 text-slate-ink">
          {events.map((e) => (
            <li key={e.id}>
              <span className="text-sm">{dateTime.format(e.createdAt)}</span> · {e.message ?? ""}
              {e.toStatus ? ` → ${bookingStatusLabels[e.toStatus]}` : ""} <span className="text-sm">({actorLabels[e.actor]})</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2">
      <dt className="text-slate-ink">{label}</dt>
      <dd className="font-semibold text-ink-deep">{children}</dd>
    </div>
  );
}
