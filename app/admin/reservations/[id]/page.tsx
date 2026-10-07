import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { bookingStatusLabels, formatCents, formatDate, formatPhone, formatTime, phoneHref } from "@/lib/format";
import { daysLate, todayIso } from "@/lib/dates";
import { AdminNoteForm, CustomerBlockForm, HandoverActions, PaymentActions, ReviewActions } from "./forms";
import { getSetting } from "@/lib/settings";
import { BookingTabs } from "./tabs";
import { neutralBadge, statusTone } from "../status-tone";
import { requireRole } from "@/lib/auth";
import { hasUnseenHandoverChange } from "@/lib/handover";
import { expireOverduePayments } from "@/lib/payment-expiry";

export const metadata: Metadata = { title: "Réservation", robots: { index: false } };
export const dynamic = "force-dynamic";

const actorLabels = { customer: "client", admin: "gérants", system: "système" } as const;
const emailStatusLabels: Record<string, string> = {
  sent: "envoyé",
  failed: "échec de l'envoi",
  skipped: "non envoyé, Resend pas configuré",
  pending: "en cours",
};
const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function BookingPage({ params }: PageProps<"/admin/reservations/[id]">) {
  await requireRole("admin");
  // Demande acceptée non payée dans le délai : annulée avant d'afficher la fiche.
  await expireOverduePayments();
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
  const emails = await db
    .select()
    .from(schema.emailLog)
    .where(eq(schema.emailLog.bookingId, id))
    .orderBy(asc(schema.emailLog.createdAt));
  const paymentDelayHours = await getSetting("payment_delay_hours");
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
        <span className={`text-sm font-bold px-2 py-1 rounded-md border ${statusTone(b.status)?.badge ?? neutralBadge}`}>
          {bookingStatusLabels[b.status]}
        </span>
        {late > 0 ? (
          <span className="text-sm font-bold px-2 py-1 rounded-md border border-brick bg-brick text-paper">
            Retard de {late} jour{late > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {hasUnseenHandoverChange(b) && b.handoverChangedAt ? (
        <p className="mt-3 inline-block rounded-md border border-orange-500 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-900">
          Le client n&apos;a pas encore vu la modification de la remise du {dateTime.format(b.handoverChangedAt)}.
        </p>
      ) : null}

      {/* Décision d'abord, c'est ce qu'on vient faire ; le détail est dans les onglets en dessous. */}
      <ReviewActions booking={b} pickupPoints={pickupPoints} />
      <PaymentActions booking={b} delayHours={paymentDelayHours} />
      <HandoverActions booking={b} />

      <BookingTabs
        tabs={[
          {
            id: "location",
            label: "Location",
            content: (
              <>
                {/* Mêmes blocs titrés que l'aperçu du tableau (`booking-dialog.tsx`) : quoi, combien, quand, où. */}
                <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <Block label="Set">
                    <Link href={`/admin/sets/${set.id}`} className="block font-semibold text-ink-deep underline underline-offset-4">
                      {set.name}
                    </Link>
                    <span className="block text-sm text-slate-ink">{copy ? copy.label : "Aucun exemplaire attribué"}</span>
                  </Block>
                  <Block label="Montant">
                    <span className="display block text-2xl font-bold leading-tight text-leaf-deep">
                      {formatCents(b.rentalCents + (b.disassemblyCents ?? 0))}
                    </span>
                    <span className="block text-sm text-slate-ink">
                      {b.days} jour{b.days > 1 ? "s" : ""} × {formatCents(Math.round(b.rentalCents / b.days))}
                    </span>
                    <span className="block text-sm text-slate-ink">
                      {b.disassemblyCents != null ? `+ ${formatCents(b.disassemblyCents)} rendu monté` : "Rendu monté : non"}
                    </span>
                    <span className="block text-sm text-slate-ink">Caution {formatCents(b.depositCents)}</span>
                  </Block>
                  <Block label="Remise">
                    <span className="block font-semibold text-ink-deep">
                      {formatDate(b.startDate)}
                      {b.pickupTime ? ` · ${formatTime(b.pickupTime)}` : ""}
                    </span>
                    {b.pickupTime ? null : <span className="block text-sm text-slate-ink">Heure à convenir</span>}
                    <span className="block text-sm text-slate-ink">{pickupPoint?.name ?? "Lieu à convenir"}</span>
                  </Block>
                  <Block label="Retour">
                    <span className={`block font-semibold ${late > 0 ? "text-brick-deep" : "text-ink-deep"}`}>
                      {formatDate(b.endDate)}
                    </span>
                    <span className="block text-sm text-slate-ink">
                      {b.days} jour{b.days > 1 ? "s" : ""} de location
                    </span>
                  </Block>
                </dl>

                {b.proposedStartDate && b.proposedEndDate ? (
                  <Callout label="Dates proposées, en attente du client">
                    du {formatDate(b.proposedStartDate)} au {formatDate(b.proposedEndDate)}
                  </Callout>
                ) : null}
                {b.customerNote ? <Callout label="Message du client">{b.customerNote}</Callout> : null}
                {b.returnNote ? <Callout label="État des lieux au retour">{b.returnNote}</Callout> : null}
                {b.cancelReason && b.status === "cancelled" ? (
                  <Callout label="Motif de l'annulation" tone="brick">
                    {b.cancelReason}
                  </Callout>
                ) : null}

                <p className="mt-5 text-sm text-slate-ink">
                  Demande faite le {dateTime.format(b.createdAt)}
                  {b.pickedUpAt ? ` · Remis le ${dateTime.format(b.pickedUpAt)}` : ""}
                  {b.returnedAt ? ` · Rendu le ${dateTime.format(b.returnedAt)}` : ""}
                </p>

                <AdminNoteForm booking={b} />
              </>
            ),
          },
          {
            id: "client",
            label: "Client",
            content: (
              <>
                <dl className="grid gap-2">
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
              </>
            ),
          },
          {
            id: "historique",
            label: "Historique",
            content: (
              <ol className="space-y-2 text-slate-ink">
                {events.map((e) => (
                  <li key={e.id}>
                    <span className="text-sm">{dateTime.format(e.createdAt)}</span> · {e.message ?? ""}
                    {e.toStatus ? ` → ${bookingStatusLabels[e.toStatus]}` : ""} <span className="text-sm">({actorLabels[e.actor]})</span>
                  </li>
                ))}
                {emails.length > 0 ? (
                  <li className="pt-3 mt-3 border-t border-slate-ink/10 font-semibold text-ink-deep">E-mails</li>
                ) : null}
                {emails.map((m) => (
                  <li key={m.id}>
                    <span className="text-sm">{dateTime.format(m.createdAt)}</span> · {m.subject}{" "}
                    <span className="text-sm">
                      ({m.recipient}, {emailStatusLabels[m.status] ?? m.status})
                    </span>
                  </li>
                ))}
              </ol>
            ),
          },
        ]}
      />
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

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-ink">{label}</dt>
      <dd className="mt-1 break-words">{children}</dd>
    </div>
  );
}

/** Encadré pour une information propre à cette réservation (message, état des lieux, motif…). */
function Callout({ label, tone = "sky", children }: { label: string; tone?: "sky" | "brick"; children: React.ReactNode }) {
  return (
    <div
      className={`mt-5 rounded-xl border p-4 ${tone === "brick" ? "border-brick/30 bg-red-50" : "border-slate-ink/15 bg-sky"}`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-slate-ink">{label}</p>
      <p className="mt-1 whitespace-pre-line text-ink-deep">{children}</p>
    </div>
  );
}
