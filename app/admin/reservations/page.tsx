import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { daysLate, todayIso } from "@/lib/dates";
import { bookingStatusLabels, formatCents, formatDateShort, formatPhone, formatTime } from "@/lib/format";
import { ListActions } from "./list-actions";
import type { BookingStatus } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Réservations", robots: { index: false } };
export const dynamic = "force-dynamic";

const groups: { title: string; statuses: BookingStatus[]; hint?: string }[] = [
  { title: "À traiter", statuses: ["pending_review"], hint: "Demandes à accepter ou refuser, lieu et heure de remise ajustables." },
  { title: "En attente du client", statuses: ["date_proposed"] },
  { title: "À remettre", statuses: ["pending_payment", "confirmed"], hint: "Acceptées, la remise en main propre reste à faire." },
  { title: "En cours de location", statuses: ["picked_up"], hint: "Sets dehors, à enregistrer au retour." },
  { title: "Terminées et annulées", statuses: ["returned", "cancelled"] },
];

export default async function BookingsPage() {
  const today = todayIso();
  const bookings = await db.query.bookings.findMany({
    with: {
      customer: { columns: { firstName: true, lastName: true, phone: true, blocked: true } },
      set: { columns: { name: true } },
      pickupPoint: { columns: { name: true } },
    },
    orderBy: [asc(schema.bookings.startDate), desc(schema.bookings.createdAt)],
  });

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Réservations</h1>
      <p className="mt-3 text-slate-ink max-w-xl">
        Chaque demande passe par vous avant d&apos;être confirmée. Le client propose une heure
        de remise, vous la confirmez ou en proposez une autre.
      </p>

      {groups.map((g) => {
        const rows = bookings
          .filter((b) => g.statuses.includes(b.status))
          .sort((a, b) => (g.statuses[0] === "picked_up" ? a.endDate.localeCompare(b.endDate) : 0));
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
                {rows.map((b) => {
                  const late = b.status === "picked_up" ? daysLate(b.endDate, today) : 0;
                  return (
                    <li key={b.id} className="brick-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-ink">{b.reference}</p>
                          <Link href={`/admin/reservations/${b.id}`} className="display text-xl font-semibold text-ink-deep underline-offset-4 hover:underline">
                            {b.set.name}
                          </Link>
                          <p className="mt-1 text-slate-ink">
                            {b.customer.firstName} {b.customer.lastName}
                            {b.customer.phone ? ` · ${formatPhone(b.customer.phone)}` : ""}
                            {b.customer.blocked ? " · compte bloqué" : ""}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold px-2.5 py-1 rounded-md border ${
                            late > 0 ? "border-brick bg-brick text-paper" : "border-slate-ink/15 bg-sky"
                          }`}
                        >
                          {late > 0 ? `Retard de ${late} jour${late > 1 ? "s" : ""}` : bookingStatusLabels[b.status]}
                        </span>
                      </div>
                      <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 text-slate-ink">
                        <div className="sm:col-span-2">
                          <dt className="inline text-sm">Période de location : </dt>
                          <dd className="inline font-semibold text-ink-deep">
                            du {formatDateShort(b.startDate)} au {formatDateShort(b.endDate)}
                            <span className="font-normal text-slate-ink"> · {b.days} jour{b.days > 1 ? "s" : ""} · {formatCents(b.rentalCents)}</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="inline text-sm">Lieu de remise : </dt>
                          <dd className="inline font-semibold text-ink-deep">{b.pickupPoint?.name ?? "à convenir"}</dd>
                        </div>
                        <div>
                          <dt className="inline text-sm">Heure de remise : </dt>
                          <dd className="inline font-semibold text-ink-deep">{formatTime(b.pickupTime) ?? "à convenir"}</dd>
                        </div>
                      </dl>
                      {b.status === "pending_review" ? (
                        <ListActions bookingId={b.id} />
                      ) : (
                        <Link href={`/admin/reservations/${b.id}`} className="mt-4 inline-block font-bold underline underline-offset-4">
                          Voir la réservation
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}
