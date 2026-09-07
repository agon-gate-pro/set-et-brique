"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, inputClass, type ActionState } from "@/components/admin/form";
import { centsToInput, setStatusLabels } from "@/lib/format";
import type { RatePlan, Set } from "@/lib/db/schema";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  set?: Set;
  ratePlans: Pick<RatePlan, "id" | "name" | "priceCentsPerDay" | "isDefault">[];
  submitLabel: string;
};

export function SetForm({ action, set, ratePlans, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, null);
  const defaultPlan = ratePlans.find((p) => p.isDefault);

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      {set ? <input type="hidden" name="id" value={set.id} /> : null}

      <div className="sm:col-span-2">
        <Field label="Nom du set">
          <input name="name" required defaultValue={set?.name} className={inputClass} placeholder="Le Faucon Millenium" />
        </Field>
      </div>

      <Field label="Numéro du set" hint="Le numéro imprimé sur la boîte, facultatif">
        <input name="setNumber" defaultValue={set?.setNumber ?? ""} className={inputClass} placeholder="75192" />
      </Field>
      <Field label="Thème">
        <input name="theme" defaultValue={set?.theme ?? ""} className={inputClass} placeholder="Star Wars, Technic, City…" />
      </Field>

      <Field label="Nombre de pièces">
        <input name="pieces" type="number" min={0} defaultValue={set?.pieces ?? ""} className={inputClass} />
      </Field>
      <Field label="Âge minimum">
        <input name="ageMin" type="number" min={0} defaultValue={set?.ageMin ?? ""} className={inputClass} />
      </Field>

      <Field label="Caution (€)" hint="Bloquée sur la carte à la remise, jamais débitée sauf casse ou perte">
        <input
          name="depositEuros"
          required
          inputMode="decimal"
          defaultValue={set ? centsToInput(set.depositCents) : ""}
          className={inputClass}
          placeholder="150,00"
        />
      </Field>
      <Field label="Forfait">
        <select name="ratePlanId" defaultValue={set?.ratePlanId ?? ""} className={inputClass}>
          <option value="">
            Forfait par défaut{defaultPlan ? ` (${defaultPlan.name})` : ""}
          </option>
          {ratePlans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {centsToInput(p.priceCentsPerDay)} €/jour
            </option>
          ))}
        </select>
      </Field>

      <div className="sm:col-span-2">
        <Field label="Description" hint="Ce que le client lira sur la fiche du set">
          <textarea name="description" rows={5} defaultValue={set?.description ?? ""} className={inputClass} />
        </Field>
      </div>

      <Field label="Statut" hint="Seuls les sets publiés apparaissent sur le site">
        <select name="status" defaultValue={set?.status ?? "draft"} className={inputClass}>
          {Object.entries(setStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-3 self-end pb-2">
        <input type="checkbox" name="featured" defaultChecked={set?.featured ?? false} className="h-5 w-5 accent-brick" />
        <span className="font-bold">Mettre en avant sur l&apos;accueil</span>
      </label>

      <div className="sm:col-span-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
