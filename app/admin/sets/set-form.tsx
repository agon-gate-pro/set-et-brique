"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton, inputClass, type ActionState } from "@/components/admin/form";
import { centsToInput, instructionTypeLabels, setStatusLabels } from "@/lib/format";
import type { RatePlan, Set } from "@/lib/db/schema";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  set?: Set;
  ratePlans: Pick<RatePlan, "id" | "name" | "priceCentsPerDay" | "isDefault">[];
  /** Battement global (réglage `turnaround_days`), affiché comme valeur par défaut. */
  defaultTurnaroundDays: number;
  submitLabel: string;
};

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="sm:col-span-2 grid gap-5 sm:grid-cols-2 rounded-xl border border-slate-ink/15 bg-sky/60 p-5">
      <legend className="px-2 text-base font-bold uppercase tracking-wide text-brick-deep">{title}</legend>
      {children}
    </fieldset>
  );
}

export function SetForm({ action, set, ratePlans, defaultTurnaroundDays, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, null);
  const [status, setStatus] = useState(set?.status ?? "draft");
  const defaultPlan = ratePlans.find((p) => p.isDefault);

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      {set ? <input type="hidden" name="id" value={set.id} /> : null}

      <Group title="Identité">
        <div className="sm:col-span-2">
          <Field label="Nom du set">
            <input name="name" required defaultValue={set?.name} className={inputClass} placeholder="Le Faucon Millenium" />
          </Field>
        </div>
        <Field label="Marque" hint="LEGO par défaut. Indiquez la marque si ce n'est pas un LEGO (PANTASY…)">
          <input name="brand" defaultValue={set?.brand ?? "LEGO"} className={inputClass} placeholder="LEGO" />
        </Field>
        <Field label="Thème">
          <input name="theme" defaultValue={set?.theme ?? ""} className={inputClass} placeholder="Star Wars, Technic, City…" />
        </Field>
        <div className="sm:col-span-2">
          <Field
            label="Numéros des boîtes"
            hint="Les numéros imprimés sur les boîtes, séparés par une virgule si l'article en regroupe plusieurs (ex. 71741, 71742)"
          >
            <input name="setNumbers" defaultValue={set?.setNumbers.join(", ") ?? ""} className={inputClass} placeholder="75192" />
          </Field>
        </div>
      </Group>

      <Group title="Contenu">
        <Field label="Nombre de pièces">
          <input name="pieces" type="number" min={0} defaultValue={set?.pieces ?? ""} className={inputClass} />
        </Field>
        <Field label="Nombre de figurines">
          <input name="minifigCount" type="number" min={0} defaultValue={set?.minifigCount ?? ""} className={inputClass} />
        </Field>
        <Field label="Nombre de notices" hint="Toutes boîtes confondues">
          <input name="instructionCount" type="number" min={0} defaultValue={set?.instructionCount ?? ""} className={inputClass} />
        </Field>
        <Field label="Type de notice" hint="Si numérique, le client est prévenu qu'il faut un écran et internet pour monter le set">
          <select name="instructionType" defaultValue={set?.instructionType ?? "paper"} className={inputClass}>
            {Object.entries(instructionTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dimensions une fois construit">
          <input name="dimensions" defaultValue={set?.dimensions ?? ""} className={inputClass} placeholder="L 84 × l 56 × H 21 cm" />
        </Field>
        <Field label="Temps de montage estimé">
          <input name="buildTime" defaultValue={set?.buildTime ?? ""} className={inputClass} placeholder="8 à 10 h" />
        </Field>
        <Field label="Âge conseillé" hint="À partir de">
          <input name="ageMin" type="number" min={0} defaultValue={set?.ageMin ?? ""} className={inputClass} />
        </Field>
        <Field label="Poids du set (g)" hint="Usage interne pour vérifier le retour, jamais affiché au client">
          <input name="weightGrams" type="number" min={0} defaultValue={set?.weightGrams ?? ""} className={inputClass} placeholder="9500" />
        </Field>
      </Group>

      <Group title="Location">
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
        <Field
          label="Battement entre deux locations (jours)"
          hint={`Laissez vide pour le réglage général (${defaultTurnaroundDays} jour${defaultTurnaroundDays > 1 ? "s" : ""})`}
        >
          <input name="turnaroundDays" type="number" min={0} defaultValue={set?.turnaroundDays ?? ""} className={inputClass} placeholder={String(defaultTurnaroundDays)} />
        </Field>
      </Group>

      <Group title="Textes affichés au client">
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea name="description" rows={5} defaultValue={set?.description ?? ""} className={inputClass} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Commentaire" hint="Remarque ponctuelle visible sur la fiche (particularité, conseil, pièce de rechange fournie…)">
            <textarea name="publicNote" rows={3} defaultValue={set?.publicNote ?? ""} className={inputClass} />
          </Field>
        </div>
      </Group>

      <Group title="Publication">
        <Field label="Statut" hint="Seuls les sets publiés apparaissent sur le site">
          <select name="status" value={status} onChange={(e) => setStatus(e.target.value as Set["status"])} className={inputClass}>
            {Object.entries(setStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-3 self-end pb-2">
          <input type="checkbox" name="featured" defaultChecked={set?.featured ?? false} className="focus-outline-none h-5 w-5 accent-brick" />
          <span className="font-bold">Mettre en avant sur l&apos;accueil</span>
        </label>
      </Group>

      <div className="sm:col-span-2">
        <div className="flex justify-end">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
