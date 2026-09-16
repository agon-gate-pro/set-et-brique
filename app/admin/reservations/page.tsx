import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { bookingStatusLabels, formatCents, formatDate } from "@/lib/format";
import type { BookingStatus } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Réservations", robots: { index: false } };
export const dynamic = "force-dynamic";

const groups: { title: string; statuses: BookingStatus[]; hint?: string }[] = [
  { title: "À traiter", statuses: ["pending_review"], hint: "Demandes à accepter, refuser ou décaler." },
  { title: "En attente du client", statuses: ["date_proposed"], hint: "Vous avez proposé d'autres dates." },
  { title: "Acceptées et en cours", statuses: ["pending_payment", "confirmed", "picked_up"] },
  { title: "Terminées et annulées", statuses: ["returned", "cancelled"] },
];

export default async function BookingsPage() {
  const bookings = await db.query.bookings.findMany({
    with: {
      customer: { columns: { firstName: true, lastName: true, blocked: true } },
      set: { columns: { name: true } },
      pickupPoint: { columns: { name: true } },
    },
    orderBy: [asc(schema.bookings.startDate), desc(schema.bookings.createdAt)],
  });

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Réservations</h1>
      <p className="mt-3 text-slate-ink max-w-xl">
        Chaque demande passe par vous avant d&apos;être confirmée. L&apos;heure de remise se
        convient directement avec le client, par téléphone ou email.
      </p>

      {groups.map((g) => {
        const rows = bookings.filter((b) => g.statuses.includes(b.status));
        if (rows.length === 0 && g.statuses[0] !== "pending_review") return null;
        return (
          <section key={g.title} className="mt-10">
            <h2 className="text-2xl font-semibold">
              {g.title}
              {rows.length > 0 ? <span className="ml-3 text-base font-bold bg-sun px-2 py-0.5 rounded-md">{rows.length}</span> : null}
            </h2>
            {g.hint ? <p className="mt-1 text-slate-ink">{g.hint}</p> : null}
            {rows.length === 0 ? (
              <p className="mt-4 brick-card p-5 bg-sky max-w-xl">Rien à traiter.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {rows.map((b) => (
                  <li key={b.id}>
                    <Link href={`/admin/reservations/${b.id}`} className="brick-card p-4 grid gap-2 sm:grid-cols-[8rem_1fr_auto] items-center hover:bg-sky">
                      <span className="font-bold">{b.reference}</span>
                      <span>
                        <span className="display text-lg font-semibold block">{b.set.name}</span>
                        <span className="block text-sm text-slate-ink">
                          {b.customer.firstName} {b.customer.lastName}
                          {b.customer.blocked ? " · compte bloqué" : ""} · du {formatDate(b.startDate)} au {formatDate(b.endDate)} · {b.pickupPoint?.name ?? "lieu à convenir"} ·{" "}
                          {formatCents(b.rentalCents)}
                        </span>
                      </span>
                      <span className="justify-self-start sm:justify-self-end text-sm font-bold px-2 py-1 rounded-md border border-slate-ink/15 bg-paper">
                        {bookingStatusLabels[b.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}
