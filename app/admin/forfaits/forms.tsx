"use client";

import { useActionState, useState } from "react";
import {
  ConfirmButton,
  Field,
  FormMessage,
  SubmitButton,
  inputClass,
} from "@/components/admin/form";
import { centsToInput, formatCents } from "@/lib/format";
import { useFormDirty } from "@/lib/use-form-dirty";
import { createRatePlan, deleteRatePlan, setDefaultRatePlan, updateRatePlan } from "./actions";

export function RatePlanCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createRatePlan, null);
  const [name, setName] = useState("");
  const [priceEuros, setPriceEuros] = useState("");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) {
      setOpen(false);
      setName("");
      setPriceEuros("");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-leaf">
        Créer un forfait
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
              <h2 className="text-2xl font-semibold">Nouveau forfait</h2>
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
              <Field label="Nom">
                <input
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Forfait 2"
                />
              </Field>
              <Field label="Prix par jour (€)">
                <input
                  name="priceEuros"
                  required
                  inputMode="decimal"
                  value={priceEuros}
                  onChange={(e) => setPriceEuros(e.target.value)}
                  className={inputClass}
                  placeholder="3,00"
                />
              </Field>
              <FormMessage state={state} />
              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer font-bold underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Annuler
                </button>
                <SubmitButton variant="leaf" disabled={name.trim() === "" || priceEuros.trim() === ""}>
                  Créer le forfait
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function RatePlanRow({
  plan,
}: {
  plan: { id: string; name: string; priceCentsPerDay: number; isDefault: boolean; setCount: number };
}) {
  const [editState, editAction] = useActionState(updateRatePlan, null);
  const [deleteState, deleteAction] = useActionState(deleteRatePlan, null);
  const { ref: formRef, dirty, markClean } = useFormDirty();
  const [prevEditState, setPrevEditState] = useState(editState);
  if (editState !== prevEditState) {
    setPrevEditState(editState);
    if (editState?.ok) markClean();
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="display text-xl font-semibold">
          {plan.name}
          {plan.isDefault ? (
            <span className="ml-3 text-sm bg-sun px-2 py-0.5 rounded-md">par défaut</span>
          ) : null}
        </p>
        <p className="text-slate-ink">
          {formatCents(plan.priceCentsPerDay)} / jour · {plan.setCount} set{plan.setCount > 1 ? "s" : ""}
        </p>
      </div>

      <form ref={formRef} action={editAction} className="mt-4 grid gap-4 sm:grid-cols-[1fr_10rem_auto] items-end">
        <input type="hidden" name="id" value={plan.id} />
        <Field label="Nom">
          <input name="name" defaultValue={plan.name} required className={inputClass} />
        </Field>
        <Field label="Prix par jour (€)">
          <input
            name="priceEuros"
            defaultValue={centsToInput(plan.priceCentsPerDay)}
            required
            inputMode="decimal"
            className={inputClass}
          />
        </Field>
        <SubmitButton variant="leaf" disabled={!dirty}>Enregistrer</SubmitButton>
        <div className="sm:col-span-3">
          <FormMessage state={editState} />
        </div>
      </form>

      {!plan.isDefault ? (
        <form action={setDefaultRatePlan} className="mt-3">
          <input type="hidden" name="id" value={plan.id} />
          <button type="submit" className="btn btn-paper text-sm py-2 px-4">
            Définir comme forfait par défaut
          </button>
        </form>
      ) : null}

      {!plan.isDefault ? (
        <form action={deleteAction} className="mt-3">
          <input type="hidden" name="id" value={plan.id} />
          <ConfirmButton>Supprimer ce forfait</ConfirmButton>
          <FormMessage state={deleteState} />
        </form>
      ) : null}
    </div>
  );
}
