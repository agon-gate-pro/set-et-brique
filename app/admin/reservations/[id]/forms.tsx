"use client";

import { useActionState } from "react";
import { ConfirmButton, Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form";
import type { Booking, Customer } from "@/lib/db/schema";
import { acceptBooking, proposeDate, refuseBooking, saveAdminNote, toggleCustomerBlock } from "../actions";

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
