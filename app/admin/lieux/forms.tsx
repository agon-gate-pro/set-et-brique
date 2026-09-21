"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmButton, Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form";
import { useFormDirty } from "@/lib/use-form-dirty";
import type { PickupPoint } from "@/lib/db/schema";
import { createPickupPoint, deletePickupPoint, movePickupPoint, updatePickupPoint } from "./actions";

type Slot = { from: string; until: string };

/** Créneaux horaires d'un lieu, transmis au serveur en JSON via un champ caché (`name="slots"`). */
function SlotsField({ slots, onChange }: { slots: Slot[]; onChange: (slots: Slot[]) => void }) {
  function update(i: number, key: keyof Slot, value: string) {
    onChange(
      slots.map((s, idx) => {
        if (idx !== i) return s;
        // La fin recule en même temps que le début si elle se retrouve avant lui.
        if (key === "from" && s.until && s.until < value) return { from: value, until: value };
        return { ...s, [key]: value };
      }),
    );
  }
  function remove(i: number) {
    onChange(slots.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <span className="block font-bold text-ink-deep">Créneaux de remise possibles</span>
      <span className="block text-sm text-slate-ink">Aucun créneau : toute heure est proposée</span>
      <div className="mt-2 flex flex-col gap-2">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-slate-ink">de</span>
            <input
              type="time"
              step={900}
              value={slot.from}
              onChange={(e) => update(i, "from", e.target.value)}
              className={inputClass}
              aria-label={`Heure de début du créneau ${i + 1}`}
            />
            <span className="text-slate-ink">à</span>
            <input
              type="time"
              step={900}
              min={slot.from || undefined}
              value={slot.until}
              onChange={(e) => update(i, "until", e.target.value)}
              className={inputClass}
              aria-label={`Heure de fin du créneau ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Retirer ce créneau"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-ink cursor-pointer transition-colors hover:bg-sky hover:text-brick-deep"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...slots, { from: "09:00", until: "12:00" }])}
        className="btn btn-sun mt-2 text-sm py-2 px-4"
      >
        + Ajouter un créneau
      </button>
      <input type="hidden" name="slots" value={JSON.stringify(slots)} />
    </div>
  );
}

function PickupPointFields({
  point,
  slots,
  onSlotsChange,
  name,
  onNameChange,
}: {
  point?: PickupPoint;
  slots: Slot[];
  onSlotsChange: (slots: Slot[]) => void;
  /** Contrôlé uniquement à la création, pour ne pouvoir enregistrer que si un nom est saisi. */
  name?: string;
  onNameChange?: (name: string) => void;
}) {
  return (
    <>
      <Field label="Nom" hint="Tel que le client le verra">
        <input
          name="name"
          required
          className={inputClass}
          placeholder="Aire de covoiturage de Lanester"
          {...(onNameChange
            ? { value: name ?? "", onChange: (e: ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value) }
            : { defaultValue: point?.name ?? "" })}
        />
      </Field>
      <Field label="Adresse ou repère">
        <input name="address" defaultValue={point?.address ?? ""} className={inputClass} placeholder="Lanester, à côté du McDonald's" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Consignes" hint="Affichées au client après la réservation">
          <textarea name="instructions" rows={2} defaultValue={point?.instructions ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-start justify-between gap-6">
        <SlotsField slots={slots} onChange={onSlotsChange} />
        <label className="flex shrink-0 items-center gap-3 pt-0.5">
          <input type="checkbox" name="active" defaultChecked={point?.active ?? true} className="h-5 w-5 accent-brick" />
          <span className="font-bold">Proposé aux clients</span>
        </label>
      </div>
    </>
  );
}

export function PickupPointCreateForm() {
  const [state, action] = useActionState(createPickupPoint, null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [name, setName] = useState("");
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 items-end">
      <PickupPointFields slots={slots} onSlotsChange={setSlots} name={name} onNameChange={setName} />
      <div className="sm:col-span-2 flex justify-end">
        <SubmitButton variant="leaf" disabled={name.trim() === ""}>Ajouter le lieu</SubmitButton>
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
  const { ref: formRef, dirty: fieldsDirty, markClean } = useFormDirty();
  const [slots, setSlots] = useState<Slot[]>(point.slots);
  const [initialSlots, setInitialSlots] = useState(point.slots);
  const dirty = fieldsDirty || JSON.stringify(slots) !== JSON.stringify(initialSlots);

  const [prevEditState, setPrevEditState] = useState(editState);
  if (editState !== prevEditState) {
    setPrevEditState(editState);
    if (editState?.ok) {
      markClean();
      setInitialSlots(slots);
    }
  }

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

      <form ref={formRef} action={editAction} className="mt-4 grid gap-4 sm:grid-cols-2 items-end">
        <input type="hidden" name="id" value={point.id} />
        <PickupPointFields point={point} slots={slots} onSlotsChange={setSlots} />
        <div>
          <SubmitButton variant="leaf" disabled={!dirty}>Enregistrer</SubmitButton>
        </div>
        <div className="sm:col-span-2">
          <FormMessage state={editState} />
        </div>
        <div className="sm:col-span-2 mt-2 pt-4 border-t border-slate-ink/10">
          {/* Le bouton vit dans le formulaire de modification mais soumet celui de suppression (attribut form). */}
          <ConfirmButton form={`delete-${point.id}`}>Supprimer ce lieu</ConfirmButton>
        </div>
      </form>

      <form id={`delete-${point.id}`} action={deleteAction}>
        <input type="hidden" name="id" value={point.id} />
        <FormMessage state={deleteState} />
      </form>
    </li>
  );
}
