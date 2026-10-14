import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { Bot, Store, User } from "lucide-react";
import { db, schema } from "@/lib/db";
import { adminBookingStatusLabels, depositStateLabel, formatCents, formatDate, formatPhone, formatTime, phoneHref } from "@/lib/format";
import { placeDepositHoldIfDue } from "@/lib/deposits";
import { cardPaidCents } from "@/lib/payments";
import { daysLate, todayIso } from "@/lib/dates";
import { AdminNoteForm, CancelPaidActions, CustomerBlockForm, DepositActions, ExtensionActions, HandoverActions, PaymentActions, ReviewActions } from "./forms";
import { expireStaleExtensions } from "@/lib/extensions";
import { getSetting } from "@/lib/settings";
import { BookingTabs } from "./tabs";
import { extensionEventBadge, neutralBadge, statusTone } from "../status-tone";
import { requireRole } from "@/lib/auth";
import { hasUnseenHandoverChange } from "@/lib/handover";
import { expireOverduePayments } from "@/lib/payment-expiry";
import { AdminPageTitle } from "@/components/admin/sections";

export const metadata: Metadata = { title: "Réservation", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Auteur d'une ligne d'historique : une icône et un nom, pour le repérer d'un coup d'œil dans la colonne. */
const actors = {
  customer: { label: "Client", icon: User },
  admin: { label: "Gérants", icon: Store },
  system: { label: "Système", icon: Bot },
} as const;
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
  // Prolongation restée sans réponse ou sans paiement à temps : expirée avant d'afficher la fiche.
  await expireStaleExtensions();
  const { id } = await params;
  // Jour de remise arrivé et empreinte de caution pas encore tentée (paiement enregistré après le
  // passage du matin, par exemple) : posée avant d'afficher la fiche, pour que les gérants voient
  // où elle en est au moment de remettre le set. Un échec technique ne bloque pas l'affichage.
  await placeDepositHoldIfDue(id).catch((e) => console.error("[stripe] empreinte de caution à l'ouverture de la fiche", id, e));
  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, id),
    with: {
      customer: true,
      set: { columns: { id: true, name: true, slug: true } },
      copy: { columns: { label: true, status: true } },
      pickupPoint: { columns: { name: true } },
      // Historique et e-mails : le plus récent en haut (13 octobre 2026), c'est lui qu'on vient lire.
      events: { orderBy: [desc(schema.bookingEvents.createdAt)] },
      // La plus récente suffit : une seule demande peut être en cours à la fois.
      extensions: { orderBy: [desc(schema.bookingExtensions.createdAt)], limit: 1 },
    },
  });
  if (!booking) notFound();
  const emails = await db
    .select()
    .from(schema.emailLog)
    .where(eq(schema.emailLog.bookingId, id))
    .orderBy(desc(schema.emailLog.createdAt));
  const paymentDelayHours = await getSetting("payment_delay_hours");
  const pickupPoints = await db
    .select({ id: schema.pickupPoints.id, name: schema.pickupPoints.name })
    .from(schema.pickupPoints)
    .where(eq(schema.pickupPoints.active, true))
    .orderBy(asc(schema.pickupPoints.sortOrder), asc(schema.pickupPoints.createdAt));
  const { customer, set, copy, pickupPoint, events, extensions, ...b } = booking;
  const extension = extensions[0] ?? null;
  const extensionLabel =
    extension?.status === "pending_review" ? "Prolongation demandée" : extension?.status === "pending_payment" ? "Prolongation à payer" : null;
  const late = b.status === "picked_up" ? daysLate(b.endDate, todayIso()) : 0;
  // Réservation payée : ce que le client a réglé par carte, pour proposer le remboursement en cas d'annulation.
  const cardPaid =
    b.status === "confirmed"
      ? await cardPaidCents(b).catch((e) => {
          console.error("[stripe] paiement de la réservation", id, e);
          return 0;
        })
      : 0;

  return (
    <>
      <Link href="/admin/reservations" className="font-bold underline underline-offset-4">
        Retour aux réservations
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <AdminPageTitle section="/admin/reservations">{b.reference}</AdminPageTitle>
        <span className={`text-sm font-bold px-2 py-1 rounded-md border ${statusTone(b.status)?.badge ?? neutralBadge}`}>
          {adminBookingStatusLabels[b.status]}
        </span>
        {extensionLabel ? (
          <span className={`text-sm font-bold px-2 py-1 rounded-md border ${statusTone(extension!.status === "pending_review" ? "pending_review" : "pending_payment")?.badge ?? neutralBadge}`}>
            {extensionLabel}
          </span>
        ) : null}
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
      <ExtensionActions extension={extension} endDate={b.endDate} />
      <HandoverActions booking={b} />
      <DepositActions booking={b} />
      <CancelPaidActions booking={b} cardPaidCents={cardPaid} />

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
                    {/* État de l'empreinte de caution (`lib/deposits.ts`) : rouge quand elle est refusée, orange quand une somme
                        est retenue (demande d'Agon-Gate, 14 octobre 2026 : la retenue passait inaperçue). */}
                    {depositStateLabel(b) ? (
                      <span
                        className={`block text-sm ${
                          b.depositStatus === "failed"
                            ? "font-bold text-brick-deep"
                            : b.depositStatus === "captured"
                              ? "font-bold text-orange-700"
                              : "text-slate-ink"
                        }`}
                      >
                        {depositStateLabel(b)}
                      </span>
                    ) : null}
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
              // Une ligne par événement, séparée par un filet. Sur grand écran tout tient sur une seule
              // ligne : date, texte (coupé par « … » s'il est trop long, entier au survol), puis à droite
              // le nouvel état en pastille de sa couleur et l'auteur, ou le destinataire de l'e-mail.
              // Les lignes des événements partagent une même grille (`subgrid`) : la colonne des pastilles
              // prend la largeur de la plus longue et toutes commencent au même endroit, à gauche.
              // Sur téléphone, les éléments s'empilent et le texte passe à la ligne.
              <>
                <ol className="divide-y divide-slate-ink/10 text-sm sm:grid sm:grid-cols-[7.5rem_minmax(0,1fr)_auto_auto] sm:gap-x-4">
                  {events.map((e) => {
                    // Nouvel état de la location, sinon l'étape d'une prolongation (qui ne change pas cet état).
                    const badge = e.toStatus
                      ? { label: adminBookingStatusLabels[e.toStatus], badge: statusTone(e.toStatus)?.badge ?? neutralBadge }
                      : extensionEventBadge(e.message);
                    const actor = actors[e.actor];
                    return (
                      <li key={e.id} className="grid items-center gap-y-1 py-2 first:pt-0 sm:col-span-4 sm:grid-cols-subgrid">
                        <span className="text-slate-ink tabular-nums whitespace-nowrap">{dateTime.format(e.createdAt)}</span>
                        <span className="font-semibold text-ink-deep break-words sm:truncate" title={e.message ?? undefined}>
                          {e.message ?? ""}
                        </span>
                        <span className="justify-self-start">
                          {badge ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${badge.badge}`}>{badge.label}</span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-ink-deep whitespace-nowrap">
                          <actor.icon className="h-4 w-4 shrink-0 text-slate-ink" aria-hidden="true" />
                          {actor.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {emails.length > 0 ? (
                  <>
                    <h3 className="mt-4 border-t border-slate-ink/10 pt-5 font-bold text-ink-deep">E-mails</h3>
                    <ol className="mt-3 divide-y divide-slate-ink/10 text-sm">
                      {emails.map((m) => (
                        <li key={m.id} className="grid items-center gap-x-4 gap-y-1 py-2 first:pt-0 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]">
                          <span className="text-slate-ink tabular-nums whitespace-nowrap">{dateTime.format(m.createdAt)}</span>
                          <span className="font-semibold text-ink-deep break-words sm:truncate" title={m.subject}>
                            {m.subject}
                          </span>
                          <span className="text-slate-ink break-words sm:whitespace-nowrap">
                            {m.recipient} ·{" "}
                            <span className={m.status === "failed" ? "font-bold text-brick-deep" : ""}>
                              {emailStatusLabels[m.status] ?? m.status}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : null}
              </>
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
