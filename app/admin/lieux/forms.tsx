"use client";

import { useActionState } from "react";
import { ConfirmButton, Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form";
import type { PickupPoint } from "@/lib/db/schema";
import { createPickupPoint, deletePickupPoint, movePickupPoint, updatePickupPoint } from "./actions";

function PickupPointFields({ point }: { point?: PickupPoint }) {
  return (
    <>
      <Field label="Nom" hint="Tel que le client le verra">
        <input name="name" required defaultValue={point?.name ?? ""} className={inputClass} placeholder="Aire de covoiturage de Lanester" />
      </Field>
      <Field label="Adresse ou repère">
        <input name="address" defaultValue={point?.address ?? ""} className={inputClass} placeholder="Lanester, à côté du McDonald's" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Consignes" hint="Affichées au client après la réservation">
          <textarea name="instructions" rows={2} defaultValue={point?.instructions ?? ""} className={inputClass} />
        </Field>
      </div>
      <label className="flex items-center gap-3 self-end pb-2">
        <input type="checkbox" name="active" defaultChecked={point?.active ?? true} className="h-5 w-5 accent-brick" />
        <span className="font-bold">Proposé aux clients</span>
      </label>
    </>
  );
}

export function PickupPointCreateForm() {
  const [state, action] = useActionState(createPickupPoint, null);
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 items-end">
      <PickupPointFields />
      <div>
        <SubmitButton>Ajouter le lieu</SubmitButton>
      </div>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function PickupPointRow({
  point,
  index,
  count,
  bookingCount,
}: {
  point: PickupPoint;
  index: number;
  count: number;
  bookingCount: number;
}) {
  const [editState, editAction] = useActionState(updatePickupPoint, null);
  const [deleteState, deleteAction] = useActionState(deletePickupPoint, null);

  return (
    <li className={`brick-card p-5 ${point.active ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="display text-xl font-semibold">
          {point.name}
          {!point.active ? <span className="ml-3 text-sm bg-slate-200 px-2 py-0.5 rounded-md">désactivé</span> : null}
        </p>
        <div className="flex items-center gap-4 text-sm text-slate-ink">
          <span>
            {bookingCount} réservation{bookingCount > 1 ? "s" : ""}
          </span>
          <form action={movePickupPoint} className="flex gap-2">
            <input type="hidden" name="id" value={point.id} />
            <button name="direction" value="up" disabled={index === 0} className="font-bold disabled:opacity-30" aria-label="Monter">
              ↑
            </button>
            <button name="direction" value="down" disabled={index === count - 1} className="font-bold disabled:opacity-30" aria-label="Descendre">
              ↓
            </button>
          </form>
        </div>
      </div>

      <form action={editAction} className="mt-4 grid gap-4 sm:grid-cols-2 items-end">
        <input type="hidden" name="id" value={point.id} />
        <PickupPointFields point={point} />
        <div>
          <SubmitButton variant="paper">Enregistrer</SubmitButton>
        </div>
        <div className="sm:col-span-2">
          <FormMessage state={editState} />
        </div>
      </form>

      <form action={deleteAction} className="mt-3">
        <input type="hidden" name="id" value={point.id} />
        <ConfirmButton>Supprimer ce lieu</ConfirmButton>
        <FormMessage state={deleteState} />
      </form>
    </li>
  );
}
