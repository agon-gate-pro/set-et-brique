"use client";

import { useActionState } from "react";
import { ConfirmButton, FormMessage, SubmitButton } from "@/components/admin/form";
import { daysLate, todayIso } from "@/lib/dates";
import { bookingStatusLabels, formatCents, formatDate } from "@/lib/format";
import type { Booking } from "@/lib/db/schema";
import { acceptProposedDate, cancelRequest } from "./actions";

const badge: Record<Booking["status"], string> = {
  pending_review: "bg-sun",
  date_proposed: "bg-sun",
  pending_payment: "bg-sky",
  confirmed: "bg-sky",
  picked_up: "bg-ink text-paper",
  returned: "bg-slate-200",
  cancelled: "bg-slate-200",
};

export function BookingCard({
  booking,
  setName,
  setSlug,
  pickupPoint,
}: {
  booking: Booking;
  setName: string;
  setSlug: string;
  pickupPoint: string | null;
}) {
  const [acceptState, acceptAction] = useActionState(acceptProposedDate, null);
  const [cancelState, cancelAction] = useActionState(cancelRequest, null);
  const cancellable = booking.status === "pending_review" || booking.status === "date_proposed";
  const late = booking.status === "picked_up" ? daysLate(booking.endDate, todayIso()) : 0;

  return (
    <li className="brick-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-ink">Référence {booking.reference}</p>
          <a href={`/catalogue/${setSlug}`} className="display text-xl font-semibold underline-offset-4 hover:underline">
            {setName}
          </a>
        </div>
        <span className={`text-sm font-bold px-2.5 py-1 rounded-md border border-slate-ink/15 ${late > 0 ? "bg-brick text-paper" : badge[booking.status]}`}>
          {late > 0 ? "Retour en retard" : bookingStatusLabels[booking.status]}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 text-slate-ink">
        <div>
          <dt className="text-sm">Remise</dt>
          <dd className="font-semibold text-ink-deep">{formatDate(booking.startDate)}</dd>
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
            {formatCents(booking.rentalCents)} pour {booking.days} jour{booking.days > 1 ? "s" : ""} · caution {formatCents(booking.depositCents)}
          </dd>
        </div>
      </dl>

      {booking.status === "pending_review" ? (
        <p className="mt-4 text-slate-ink">Nous examinons votre demande et revenons vers vous rapidement.</p>
      ) : null}

      {booking.status === "pending_payment" || booking.status === "confirmed" ? (
        <p className="mt-4 text-slate-ink">
          Remise prévue le {formatDate(booking.startDate)}. L&apos;heure exacte se convient avec nous par téléphone ou email.
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

      {booking.status === "returned" ? (
        <p className="mt-4 text-slate-ink">
          Set rendu{booking.returnedAt ? ` le ${formatDate(booking.returnedAt.toISOString().slice(0, 10))}` : ""}. Merci, et à bientôt !
        </p>
      ) : null}

      {booking.status === "date_proposed" && booking.proposedStartDate && booking.proposedEndDate ? (
        <div className="mt-4 rounded-xl border border-ink/20 bg-sky p-4">
          <p className="font-semibold text-ink-deep">
            Ces dates ne sont pas possibles. Nous vous proposons du {formatDate(booking.proposedStartDate)} au{" "}
            {formatDate(booking.proposedEndDate)}.
          </p>
          {booking.cancelReason ? <p className="mt-1 text-slate-ink">{booking.cancelReason}</p> : null}
          <form action={acceptAction} className="mt-3">
            <input type="hidden" name="id" value={booking.id} />
            <SubmitButton>Accepter ces dates</SubmitButton>
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
