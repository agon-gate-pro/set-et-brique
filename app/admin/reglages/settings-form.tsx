"use client";

import { useActionState, useState, type ReactNode } from "react";
import { FormMessage, SubmitButton, inputClass } from "@/components/admin/form";
import { useFormDirty } from "@/lib/use-form-dirty";
import { saveSettings } from "./actions";

type Values = { paymentDelayHours: number; turnaroundDays: number; minRentalDays: number };

export function SettingsForm({ values }: { values: Values }) {
  const [state, action] = useActionState(saveSettings, null);
  const { ref: formRef, dirty, markClean } = useFormDirty();

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) markClean();
  }

  return (
    <form ref={formRef} action={action} className="mt-8 grid gap-4">
      <Setting
        name="paymentDelayHours"
        label="Délai pour payer une demande acceptée"
        unit="heures"
        min={1}
        max={168}
        defaultValue={values.paymentDelayHours}
      >
        Le set reste réservé au client pendant ce délai après l&apos;acceptation de sa demande. S&apos;applique aux
        demandes acceptées après l&apos;enregistrement ; une demande déjà acceptée garde son échéance.
      </Setting>
      <Setting
        name="turnaroundDays"
        label="Battement par défaut entre deux locations"
        unit="jours"
        min={0}
        max={30}
        defaultValue={values.turnaroundDays}
      >
        Jours bloqués après le retour d&apos;un set avant qu&apos;un autre client puisse le louer (vérification,
        tri). Un set peut avoir son propre battement dans sa fiche ; pas de battement quand le même client
        enchaîne deux locations.
      </Setting>
      <Setting
        name="minRentalDays"
        label="Durée minimale d'une location"
        unit="jours"
        min={1}
        max={60}
        defaultValue={values.minRentalDays}
      >
        Le calendrier de réservation refuse une période plus courte.
      </Setting>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton variant="leaf" disabled={!dirty}>Enregistrer</SubmitButton>
      </div>
    </form>
  );
}

function Setting({
  name,
  label,
  unit,
  min,
  max,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  defaultValue: number;
  children: ReactNode;
}) {
  return (
    <section className="brick-card p-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div>
        <label htmlFor={name} className="block font-bold text-ink-deep">
          {label}
        </label>
        <p className="mt-1 text-sm text-slate-ink">{children}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={name}
          name={name}
          type="number"
          required
          min={min}
          max={max}
          step={1}
          defaultValue={defaultValue}
          className={`${inputClass} w-24 text-right`}
        />
        <span className="text-slate-ink">{unit}</span>
      </div>
    </section>
  );
}
