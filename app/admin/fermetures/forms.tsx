"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { ConfirmButton, Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form";
import { useFormDirty } from "@/lib/use-form-dirty";
import type { BlackoutPeriod } from "@/lib/db/schema";
import { createBlackout, deleteBlackout, updateBlackout } from "./actions";

function BlackoutFields({
  period,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  reason,
  onReasonChange,
}: {
  period?: BlackoutPeriod;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  /** Contrôlé uniquement à la création, pour ne pouvoir ajouter que si un motif est saisi. */
  reason?: string;
  onReasonChange?: (value: string) => void;
}) {
  return (
    <>
      <Field label="Du">
        <input
          name="startDate"
          type="date"
          required
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Au" hint="Inclus">
        <input
          name="endDate"
          type="date"
          required
          min={startDate || undefined}
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Motif" hint="Pour vous, jamais affiché au client">
        <input
          name="reason"
          required={Boolean(onReasonChange)}
          className={inputClass}
          placeholder="Vacances d'été"
          {...(onReasonChange
            ? { value: reason ?? "", onChange: (e: ChangeEvent<HTMLInputElement>) => onReasonChange(e.target.value) }
            : { defaultValue: period?.reason ?? "" })}
        />
      </Field>
    </>
  );
}

export function BlackoutCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createBlackout, null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Recule la fin en même temps que le début si elle se retrouve avant lui.
  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (endDate && endDate < value) setEndDate(value);
  }

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) {
      setOpen(false);
      setStartDate("");
      setEndDate("");
      setReason("");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-leaf">
        Créer une période de fermeture
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="brick-card bg-paper p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-semibold">Nouvelle période fermée</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="cursor-pointer text-xl leading-none text-slate-ink transition-colors hover:text-ink-deep"
              >
                ×
              </button>
            </div>
            <form action={action} className="mt-4 grid gap-4">
              <BlackoutFields
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={setEndDate}
                reason={reason}
                onReasonChange={setReason}
              />
              <FormMessage state={state} />
              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer font-bold underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Annuler
                </button>
                <SubmitButton variant="leaf" disabled={!startDate || !endDate || reason.trim() === ""}>
                  Ajouter
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function BlackoutRow({ period, affected }: { period: BlackoutPeriod; affected: number }) {
  const [editState, editAction] = useActionState(updateBlackout, null);
  const [deleteState, deleteAction] = useActionState(deleteBlackout, null);
  const { ref: formRef, dirty: fieldsDirty, markClean } = useFormDirty();
  const [startDate, setStartDate] = useState(period.startDate);
  const [endDate, setEndDate] = useState(period.endDate);
  const [initialStartDate, setInitialStartDate] = useState(period.startDate);
  const [initialEndDate, setInitialEndDate] = useState(period.endDate);
  const dirty = fieldsDirty || startDate !== initialStartDate || endDate !== initialEndDate;

  const [prevEditState, setPrevEditState] = useState(editState);
  if (editState !== prevEditState) {
    setPrevEditState(editState);
    if (editState?.ok) {
      markClean();
      setInitialStartDate(startDate);
      setInitialEndDate(endDate);
    }
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (endDate && endDate < value) setEndDate(value);
  }

  return (
    <li className="brick-card p-5">
      {affected > 0 ? (
        <p className="mb-3 rounded-xl border border-brick/30 bg-red-50 px-4 py-2 text-sm font-semibold text-brick-deep">
          {affected} réservation{affected > 1 ? "s ont" : " a"} une remise ou un retour prévu pendant cette période.
        </p>
      ) : null}
      <form ref={formRef} action={editAction} className="grid gap-4 sm:grid-cols-[10rem_10rem_1fr_auto] items-end">
        <input type="hidden" name="id" value={period.id} />
        <BlackoutFields
          period={period}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={setEndDate}
        />
        <SubmitButton variant="leaf" disabled={!dirty}>
          Enregistrer
        </SubmitButton>
        <div className="sm:col-span-4">
          <FormMessage state={editState} />
        </div>
      </form>
      <form action={deleteAction} className="mt-3">
        <input type="hidden" name="id" value={period.id} />
        <ConfirmButton>Supprimer cette période</ConfirmButton>
        <FormMessage state={deleteState} />
      </form>
    </li>
  );
}
