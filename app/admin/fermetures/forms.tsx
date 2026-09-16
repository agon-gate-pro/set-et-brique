"use client";

import { useActionState } from "react";
import { ConfirmButton, Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form";
import type { BlackoutPeriod } from "@/lib/db/schema";
import { createBlackout, deleteBlackout, updateBlackout } from "./actions";

function BlackoutFields({ period }: { period?: BlackoutPeriod }) {
  return (
    <>
      <Field label="Du">
        <input name="startDate" type="date" required defaultValue={period?.startDate ?? ""} className={inputClass} />
      </Field>
      <Field label="Au" hint="Inclus">
        <input name="endDate" type="date" required defaultValue={period?.endDate ?? ""} className={inputClass} />
      </Field>
      <Field label="Motif" hint="Pour vous, jamais affiché au client">
        <input name="reason" defaultValue={period?.reason ?? ""} className={inputClass} placeholder="Vacances d'été" />
      </Field>
    </>
  );
}

export function BlackoutCreateForm() {
  const [state, action] = useActionState(createBlackout, null);
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-[10rem_10rem_1fr_auto] items-end">
      <BlackoutFields />
      <SubmitButton>Ajouter</SubmitButton>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function BlackoutRow({ period, affected }: { period: BlackoutPeriod; affected: number }) {
  const [editState, editAction] = useActionState(updateBlackout, null);
  const [deleteState, deleteAction] = useActionState(deleteBlackout, null);
  return (
    <li className="brick-card p-5">
      {affected > 0 ? (
        <p className="mb-3 rounded-xl border border-brick/30 bg-red-50 px-4 py-2 text-sm font-semibold text-brick-deep">
          {affected} réservation{affected > 1 ? "s ont" : " a"} une remise ou un retour prévu pendant cette période.
        </p>
      ) : null}
      <form action={editAction} className="grid gap-4 sm:grid-cols-[10rem_10rem_1fr_auto] items-end">
        <input type="hidden" name="id" value={period.id} />
        <BlackoutFields period={period} />
        <SubmitButton variant="paper">Enregistrer</SubmitButton>
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
