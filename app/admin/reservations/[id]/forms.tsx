"use client";

import { useActionState, useState } from "react";
import { useFormDirty } from "@/lib/use-form-dirty";
import { ConfirmButton, Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form";
import type { Booking, BookingExtension, Customer } from "@/lib/db/schema";
import { daysLate, todayIso } from "@/lib/dates";
import { formatCents, formatDate, formatTime } from "@/lib/format";
import { paymentMethods } from "@/lib/validation";
import {
  acceptBooking,
  acceptBookingExtension,
  cancelAcceptedBooking,
  extendPaymentDeadline,
  markBookingExtensionPaid,
  markPaid,
  markPickedUp,
  markReturned,
  refuseBooking,
  refuseBookingExtension,
  saveAdminNote,
  toggleCustomerBlock,
  toggleReminders,
  updateHandover,
} from "../actions";

const dueFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" });

/**
 * Demande acceptée en attente de paiement : enregistrer un paiement reçu hors ligne, ou prolonger
 * le délai au cas par cas. Passé l'échéance, la réservation est annulée d'elle-même.
 */
export function PaymentActions({ booking, delayHours }: { booking: Booking; delayHours: number }) {
  const [paidState, paidAction] = useActionState(markPaid, null);
  const [extendState, extendAction] = useActionState(extendPaymentDeadline, null);
  if (booking.status !== "pending_payment") return null;

  return (
    <section className="mt-8 brick-card p-6 bg-sky">
      <h2 className="text-2xl font-semibold">Paiement</h2>
      <p className="mt-2 text-slate-ink">
        {booking.paymentDueAt ? (
          <>
            À régler avant le <strong className="text-ink-deep">{dueFormatter.format(booking.paymentDueAt)}</strong>.
            Sans paiement d&apos;ici là, la réservation est annulée automatiquement et le set remis en location.
          </>
        ) : (
          "Demande acceptée avant la mise en place du délai de paiement : sans paiement, elle est annulée automatiquement une fois le jour de remise passé."
        )}
      </p>
      <form action={paidAction} className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr_auto] items-end">
        <input type="hidden" name="id" value={booking.id} />
        <Field label="Moyen de paiement">
          <select name="method" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choisir…
            </option>
            {Object.entries(paymentMethods).map(([value, label]) => (
              <option key={value} value={value}>
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Précision" hint="Facultatif, pour l'historique">
          <input name="note" className={inputClass} placeholder="Virement reçu le 8 octobre" />
        </Field>
        <SubmitButton variant="leaf">Paiement reçu</SubmitButton>
        <div className="sm:col-span-3">
          <FormMessage state={paidState} />
        </div>
      </form>
      {booking.paymentDueAt ? (
        <form action={extendAction} className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-ink/15 pt-4">
          <input type="hidden" name="id" value={booking.id} />
          <p className="text-sm text-slate-ink">Le client a prévenu qu&apos;il paiera plus tard ?</p>
          <SubmitButton variant="paper" className="text-sm py-2 px-3">
            Prolonger de {delayHours} h
          </SubmitButton>
          <FormMessage state={extendState} />
        </form>
      ) : null}
    </section>
  );
}

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
          <SubmitButton variant="leaf">Set remis</SubmitButton>
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
            <SubmitButton variant="leaf">Set rendu</SubmitButton>
          </div>
          <FormMessage state={returnState} />
        </form>
        <RemindersToggle booking={booking} />
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
  const [cancelState, cancelAction] = useActionState(cancelAcceptedBooking, null);
  const [handoverState, handoverAction] = useActionState(updateHandover, null);
  // Demande pas encore acceptée : décision (accepter / refuser). Acceptée, en attente de paiement :
  // l'engagement est pris, on n'y « refuse » plus rien — seule une annulation exceptionnelle reste.
  const pending = booking.status === "pending_review";
  const accepted = booking.status === "pending_payment";
  // « Modifier » reste grisé tant que le lieu et l'heure sont ceux déjà enregistrés. Un lieu qui
  // n'est plus proposé laisse la liste sur son premier choix : c'est déjà une modification.
  const savedPointId = booking.pickupPointId ?? "";
  const savedTime = formatTime(booking.pickupTime) ?? "";
  const [pointId, setPointId] = useState(
    pickupPoints.some((p) => p.id === savedPointId) ? savedPointId : (pickupPoints[0]?.id ?? ""),
  );
  const [time, setTime] = useState(savedTime);
  const handoverChanged = pointId !== savedPointId || time !== savedTime;
  if (!pending && !accepted) return null;

  return (
    <section id="decision" className="mt-8 brick-card p-6 bg-sun/30 scroll-mt-24">
      <h2 className="text-2xl font-semibold">{pending ? "Décision" : "Remise"}</h2>
      <p className="mt-2 text-slate-ink">
        {pending
          ? "Les dates et la durée sont celles choisies par le client, elles ne se modifient pas. Vous pouvez ajuster le lieu et l'heure de remise avant d'accepter."
          : "Les dates et la durée sont celles choisies par le client, elles ne se modifient pas. Vous pouvez encore ajuster le lieu et l'heure de remise."}
      </p>

      <form action={handoverAction} className="mt-6 grid gap-4 sm:grid-cols-[1fr_9rem_auto] items-end">
        <input type="hidden" name="id" value={booking.id} />
        <h3 className="sm:col-span-3 font-bold">Modifier la remise</h3>
        <Field label="Lieu de remise">
          <select name="pickupPointId" required value={pointId} onChange={(e) => setPointId(e.target.value)} className={inputClass}>
            {pickupPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Heure de remise">
          <input name="pickupTime" type="time" required step={900} value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </Field>
        <SubmitButton variant="sun" disabled={!handoverChanged}>
          Modifier
        </SubmitButton>
        <div className="sm:col-span-3">
          <FormMessage state={handoverState} />
        </div>
      </form>

      {accepted ? (
        // Annulation à l'initiative de Set et Brique (CGL, article 13) : geste exceptionnel, en lien discret.
        <div className="mt-6 border-t border-slate-ink/15 pt-4 text-right">
          <form action={cancelAction}>
            <input type="hidden" name="id" value={booking.id} />
            <ConfirmButton
              asDialog
              state={cancelState}
              confirmLabel="Oui, annuler la réservation"
              pendingLabel="Annulation…"
              className="text-sm"
              details={
                <>
                  <p className="text-sm text-slate-ink">
                    Prévenez le client et proposez-lui une autre date, un autre set ou un avoir (conditions
                    générales, article 13).
                  </p>
                  <div className="mt-3">
                    <Field label="Motif, visible du client">
                      <input name="reason" required className={inputClass} placeholder="Le set revenu de location est incomplet" />
                    </Field>
                  </div>
                </>
              }
            >
              Annuler la réservation
            </ConfirmButton>
          </form>
          <div className="mt-3">
            <FormMessage state={cancelState} />
          </div>
        </div>
      ) : (
        // Barre de décision : Accepter à droite, action principale ; le motif du refus se saisit dans la fenêtre de confirmation.
        <div className="mt-6 border-t border-slate-ink/15 pt-6">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <form action={refuseAction}>
              <input type="hidden" name="id" value={booking.id} />
              <ConfirmButton
                asDialog
                state={refuseState}
                confirmLabel="Oui, refuser"
                pendingLabel="Envoi…"
                className="btn btn-brick text-paper no-underline"
                details={
                  <Field label="Motif du refus, visible du client" hint="Facultatif">
                    <input name="reason" className={inputClass} placeholder="Le set est immobilisé pour réparation" />
                  </Field>
                }
              >
                Refuser la demande
              </ConfirmButton>
            </form>
            <form action={acceptAction}>
              <input type="hidden" name="id" value={booking.id} />
              <SubmitButton variant="leaf">Accepter la demande</SubmitButton>
            </form>
          </div>
          <div className="mt-3 text-right">
            <FormMessage state={acceptState} />
            <FormMessage state={refuseState} />
          </div>
        </div>
      )}
    </section>
  );
}

/** Rappels de fin de location : la veille et le jour du retour, puis le rappel de retard (J+1). */
function RemindersToggle({ booking }: { booking: Booking }) {
  const [state, action] = useActionState(toggleReminders, null);
  return (
    <form action={action} className="mt-6 pt-4 border-t border-slate-ink/10 grid gap-2">
      <input type="hidden" name="id" value={booking.id} />
      <input type="hidden" name="paused" value={booking.remindersPaused ? "false" : "true"} />
      <p className="text-sm text-slate-ink">
        {booking.remindersPaused
          ? "Rappel de retard suspendu : le client ne recevra pas l'e-mail du lendemain de la date de retour (forfait de 30 €)."
          : "Le client reçoit un e-mail la veille et le jour du retour, puis, si le set n'est pas rendu, un rappel de retard le lendemain (forfait de 30 €). Retard convenu avec lui ? Suspendez ce rappel."}
      </p>
      <div>
        <SubmitButton variant="paper">{booking.remindersPaused ? "Réactiver le rappel de retard" : "Suspendre le rappel de retard"}</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function AdminNoteForm({ booking }: { booking: Booking }) {
  const [state, action] = useActionState(saveAdminNote, null);
  const { ref: formRef, dirty, markClean } = useFormDirty();
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) markClean();
  }
  return (
    <form ref={formRef} action={action} className="mt-6 grid gap-3 border-t border-slate-ink/10 pt-5">
      <input type="hidden" name="id" value={booking.id} />
      <Field label="Note interne" hint="Jamais visible du client">
        <textarea name="adminNote" rows={3} defaultValue={booking.adminNote ?? ""} className={inputClass} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton variant="leaf" disabled={!dirty}>
          Enregistrer la note
        </SubmitButton>
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

/**
 * Demande de prolongation en cours sur une location dont le set est chez le client : à accepter ou
 * refuser, puis paiement du supplément à enregistrer. La date de retour ne change qu'au paiement.
 */
export function ExtensionActions({ extension, endDate }: { extension: BookingExtension | null; endDate: string }) {
  const [acceptState, acceptAction] = useActionState(acceptBookingExtension, null);
  const [refuseState, refuseAction] = useActionState(refuseBookingExtension, null);
  const [paidState, paidAction] = useActionState(markBookingExtensionPaid, null);
  if (!extension || (extension.status !== "pending_review" && extension.status !== "pending_payment")) return null;
  const summary = `${extension.extraDays} jour${extension.extraDays > 1 ? "s" : ""} de plus, ${formatCents(extension.extraRentalCents)}`;

  if (extension.status === "pending_review") {
    return (
      <section id="prolongation" className="mt-8 brick-card p-6 bg-sun/30 scroll-mt-24">
        <h2 className="text-2xl font-semibold">Prolongation demandée</h2>
        <p className="mt-2 text-slate-ink">
          Le client souhaite garder le set jusqu&apos;au <strong className="text-ink-deep">{formatDate(extension.newEndDate)}</strong>{" "}
          au lieu du {formatDate(endDate)} ({summary}). Le set est libre sur ces jours, battement compris. Sans réponse
          avant la fin du {formatDate(endDate)}, la demande expire et le retour reste à cette date.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-ink/15 pt-6">
          <form action={refuseAction}>
            <input type="hidden" name="extensionId" value={extension.id} />
            <ConfirmButton
              asDialog
              state={refuseState}
              confirmLabel="Oui, refuser"
              pendingLabel="Envoi…"
              className="btn btn-brick text-paper no-underline"
              details={
                <Field label="Motif du refus, visible du client" hint="Facultatif">
                  <input name="reason" className={inputClass} placeholder="Le set est attendu pour un autre client" />
                </Field>
              }
            >
              Refuser la prolongation
            </ConfirmButton>
          </form>
          <form action={acceptAction}>
            <input type="hidden" name="extensionId" value={extension.id} />
            <SubmitButton variant="leaf">Accepter la prolongation</SubmitButton>
          </form>
        </div>
        <FormMessage state={acceptState?.error ? acceptState : null} />
      </section>
    );
  }

  return (
    <section id="prolongation" className="mt-8 brick-card p-6 bg-sky scroll-mt-24">
      <h2 className="text-2xl font-semibold">Prolongation à payer</h2>
      <p className="mt-2 text-slate-ink">
        Prolongation acceptée jusqu&apos;au <strong className="text-ink-deep">{formatDate(extension.newEndDate)}</strong> ({summary}).
        {extension.paymentDueAt ? (
          <>
            {" "}
            À régler avant le <strong className="text-ink-deep">{dueFormatter.format(extension.paymentDueAt)}</strong> : sans
            paiement d&apos;ici là, elle expire et le retour reste au {formatDate(endDate)}.
          </>
        ) : null}
      </p>
      <form action={paidAction} className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr_auto] items-end">
        <input type="hidden" name="extensionId" value={extension.id} />
        <Field label="Moyen de paiement">
          <select name="method" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choisir…
            </option>
            {Object.entries(paymentMethods).map(([value, label]) => (
              <option key={value} value={value}>
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Précision" hint="Facultatif, pour l'historique">
          <input name="note" className={inputClass} placeholder="Virement reçu le 12 octobre" />
        </Field>
        <SubmitButton variant="leaf">Paiement reçu</SubmitButton>
        <div className="sm:col-span-3">
          <FormMessage state={paidState} />
        </div>
      </form>
    </section>
  );
}
