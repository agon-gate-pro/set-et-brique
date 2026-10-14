"use client";

import { useActionState, useState } from "react";
import { useFormDirty } from "@/lib/use-form-dirty";
import { ConfirmButton, Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form";
import type { Booking, BookingExtension, Customer } from "@/lib/db/schema";
import { daysLate, todayIso } from "@/lib/dates";
import { depositStateLabel, formatCents, formatDate, formatTime } from "@/lib/format";
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
  releaseDeposit,
  requestDepositHold,
  retainDeposit,
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
      <p className="mt-2 text-sm text-slate-ink">
        Le client peut régler par carte depuis son espace (paiement en ligne) : la réservation passe alors toute seule en
        « Confirmée », avec un e-mail de confirmation. Le bouton ci-dessous sert au paiement reçu hors ligne.
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
  const [holdState, holdAction] = useActionState(requestDepositHold, null);
  // Remise sans empreinte : choix explicite des gérants, coché sur place (étape 3 de la caution).
  const [withoutDeposit, setWithoutDeposit] = useState(false);
  const today = todayIso();

  if (booking.status === "pending_payment" || booking.status === "confirmed") {
    const guarded = booking.depositCents <= 0 || booking.depositStatus === "held";
    return (
      <section className="mt-8 brick-card p-6 bg-sky">
        <h2 className="text-2xl font-semibold">Remise du set</h2>
        <p className="mt-2 text-slate-ink">
          À enregistrer une fois le set remis en main propre, remise prévue le {formatDate(booking.startDate)}.
        </p>
        {/* Caution : l'empreinte se pose toute seule le matin du jour de remise (`lib/deposits.ts`). */}
        {booking.depositCents > 0 ? (
          booking.depositStatus === "held" ? (
            <p className="mt-2 font-semibold text-leaf-deep">
              Caution de {formatCents(booking.depositCents)} : {depositStateLabel(booking)?.toLowerCase()}.
            </p>
          ) : (
            <div
              className={`mt-2 rounded-xl border px-4 py-3 ${
                booking.depositStatus === "failed" ? "border-brick/30 bg-red-50" : "border-ink/10 bg-paper"
              }`}
            >
              <p className={`font-semibold ${booking.depositStatus === "failed" ? "text-brick-deep" : "text-ink-deep"}`}>
                Caution de {formatCents(booking.depositCents)} non garantie
                {booking.depositStatus === "failed" ? ` : ${depositStateLabel(booking)?.toLowerCase()}` : " : empreinte pas encore posée"}.
              </p>
              <p className="mt-1 text-sm text-slate-ink">
                Le set n&apos;est remis qu&apos;une fois l&apos;empreinte en place. Le client peut enregistrer une carte depuis son
                espace (il a reçu un e-mail si l&apos;empreinte a été refusée) ; vous pouvez aussi la redemander sur la carte
                connue.
              </p>
              {booking.status === "confirmed" ? (
                <form action={holdAction} className="mt-3 flex flex-wrap items-center gap-3">
                  <input type="hidden" name="id" value={booking.id} />
                  <SubmitButton variant="sea">Redemander l&apos;empreinte</SubmitButton>
                  <FormMessage state={holdState} />
                </form>
              ) : null}
            </div>
          )
        ) : null}
        <form action={pickupAction} className="mt-4 grid gap-4 sm:grid-cols-[10rem_1fr_auto] items-end">
          <input type="hidden" name="id" value={booking.id} />
          <Field label="Remis le">
            <input name="date" type="date" required max={today} defaultValue={today} className={inputClass} />
          </Field>
          <Field label="Précision" hint="Facultatif, pour l'historique">
            <input name="note" className={inputClass} placeholder="Set vérifié ensemble" />
          </Field>
          <SubmitButton variant="leaf" disabled={!guarded && !withoutDeposit}>
            Set remis
          </SubmitButton>
          {!guarded ? (
            <label className="sm:col-span-3 flex items-start gap-2 text-sm text-ink-deep">
              <input
                type="checkbox"
                name="withoutDeposit"
                checked={withoutDeposit}
                onChange={(e) => setWithoutDeposit(e.target.checked)}
                className="mt-1"
              />
              <span>
                Remettre quand même, sans empreinte de caution (la caution est garantie autrement). Ce choix est inscrit
                dans l&apos;historique.
              </span>
            </label>
          ) : null}
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
            {/* Confirmation avant d'enregistrer le retour (13 octobre 2026) : le geste est définitif et un clic par erreur clôt la location. */}
            <ConfirmButton
              asDialog
              state={returnState}
              confirmLabel="Oui, le set est rendu"
              confirmVariant="leaf"
              pendingLabel="Enregistrement…"
              className="btn btn-leaf text-paper hover:text-paper no-underline"
            >
              Set rendu
            </ConfirmButton>
          </div>
          <FormMessage state={returnState} />
        </form>
        <RemindersToggle booking={booking} />
      </section>
    );
  }

  return null;
}

const releaseFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" });

/**
 * Fin de l'empreinte de caution (`lib/deposits.ts`). Set rendu : libérer tout de suite, ou retenir
 * une somme avec un motif montré au client ; sans geste, elle est libérée d'office 48 heures après
 * le retour. Set en retard de deux jours ou plus : prélever la caution entière (CGL, article 10),
 * à la main, pour que les gérants puissent y renoncer si le client a donné des nouvelles.
 */
export function DepositActions({ booking }: { booking: Booking }) {
  const [releaseState, releaseAction] = useActionState(releaseDeposit, null);
  const [retainState, retainAction] = useActionState(retainDeposit, null);
  const [fullState, fullAction] = useActionState(retainDeposit, null);
  if (booking.depositStatus !== "held") return null;
  const deposit = formatCents(booking.depositCents);

  if (booking.status === "returned") {
    const autoRelease = booking.returnedAt ? new Date(booking.returnedAt.getTime() + 48 * 3_600_000) : null;
    return (
      <section id="caution" className="mt-8 brick-card p-6 bg-sky scroll-mt-24">
        <h2 className="text-2xl font-semibold">Caution</h2>
        <p className="mt-2 text-slate-ink">
          L&apos;empreinte de <strong className="text-ink-deep">{deposit}</strong> est toujours en place sur la carte du client.
          {autoRelease ? (
            <>
              {" "}
              Sans geste de votre part, elle est libérée automatiquement après le{" "}
              <strong className="text-ink-deep">{releaseFormatter.format(autoRelease)}</strong>.
            </>
          ) : null}
        </p>

        <form action={releaseAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={booking.id} />
          <SubmitButton variant="leaf">Set conforme : libérer la caution</SubmitButton>
          <FormMessage state={releaseState} />
        </form>

        <form action={retainAction} className="mt-6 grid gap-4 border-t border-slate-ink/15 pt-5 sm:grid-cols-[9rem_1fr_auto] items-end">
          <input type="hidden" name="id" value={booking.id} />
          <h3 className="sm:col-span-3 font-bold">Retenir une somme</h3>
          <Field label="Somme, en euros" hint={`Au plus ${deposit}`}>
            {/* Pas de `required` : la fenêtre de confirmation masquerait la bulle du navigateur ; l'action vérifie et répond dans la fenêtre. */}
            <input name="amount" inputMode="decimal" className={inputClass} placeholder="15" />
          </Field>
          <Field label="Motif, visible du client">
            <input name="reason" className={inputClass} placeholder="Set rendu monté : forfait démontage" />
          </Field>
          <ConfirmButton
            asDialog
            state={retainState}
            confirmLabel="Oui, prélever cette somme"
            pendingLabel="Prélèvement…"
            className="btn btn-brick text-paper hover:text-paper no-underline"
          >
            Retenir sur la caution
          </ConfirmButton>
          <p className="sm:col-span-3 text-sm text-slate-ink">
            La somme est débitée de la carte du client, le reste de l&apos;empreinte est libéré. Une seule retenue est
            possible par caution : additionnez tout ce qui est dû. Le client reçoit un e-mail avec la somme et le motif.
          </p>
          <div className="sm:col-span-3">
            <FormMessage state={retainState} />
          </div>
        </form>
      </section>
    );
  }

  const late = booking.status === "picked_up" ? daysLate(booking.endDate, todayIso()) : 0;
  if (late < 2) return null;
  return (
    <section id="caution" className="mt-8 brick-card p-6 bg-brick/10 border-brick scroll-mt-24">
      <h2 className="text-2xl font-semibold">Caution</h2>
      <p className="mt-2 text-brick-deep font-semibold">
        Retard de {late} jours. Si le client n&apos;a ni rendu le set ni donné de nouvelles, les conditions générales
        (article 10) prévoient de prélever la totalité de la caution, soit {deposit}.
      </p>
      <form action={fullAction} className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] items-end">
        <input type="hidden" name="id" value={booking.id} />
        <input type="hidden" name="full" value="true" />
        <Field label="Motif, visible du client">
          <input
            name="reason"
            required
            className={inputClass}
            defaultValue={`Set non restitué, ${late} jours après la date de retour convenue`}
          />
        </Field>
        <ConfirmButton
          asDialog
          state={fullState}
          confirmLabel={`Oui, prélever ${deposit}`}
          pendingLabel="Prélèvement…"
          className="btn btn-brick text-paper hover:text-paper no-underline"
        >
          Prélever toute la caution
        </ConfirmButton>
        <div className="sm:col-span-2">
          <FormMessage state={fullState} />
        </div>
      </form>
    </section>
  );
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
      <p className="mt-2 text-sm text-slate-ink">
        Le client peut régler par carte depuis son espace (paiement en ligne) : la date de retour est alors repoussée
        toute seule, avec un e-mail de confirmation. Le bouton ci-dessous sert au paiement reçu hors ligne.
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
