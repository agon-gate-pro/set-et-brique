"use client";

import { useActionState } from "react";
import { ConfirmButton, Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form";
import type { Booking, Customer } from "@/lib/db/schema";
import { daysLate, todayIso } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { acceptBooking, markPickedUp, markReturned, proposeDate, refuseBooking, saveAdminNote, toggleCustomerBlock } from "../actions";

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

export function ReviewActions({ booking }: { booking: Booking }) {
  const [acceptState, acceptAction] = useActionState(acceptBooking, null);
  const [refuseState, refuseAction] = useActionState(refuseBooking, null);
  const [proposeState, proposeAction] = useActionState(proposeDate, null);
  const canAccept = booking.status === "pending_review";
  const canPropose = booking.status === "pending_review" || booking.status === "date_proposed";
  const canRefuse = canPropose || booking.status === "pending_payment";
  if (!canRefuse) return null;

  return (
    <section className="mt-8 brick-card p-6 bg-sun/30">
      <h2 className="text-2xl font-semibold">Décision</h2>

      {canAccept ? (
        <form action={acceptAction} className="mt-4">
          <input type="hidden" name="id" value={booking.id} />
          <SubmitButton>Accepter la demande</SubmitButton>
          <FormMessage state={acceptState} />
        </form>
      ) : null}

      {canPropose ? (
        <form action={proposeAction} className="mt-6 grid gap-4 sm:grid-cols-[10rem_8rem_1fr_auto] items-end">
          <input type="hidden" name="id" value={booking.id} />
          <h3 className="sm:col-span-4 font-bold">Proposer d&apos;autres dates</h3>
          <Field label="Remise le">
            <input name="startDate" type="date" required defaultValue={booking.proposedStartDate ?? booking.startDate} className={inputClass} />
          </Field>
          <Field label="Jours">
            <input name="days" type="number" min={1} required defaultValue={booking.days} className={inputClass} />
          </Field>
          <Field label="Message au client" hint="Facultatif">
            <input name="message" className={inputClass} placeholder="Le set revient le 12, on vous le remet le 16 ?" />
          </Field>
          <SubmitButton variant="paper">Proposer</SubmitButton>
          <div className="sm:col-span-4">
            <FormMessage state={proposeState} />
          </div>
        </form>
      ) : null}

      <form action={refuseAction} className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] items-end">
        <input type="hidden" name="id" value={booking.id} />
        <Field label="Refuser, avec un motif visible du client" hint="Facultatif">
          <input name="reason" className={inputClass} placeholder="Le set est immobilisé pour réparation" />
        </Field>
        <ConfirmButton confirmLabel="Oui, refuser">Refuser la demande</ConfirmButton>
        <div className="sm:col-span-2">
          <FormMessage state={refuseState} />
        </div>
      </form>
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
