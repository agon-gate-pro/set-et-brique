"use client";

import { useActionState } from "react";
import { ConfirmButton, Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form";
import type { Booking, Customer } from "@/lib/db/schema";
import { daysLate, todayIso } from "@/lib/dates";
import { formatDate, formatTime } from "@/lib/format";
import { acceptBooking, markPickedUp, markReturned, refuseBooking, saveAdminNote, toggleCustomerBlock, updateHandover } from "../actions";

/** Remise en main propre puis retour du set : les deux gestes du quotidien. */
export function HandoverActions({ booking }: { booking: Booking }) {
  const [pickupState, pickupAction] = useActionState(markPickedUp, null);
  const [returnState, returnAction] = useActionState(markReturned, null);
  const today = todayIso();

  if (booking.status === "pending_payment" || booking.status === "confirmed") {
    return (
      <section className="mt-8 brick-card p-6 bg-sky">
        <h2 className="text-2xl font-semibold">Remise du set</h2>
        <p className="mt-2 text-slate-ink">
          À enregistrer une fois le set remis en main propre, remise prévue le {formatDate(booking.startDate)}.
          {booking.status === "pending_payment" ? " Le loyer peut être réglé sur place par TPE." : ""}
        </p>
        <form action={pickupAction} className="mt-4 grid gap-4 sm:grid-cols-[10rem_1fr_auto] items-end">
          <input type="hidden" name="id" value={booking.id} />
          <Field label="Remis le">
            <input name="date" type="date" required max={today} defaultValue={today} className={inputClass} />
          </Field>
          <Field label="Précision" hint="Facultatif, pour l'historique">
            <input name="note" className={inputClass} placeholder="Loyer encaissé par TPE" />
          </Field>
          <SubmitButton>Set remis</SubmitButton>
          <div className="sm:col-span-3">
            <FormMessage state={pickupState} />
          </div>
        </form>
      </section>
    );
  }

  if (booking.status === "picked_up") {
    const late = daysLate(booking.endDate, today);
    return (
      <section className={`mt-8 brick-card p-6 ${late > 0 ? "bg-brick/10 border-brick" : "bg-sky"}`}>
        <h2 className="text-2xl font-semibold">Retour du set</h2>
        <p className={`mt-2 ${late > 0 ? "font-bold text-brick-deep" : "text-slate-ink"}`}>
          {late > 0
            ? `En retard de ${late} jour${late > 1 ? "s" : ""} : retour attendu le ${formatDate(booking.endDate)}.`
            : `Retour attendu le ${formatDate(booking.endDate)}.`}
        </p>
        <form action={returnAction} className="mt-4 grid gap-4">
          <input type="hidden" name="id" value={booking.id} />
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr] items-end">
            <Field label="Rendu le">
              <input name="date" type="date" required max={today} defaultValue={today} className={inputClass} />
            </Field>
          </div>
          <Field label="État des lieux" hint="Commentaire libre : pièces manquantes, sachets, notices, figurines. Jamais visible du client.">
            <textarea name="returnNote" rows={3} className={inputClass} placeholder="Complet, sachets refaits. Une figurine sans son casque." />
          </Field>
          <div>
            <SubmitButton>Set rendu</SubmitButton>
          </div>
          <FormMessage state={returnState} />
        </form>
      </section>
    );
  }

  return null;
}

export function ReviewActions({
  booking,
  pickupPoints,
}: {
  booking: Booking;
  pickupPoints: { id: string; name: string }[];
}) {
  const [acceptState, acceptAction] = useActionState(acceptBooking, null);
  const [refuseState, refuseAction] = useActionState(refuseBooking, null);
  const [handoverState, handoverAction] = useActionState(updateHandover, null);
  const canAccept = booking.status === "pending_review";
  const canRefuse = booking.status === "pending_review" || booking.status === "pending_payment";
  if (!canRefuse) return null;

  return (
    <section id="decision" className="mt-8 brick-card p-6 bg-sun/30 scroll-mt-24">
      <h2 className="text-2xl font-semibold">Décision</h2>
      <p className="mt-2 text-slate-ink">
        Les dates et la durée sont celles choisies par le client, elles ne se modifient pas. Vous pouvez
        ajuster le lieu et l&apos;heure de remise avant d&apos;accepter.
      </p>

      <form action={handoverAction} className="mt-6 grid gap-4 sm:grid-cols-[1fr_9rem_auto] items-end">
        <input type="hidden" name="id" value={booking.id} />
        <h3 className="sm:col-span-3 font-bold">Modifier la remise</h3>
        <Field label="Lieu de remise">
          <select name="pickupPointId" required defaultValue={booking.pickupPointId ?? ""} className={inputClass}>
            {pickupPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Heure de remise">
          <input name="pickupTime" type="time" required step={900} defaultValue={formatTime(booking.pickupTime) ?? ""} className={inputClass} />
        </Field>
        <SubmitButton variant="sun">Modifier</SubmitButton>
        <div className="sm:col-span-3">
          <FormMessage state={handoverState} />
        </div>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr_auto] items-end">
        {canAccept ? (
          <form action={acceptAction}>
            <input type="hidden" name="id" value={booking.id} />
            <SubmitButton variant="leaf">Accepter la demande</SubmitButton>
            <FormMessage state={acceptState} />
          </form>
        ) : (
          <div />
        )}
        <form action={refuseAction} className="sm:col-span-2 grid gap-4 sm:grid-cols-[1fr_auto] items-end">
          <input type="hidden" name="id" value={booking.id} />
          <Field label="Motif du refus, visible du client" hint="Facultatif">
            <input name="reason" className={inputClass} placeholder="Le set est immobilisé pour réparation" />
          </Field>
          <ConfirmButton confirmLabel="Oui, refuser" className="btn btn-brick text-paper no-underline">
            Refuser la demande
          </ConfirmButton>
          <div className="sm:col-span-2">
            <FormMessage state={refuseState} />
          </div>
        </form>
      </div>
    </section>
  );
}

export function AdminNoteForm({ booking }: { booking: Booking }) {
  const [state, action] = useActionState(saveAdminNote, null);
  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="id" value={booking.id} />
      <Field label="Note interne" hint="Jamais visible du client">
        <textarea name="adminNote" rows={3} defaultValue={booking.adminNote ?? ""} className={inputClass} />
      </Field>
      <div>
        <SubmitButton variant="paper">Enregistrer la note</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function CustomerBlockForm({ customer, bookingId }: { customer: Customer; bookingId: string }) {
  const [state, action] = useActionState(toggleCustomerBlock, null);
  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="customerId" value={customer.id} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="blocked" value={customer.blocked ? "false" : "true"} />
      {customer.blocked ? (
        <>
          <p className="font-semibold text-brick-deep">
            Compte bloqué{customer.blockedReason ? ` : ${customer.blockedReason}` : ""}.
          </p>
          <div>
            <SubmitButton variant="paper">Débloquer ce client</SubmitButton>
          </div>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
          <Field label="Bloquer ce client" hint="Il ne pourra plus réserver. Motif pour vous.">
            <input name="reason" className={inputClass} placeholder="Set non rendu" />
          </Field>
          <ConfirmButton confirmLabel="Oui, bloquer">Bloquer</ConfirmButton>
        </div>
      )}
      <FormMessage state={state} />
    </form>
  );
}
