"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  ConfirmButton,
  Field,
  FormMessage,
  SubmitButton,
  inputClass,
} from "@/components/admin/form";
import { copyConditionLabels, copyStatusLabels } from "@/lib/format";
import type { SetCopy, SetImage } from "@/lib/db/schema";
import {
  addCopy,
  addSetImage,
  deleteCopy,
  deleteSet,
  deleteSetImage,
  moveSetImage,
  updateCopy,
} from "../actions";

/* ---------------- Photos ---------------- */

export function ImagesSection({ setId, images }: { setId: string; images: SetImage[] }) {
  const [state, action] = useActionState(addSetImage, null);

  return (
    <section className="mt-8 brick-card p-6">
      <h2 className="text-2xl font-semibold">Photos</h2>
      <p className="mt-1 text-slate-ink">
        La première photo est celle affichée dans le catalogue. JPEG, PNG ou WebP, 8 Mo maximum,
        10 photos par set au plus ({images.length}/10).
      </p>

      {images.length > 0 ? (
        <ul className="mt-5 grid gap-4 grid-cols-2 md:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="rounded-xl overflow-hidden border border-slate-ink/15 bg-sky">
              <div className="relative aspect-square">
                <Image src={img.url} alt={img.alt ?? ""} fill sizes="(min-width: 768px) 200px, 45vw" className="object-cover" />
                {i === 0 ? (
                  <span className="absolute top-2 left-2 text-xs font-bold bg-sun px-2 py-0.5 rounded-md">
                    principale
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 p-2 text-sm">
                <form action={moveSetImage} className="flex gap-2">
                  <input type="hidden" name="id" value={img.id} />
                  <button name="direction" value="up" disabled={i === 0} className="font-bold disabled:opacity-30" aria-label="Monter">
                    ←
                  </button>
                  <button name="direction" value="down" disabled={i === images.length - 1} className="font-bold disabled:opacity-30" aria-label="Descendre">
                    →
                  </button>
                </form>
                <form action={deleteSetImage}>
                  <input type="hidden" name="id" value={img.id} />
                  <ConfirmButton confirmLabel="Supprimer">Retirer</ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={action} className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
        <input type="hidden" name="setId" value={setId} />
        <Field label="Nouvelle photo">
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required className={inputClass} />
        </Field>
        <Field label="Description de la photo" hint="Facultatif, pour l'accessibilité">
          <input name="alt" className={inputClass} placeholder="Le set monté, vu de face" />
        </Field>
        <SubmitButton variant="paper">Ajouter la photo</SubmitButton>
        <div className="sm:col-span-3">
          <FormMessage state={state} />
        </div>
      </form>
    </section>
  );
}

/* ---------------- Exemplaires ---------------- */

function CopyFields({ copy }: { copy?: SetCopy }) {
  return (
    <>
      <Field label="Libellé">
        <input name="label" required defaultValue={copy?.label ?? ""} className={inputClass} placeholder="Exemplaire 2" />
      </Field>
      <Field label="État">
        <select name="condition" defaultValue={copy?.condition ?? "very_good"} className={inputClass}>
          {Object.entries(copyConditionLabels).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Statut">
        <select name="status" defaultValue={copy?.status ?? "available"} className={inputClass}>
          {Object.entries(copyStatusLabels).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Note interne">
        <input name="note" defaultValue={copy?.note ?? ""} className={inputClass} placeholder="Pièce 3x2 rouge manquante…" />
      </Field>
    </>
  );
}

function CopyRow({ copy }: { copy: SetCopy }) {
  const [editState, editAction] = useActionState(updateCopy, null);
  const [deleteState, deleteAction] = useActionState(deleteCopy, null);
  return (
    <li className="rounded-xl border border-slate-ink/15 p-4">
      <form action={editAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1.5fr_auto] items-end">
        <input type="hidden" name="id" value={copy.id} />
        <CopyFields copy={copy} />
        <SubmitButton variant="paper">Enregistrer</SubmitButton>
        <div className="sm:col-span-5">
          <FormMessage state={editState} />
        </div>
      </form>
      <form action={deleteAction} className="mt-2">
        <input type="hidden" name="id" value={copy.id} />
        <ConfirmButton>Supprimer cet exemplaire</ConfirmButton>
        <FormMessage state={deleteState} />
      </form>
    </li>
  );
}

export function CopiesSection({ setId, copies }: { setId: string; copies: SetCopy[] }) {
  const [state, action] = useActionState(addCopy, null);
  return (
    <section className="mt-8 brick-card p-6">
      <h2 className="text-2xl font-semibold">Exemplaires</h2>
      <p className="mt-1 text-slate-ink">
        Chaque boîte physique est un exemplaire. C&apos;est l&apos;exemplaire qui est
        réservé ; un set avec deux exemplaires peut être loué deux fois en même temps.
        « En location » et « en battement » ne se règlent pas ici : ils découlent des
        réservations. Passez un exemplaire « En réparation » pour le bloquer le temps
        d&apos;un souci, « Retiré » s&apos;il ne reviendra pas.
      </p>
      <ul className="mt-5 space-y-3">
        {copies.map((c) => (
          <CopyRow key={c.id} copy={c} />
        ))}
      </ul>
      <form action={action} className="mt-5 rounded-xl bg-sky border border-slate-ink/15 p-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1.5fr_auto] items-end">
        <input type="hidden" name="setId" value={setId} />
        <CopyFields />
        <SubmitButton>Ajouter</SubmitButton>
        <div className="sm:col-span-5">
          <FormMessage state={state} />
        </div>
      </form>
    </section>
  );
}

/* ---------------- Suppression ---------------- */

export function DeleteSetForm({ setId }: { setId: string }) {
  const [state, action] = useActionState(deleteSet, null);
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="id" value={setId} />
      <ConfirmButton confirmLabel="Oui, supprimer définitivement">Supprimer ce set</ConfirmButton>
      <FormMessage state={state} />
    </form>
  );
}
