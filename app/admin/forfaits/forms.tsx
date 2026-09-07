"use client";

import { useActionState } from "react";
import {
  ConfirmButton,
  Field,
  FormMessage,
  SubmitButton,
  inputClass,
} from "@/components/admin/form";
import { centsToInput, formatCents } from "@/lib/format";
import { createRatePlan, deleteRatePlan, updateRatePlan } from "./actions";

export function RatePlanCreateForm() {
  const [state, action] = useActionState(createRatePlan, null);
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-[1fr_10rem_auto] items-end">
      <Field label="Nom">
        <input name="name" required className={inputClass} placeholder="Forfait 2" />
      </Field>
      <Field label="Prix par jour (€)">
        <input name="priceEuros" required inputMode="decimal" className={inputClass} placeholder="3,00" />
      </Field>
      <SubmitButton>Créer le forfait</SubmitButton>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function RatePlanRow({
  plan,
}: {
  plan: { id: string; name: string; priceCentsPerDay: number; isDefault: boolean; setCount: number };
}) {
  const [editState, editAction] = useActionState(updateRatePlan, null);
  const [deleteState, deleteAction] = useActionState(deleteRatePlan, null);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="display text-xl font-semibold">
          {plan.name}
          {plan.isDefault ? (
            <span className="ml-3 text-sm bg-sun px-2 py-0.5 border-2 border-ink">par défaut</span>
          ) : null}
        </p>
        <p className="text-slate-ink">
          {formatCents(plan.priceCentsPerDay)} / jour · {plan.setCount} set{plan.setCount > 1 ? "s" : ""}
        </p>
      </div>

      <form action={editAction} className="mt-4 grid gap-4 sm:grid-cols-[1fr_10rem_auto] items-end">
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
        <SubmitButton variant="paper">Enregistrer</SubmitButton>
        <div className="sm:col-span-3">
          <FormMessage state={editState} />
        </div>
      </form>

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
