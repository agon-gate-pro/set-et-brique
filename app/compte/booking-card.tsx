"use client";

import { useActionState, useEffect } from "react";
import { BellRing } from "lucide-react";
import { ConfirmButton, FormMessage, SubmitButton } from "@/components/admin/form";
import { daysLate, todayIso } from "@/lib/dates";
import { bookingStatusLabels, formatCents, formatDate, formatTime } from "@/lib/format";
import type { Booking } from "@/lib/db/schema";
import type { CustomerBooking } from "@/lib/bookings";
import type { CustomerExtensionView } from "@/lib/extensions";
import { hasUnseenHandoverChange } from "@/lib/handover";
import { acknowledgeHandoverChange, acceptProposedDate, cancelRequest } from "./actions";
import { ExtensionRequest } from "./extension-request";
import { PaymentSummary } from "./payment-summary";

const badge: Record<Booking["status"], string> = {
  pending_review: "bg-sun",
  date_proposed: "bg-sun",
  pending_payment: "badge-gold",
  confirmed: "badge-gold",
  picked_up: "bg-ink text-paper",
  returned: "bg-slate-200",
  cancelled: "bg-slate-200",
};

export function BookingCard({
  booking,
  setName,
  setSlug,
  pickupPoint,
  previousPickupPoint = null,
  openPayment = false,
  extension = null,
}: {
  booking: CustomerBooking;
  setName: string;
  setSlug: string;
  pickupPoint: string | null;
  /** Lieu tel que le client le connaissait avant une modification pas encore vue. */
  previousPickupPoint?: string | null;
  /** Ouvre d'office le récapitulatif de paiement (lien de l'e-mail d'acceptation). */
  openPayment?: boolean;
  /** Prolongation : état du bouton, dates possibles et demande en cours. Absent dans l'historique. */
  extension?: CustomerExtensionView | null;
}) {
  const [acceptState, acceptAction] = useActionState(acceptProposedDate, null);
  const [cancelState, cancelAction] = useActionState(cancelRequest, null);
  const [seenState, seenAction] = useActionState(acknowledgeHandoverChange, null);
  // Le client reste sur la page après avoir répondu : on prévient le header, qui relit sa pastille
  // d'actions en attente (même événement qu'après une mise à jour des coordonnées).
  useEffect(() => {
    if (acceptState?.ok || cancelState?.ok || seenState?.ok) window.dispatchEvent(new Event("customer-profile-updated"));
  }, [acceptState, cancelState, seenState]);
  const handoverChanged = hasUnseenHandoverChange(booking);
  const previousTime = formatTime(booking.previousPickupTime);
  const timeChanged = previousTime !== formatTime(booking.pickupTime);
  const placeChanged = previousPickupPoint !== pickupPoint;
  const cancellable = booking.status === "pending_review" || booking.status === "date_proposed";
  const late = booking.status === "picked_up" ? daysLate(booking.endDate, todayIso()) : 0;
  // Une prolongation en cours prime sur « En cours de location » : c'est elle qui attend quelque chose.
  const extensionStatus = extension?.current?.status ?? null;
  const statusBadge =
    late > 0
      ? { label: "Retour en retard", className: "bg-brick text-paper" }
      : extensionStatus === "pending_review"
        ? { label: "Prolongation demandée", className: "bg-sun" }
        : extensionStatus === "pending_payment"
          ? { label: "Prolongation à payer", className: "badge-gold" }
          : { label: bookingStatusLabels[booking.status], className: badge[booking.status] };

  return (
    <li className="brick-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-ink">Référence {booking.reference}</p>
          <a href={`/catalogue/${setSlug}`} className="display text-xl font-semibold underline-offset-4 hover:underline">
            {setName}
          </a>
        </div>
        <span className={`text-sm font-bold px-2.5 py-1 rounded-md border border-slate-ink/15 ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>

      {handoverChanged ? (
        // Modification du lieu ou de l'heure par Set et Brique : visible tant que le client ne l'a pas notée
        // (compte aussi dans la pastille du header). L'e-mail viendra avec les e-mails transactionnels.
        <div role="status" className="mt-4 rounded-xl border border-orange-500 bg-orange-50 p-4">
          <p className="flex items-center gap-2 font-bold text-orange-900">
            <BellRing aria-hidden="true" className="h-5 w-5 shrink-0" />
            La remise a été modifiée par Set et Brique
          </p>
          <dl className="mt-2 grid gap-1 text-ink-deep">
            <div>
              <dt className="inline text-slate-ink">Heure : </dt>
              <dd className="inline font-semibold">
                {timeChanged ? `${previousTime ?? "à convenir"} → ${formatTime(booking.pickupTime) ?? "à convenir"}` : `inchangée, ${formatTime(booking.pickupTime) ?? "à convenir"}`}
              </dd>
            </div>
            <div>
              <dt className="inline text-slate-ink">Lieu : </dt>
              <dd className="inline font-semibold">
                {placeChanged ? `${previousPickupPoint ?? "à convenir"} → ${pickupPoint ?? "à convenir"}` : `inchangé, ${pickupPoint ?? "à convenir"}`}
              </dd>
            </div>
          </dl>
          <form action={seenAction} className="mt-3 flex justify-end">
            <input type="hidden" name="id" value={booking.id} />
            <SubmitButton variant="leaf" className="text-sm py-2 px-4">
              J&apos;ai bien noté
            </SubmitButton>
          </form>
        </div>
      ) : null}

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 text-slate-ink">
        <div>
          <dt className="text-sm">Remise</dt>
          <dd className="font-semibold text-ink-deep">
            {formatDate(booking.startDate)}
            {booking.pickupTime ? ` à ${formatTime(booking.pickupTime)}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-sm">Retour</dt>
          <dd className="font-semibold text-ink-deep">{formatDate(booking.endDate)}</dd>
        </div>
        <div>
          <dt className="text-sm">Lieu</dt>
          <dd className="font-semibold text-ink-deep">{pickupPoint ?? "à convenir"}</dd>
        </div>
        <div>
          <dt className="text-sm">Montant</dt>
          <dd className="font-semibold text-ink-deep">
            {formatCents(booking.rentalCents)} pour {booking.days} jour{booking.days > 1 ? "s" : ""}
            {booking.disassemblyCents != null ? ` + ${formatCents(booking.disassemblyCents)} set rendu monté` : ""} · caution{" "}
            {formatCents(booking.depositCents)}
          </dd>
        </div>
      </dl>

      {booking.status === "pending_review" ? (
        <p className="mt-4 text-slate-ink">Nous examinons votre demande et revenons vers vous rapidement.</p>
      ) : null}

      {booking.status === "pending_payment" ? (
        <PaymentSummary booking={booking} setName={setName} pickupPoint={pickupPoint} initiallyOpen={openPayment} />
      ) : null}

      {booking.status === "pending_payment" || booking.status === "confirmed" ? (
        <p className="mt-4 text-slate-ink">
          Remise prévue le {formatDate(booking.startDate)}
          {booking.pickupTime ? ` à ${formatTime(booking.pickupTime)}` : ""}. Si nous devons modifier le lieu ou l&apos;heure,
          vous le verrez ici.
        </p>
      ) : null}

      {booking.status === "picked_up" ? (
        late > 0 ? (
          <p className="mt-4 font-semibold text-brick-deep">
            Le set était à rendre le {formatDate(booking.endDate)}, il y a {late} jour{late > 1 ? "s" : ""}. Merci de nous
            contacter au plus vite pour convenir du retour.
          </p>
        ) : (
          <p className="mt-4 text-slate-ink">
            Set récupéré{booking.pickedUpAt ? ` le ${formatDate(booking.pickedUpAt.toISOString().slice(0, 10))}` : ""}. À rendre le{" "}
            {formatDate(booking.endDate)}, à l&apos;heure qui vous arrange.
          </p>
        )
      ) : null}

      {extension ? (
        <ExtensionRequest
          bookingId={booking.id}
          setName={setName}
          reference={booking.reference}
          endDate={booking.endDate}
          window={extension.window}
          options={extension.options}
          extension={extension.current}
          last={extension.last}
        />
      ) : null}

      {booking.status === "returned" ? (
        <p className="mt-4 text-slate-ink">
          Set rendu{booking.returnedAt ? ` le ${formatDate(booking.returnedAt.toISOString().slice(0, 10))}` : ""}. Merci, et à bientôt !
        </p>
      ) : null}

      {booking.status === "date_proposed" && booking.proposedStartDate && booking.proposedEndDate ? (
        <div className="mt-4 rounded-xl border border-ink/20 bg-sky p-4">
          <p className="font-semibold text-ink-deep">
            Ces dates ne sont pas possibles. Nous vous proposons du {formatDate(booking.proposedStartDate)} au{" "}
            {formatDate(booking.proposedEndDate)}
            {booking.pickupTime ? `, remise à ${formatTime(booking.pickupTime)}` : ""}.
          </p>
          {booking.cancelReason ? <p className="mt-1 text-slate-ink">{booking.cancelReason}</p> : null}
          <form action={acceptAction} className="mt-3">
            <input type="hidden" name="id" value={booking.id} />
            <SubmitButton variant="leaf">Accepter ces dates</SubmitButton>
            <FormMessage state={acceptState} />
          </form>
        </div>
      ) : null}

      {booking.status === "cancelled" && booking.cancelReason ? (
        <p className="mt-4 text-slate-ink">{booking.cancelReason}</p>
      ) : null}

      {cancellable ? (
        <form action={cancelAction} className="mt-4">
          <input type="hidden" name="id" value={booking.id} />
          <ConfirmButton confirmLabel="Oui, annuler ma demande">
            {booking.status === "date_proposed" ? "Refuser et annuler" : "Annuler ma demande"}
          </ConfirmButton>
          <FormMessage state={cancelState} />
        </form>
      ) : null}
    </li>
  );
}
