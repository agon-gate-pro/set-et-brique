"use client";

import Image from "next/image";
import { useActionState, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { ImagePlus } from "lucide-react";
import {
  ConfirmButton,
  Field,
  FormMessage,
  SubmitButton,
  inputClass,
  type ActionState,
} from "@/components/admin/form";
import { todayIso } from "@/lib/dates";
import { copyConditionLabels, copyStatusLabels } from "@/lib/format";
import { useFormDirty } from "@/lib/use-form-dirty";
import type { SetCopy, SetImage } from "@/lib/db/schema";
import {
  addSetImage,
  addCopy,
  deleteCopy,
  deleteSet,
  deleteSetImage,
  moveSetImage,
  reorderSetImages,
  updateCopy,
  updateSetImageAlt,
} from "../actions";

/* ---------------- Photos ---------------- */

/** Doit rester égal à `MAX_IMAGES_PER_SET` dans `../actions.ts` (pas partageable : ce fichier tourne côté client, l'autre est "use server"). */
const MAX_IMAGES_PER_SET = 10;

/** Dans son propre composant pour que `useFormStatus` ne reflète que ce petit formulaire. */
function MoveButtons({ imageId, canMoveLeft, canMoveRight }: { imageId: string; canMoveLeft: boolean; canMoveRight: boolean }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        formAction={moveSetImage.bind(null, imageId, "up")}
        disabled={!canMoveLeft || pending}
        className="font-bold cursor-pointer transition-colors hover:text-brick disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-inherit"
        aria-label="Avancer"
      >
        {pending ? "…" : "←"}
      </button>
      <button
        type="submit"
        formAction={moveSetImage.bind(null, imageId, "down")}
        disabled={!canMoveRight || pending}
        className="font-bold cursor-pointer transition-colors hover:text-brick disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-inherit"
        aria-label="Reculer"
      >
        {pending ? "…" : "→"}
      </button>
    </>
  );
}

/** Description d'une photo, modifiable après coup : enregistrée quand le champ perd le focus. */
function AltEditor({ imageId, initialAlt }: { imageId: string; initialAlt: string | null }) {
  const [value, setValue] = useState(initialAlt ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const next = value.trim();
    if (next === (initialAlt ?? "")) return;
    setSaving(true);
    await updateSetImageAlt(imageId, next || null);
    setSaving(false);
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      disabled={saving}
      placeholder="Description (facultatif)"
      aria-label="Description de la photo"
      className="focus-outline-none w-full border-t border-slate-ink/15 bg-paper px-2 py-1.5 text-xs text-ink-deep disabled:opacity-60"
    />
  );
}

/** Retrait direct, sans confirmation en deux temps : une photo se réajoute en un envoi. */
function RemoveImageButton({ imageId }: { imageId: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={deleteSetImage.bind(null, imageId)}
      disabled={pending}
      className="font-bold text-brick-deep underline underline-offset-4 cursor-pointer transition-colors hover:text-brick disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? "Retrait…" : "Retirer"}
    </button>
  );
}

export function ImagesSection({ setId, images }: { setId: string; images: SetImage[] }) {
  const [uploadState, setUploadState] = useState<ActionState>(null);
  const [uploadProgress, setUploadProgress] = useState<{ index: number; total: number; fileName: string } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Une requête par photo (voir `addSetImage` côté serveur) pour ne jamais
  // dépasser la taille de requête autorisée, quel que soit le nombre choisi.
  // Pas de description ici : avec plusieurs photos à la fois, un texte commun
  // au lot n'aurait pas de sens ; elle s'ajoute après coup, photo par photo.
  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const files = Array.from(fileInputRef.current?.files ?? []);
    if (files.length === 0) return;
    setUploadState(null);
    let uploaded = 0;
    const failures: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ index: i + 1, total: files.length, fileName: file.name });
      const result = await addSetImage(setId, file, null);
      if (result.error) failures.push(result.error);
      else uploaded += 1;
    }
    setUploadProgress(null);
    if (failures.length > 0) {
      // Une erreur qui se répète (ex. limite de 10 photos atteinte, pour chaque photo suivante)
      // se regroupe en une ligne plutôt que de s'afficher autant de fois.
      const counts = new Map<string, number>();
      for (const f of failures) counts.set(f, (counts.get(f) ?? 0) + 1);
      const lines = [...counts.entries()].map(([msg, n]) => (n > 1 ? `${msg} (× ${n})` : msg));
      const prefix = uploaded > 0 ? `${uploaded} photo${uploaded > 1 ? "s" : ""} ajoutée${uploaded > 1 ? "s" : ""}. ` : "";
      setUploadState({ error: `${prefix}${lines.join(" ; ")}` });
    } else {
      setUploadState({ ok: uploaded > 1 ? `${uploaded} photos ajoutées.` : "Photo ajoutée." });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFiles([]);
  }

  // Ordre affiché : local, pour que le glisser-déposer réponde tout de suite ;
  // recalé sur la prop dès que le serveur renvoie une nouvelle liste (après
  // un ajout, une suppression ou une flèche).
  const [order, setOrder] = useState(() => images.map((img) => img.id));
  const [prevImages, setPrevImages] = useState(images);
  if (images !== prevImages) {
    setPrevImages(images);
    setOrder(images.map((img) => img.id));
  }
  const dragId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const byId = new Map(images.map((img) => [img.id, img]));
  const ordered = order.map((id) => byId.get(id)).filter((img): img is SetImage => img != null);

  function handleDrop(targetId: string) {
    const draggedId = dragId.current;
    dragId.current = null;
    setDraggingId(null);
    if (!draggedId || draggedId === targetId) return;
    const next = order.slice();
    const from = next.indexOf(draggedId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, draggedId);
    setOrder(next);
    reorderSetImages(setId, next);
  }

  return (
    <section className="mt-8 brick-card p-6">
      <h2 className="text-2xl font-semibold">Photos</h2>
      <p className="mt-1 text-slate-ink">
        La première photo est celle affichée dans le catalogue. JPEG, PNG ou WebP, 8 Mo maximum,
        {MAX_IMAGES_PER_SET} photos par set au plus ({images.length}/{MAX_IMAGES_PER_SET}). Glissez une photo
        pour la réordonner, ou utilisez les flèches.
      </p>

      {ordered.length > 0 ? (
        <ul className="mt-5 grid gap-4 grid-cols-2 md:grid-cols-4">
          {ordered.map((img, i) => (
            <li
              key={img.id}
              draggable
              onDragStart={() => {
                dragId.current = img.id;
                setDraggingId(img.id);
              }}
              onDragEnd={() => {
                dragId.current = null;
                setDraggingId(null);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(img.id);
              }}
              className={`rounded-xl overflow-hidden border border-slate-ink/15 bg-sky cursor-grab active:cursor-grabbing ${
                draggingId === img.id ? "opacity-40" : ""
              }`}
            >
              <div className="relative aspect-square">
                <Image src={img.url} alt={img.alt ?? ""} fill sizes="(min-width: 768px) 200px, 45vw" className="object-cover" />
                {i === 0 ? (
                  <span className="absolute top-2 left-2 text-xs font-bold bg-sun px-2 py-0.5 rounded-md">
                    principale
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 p-2 text-sm">
                <form className="flex gap-2">
                  <MoveButtons imageId={img.id} canMoveLeft={i !== 0} canMoveRight={i !== ordered.length - 1} />
                </form>
                <form>
                  <RemoveImageButton imageId={img.id} />
                </form>
              </div>
              <AltEditor imageId={img.id} initialAlt={img.alt} />
            </li>
          ))}
        </ul>
      ) : null}

      {images.length >= MAX_IMAGES_PER_SET ? (
        <p className="mt-5 rounded-xl border border-brick/30 bg-red-50 px-4 py-3 font-semibold text-brick-deep">
          {MAX_IMAGES_PER_SET} photos, le maximum par set. Retirez-en une avant d&apos;en ajouter de nouvelles.
        </p>
      ) : (
        <form onSubmit={handleUpload} className="mt-5">
          <span className="block font-bold text-ink-deep">Nouvelles photos</span>
          <span className="block text-sm text-slate-ink">La description de chaque photo s&apos;ajoute après, sous sa vignette</span>
          <label
            htmlFor="new-set-images"
            className="mt-2 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-ink/25 bg-sky/50 px-4 py-8 text-center cursor-pointer transition-colors hover:border-brick hover:bg-sky"
          >
            <ImagePlus className="h-7 w-7 text-slate-ink" aria-hidden="true" />
            <span className="font-bold text-ink-deep">Cliquez pour choisir des photos</span>
            <span className="text-xs text-slate-ink">JPEG, PNG ou WebP, plusieurs à la fois</span>
          </label>
          <input
            id="new-set-images"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            required
            className="sr-only"
            onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []).map((f) => f.name))}
          />
          {selectedFiles.length > 0 ? (
            <div className="mt-2 rounded-xl border border-slate-ink/15 bg-sky px-4 py-3">
              <p className="font-bold text-ink-deep">
                {selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""} sélectionnée
                {selectedFiles.length > 1 ? "s" : ""}
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-ink">
                {selectedFiles.map((name, i) => (
                  <li key={i} className="break-all">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={uploadProgress != null} className="btn btn-leaf disabled:opacity-60 disabled:cursor-wait">
              {uploadProgress ? "Envoi…" : "Ajouter les photos"}
            </button>
          </div>
          <FormMessage state={uploadState} />
        </form>
      )}

      {uploadProgress ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-4" role="status" aria-live="polite">
          <div className="brick-card bg-paper p-6 max-w-sm w-full text-center">
            <p className="font-bold text-lg text-ink-deep">Envoi des photos…</p>
            <p className="mt-2 text-slate-ink">
              Photo {uploadProgress.index} sur {uploadProgress.total}
            </p>
            <p className="mt-1 text-sm text-slate-ink truncate" title={uploadProgress.fileName}>
              {uploadProgress.fileName}
            </p>
            <div className="mt-4 h-2 rounded-full bg-sky overflow-hidden">
              <div
                className="h-full bg-brick transition-all"
                style={{ width: `${((uploadProgress.index - 1) / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
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
      <Field label="Date d'entrée en stock">
        <input
          name="stockEntryDate"
          type="date"
          defaultValue={copy ? (copy.stockEntryDate ?? "") : todayIso()}
          className={inputClass}
        />
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

function CopyEditor({ copy, canDelete }: { copy: SetCopy; canDelete: boolean }) {
  const [editState, editAction] = useActionState(updateCopy, null);
  const [deleteState, deleteAction] = useActionState(deleteCopy, null);
  const { ref: formRef, dirty, markClean } = useFormDirty();
  const [prevEditState, setPrevEditState] = useState(editState);
  if (editState !== prevEditState) {
    setPrevEditState(editState);
    if (editState?.ok) markClean();
  }
  return (
    <div>
      <form ref={formRef} action={editAction} className="grid gap-4 sm:grid-cols-3">
        <input type="hidden" name="id" value={copy.id} />
        <CopyFields copy={copy} />
        <div className="sm:col-span-3 flex justify-end">
          <SubmitButton variant="leaf" disabled={!dirty}>Enregistrer</SubmitButton>
        </div>
        <div className="sm:col-span-3">
          <FormMessage state={editState} />
        </div>
      </form>
      {canDelete ? (
        <form action={deleteAction} className="mt-2 pt-2 border-t border-slate-ink/10">
          <input type="hidden" name="id" value={copy.id} />
          <ConfirmButton asDialog state={deleteState}>
            Supprimer cet exemplaire
          </ConfirmButton>
        </form>
      ) : (
        <p className="mt-2 pt-2 border-t border-slate-ink/10 text-sm text-slate-ink">
          Dernier exemplaire du set : le supprimer reviendrait à supprimer le set entier. Pour ça, passez plutôt le
          set en « Archivé » (champ Statut de la fiche) ou supprimez-le, plus bas.
        </p>
      )}
    </div>
  );
}

function NewCopyForm({ setId }: { setId: string }) {
  const [state, action] = useActionState(addCopy, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <input type="hidden" name="setId" value={setId} />
      <CopyFields />
      <div className="sm:col-span-3 flex justify-end">
        <SubmitButton variant="leaf">Ajouter l&apos;exemplaire</SubmitButton>
      </div>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/**
 * Une couleur par exemplaire au-delà du premier (qui reste sur le blanc habituel),
 * pour ne pas confondre au premier coup d'œil sur lequel on travaille. Les classes
 * doivent rester écrites en toutes lettres ici (pas de nom de couleur interpolé en
 * template) pour que Tailwind les génère : il ne scanne pas les chaînes construites
 * dynamiquement.
 */
const copyTints = [
  { panel: "bg-sun/20", tabActive: "bg-sun/20", tabInactive: "bg-sun/8 hover:bg-sun/15" },
  { panel: "bg-leaf/15", tabActive: "bg-leaf/15", tabInactive: "bg-leaf/6 hover:bg-leaf/12" },
  { panel: "bg-sea/12", tabActive: "bg-sea/12", tabInactive: "bg-sea/6 hover:bg-sea/12" },
];

function tintForIndex(index: number) {
  return index === 0 ? null : copyTints[(index - 1) % copyTints.length];
}

/**
 * Onglets en haut de la fiche set, un par exemplaire (plus un pour en ajouter
 * un nouveau) : on choisit l'exemplaire sur lequel on travaille avant de voir
 * son détail, plutôt qu'une longue liste. Par défaut, le premier exemplaire.
 */
export function CopiesSection({ setId, copies }: { setId: string; copies: SetCopy[] }) {
  const [selected, setSelected] = useState<string | "new">(() => copies[0]?.id ?? "new");
  const [prevCopies, setPrevCopies] = useState(copies);
  if (copies !== prevCopies) {
    if (selected === "new" && copies.length > prevCopies.length) {
      const added = copies.find((c) => !prevCopies.some((p) => p.id === c.id));
      if (added) setSelected(added.id);
    } else if (selected !== "new" && !copies.some((c) => c.id === selected)) {
      setSelected(copies[0]?.id ?? "new");
    }
    setPrevCopies(copies);
  }

  const activeCopy = selected !== "new" ? copies.find((c) => c.id === selected) : undefined;
  const activeCopyIndex = activeCopy ? copies.findIndex((c) => c.id === activeCopy.id) : -1;
  // La couleur du prochain exemplaire à venir, déjà visible dès l'onglet « Nouvel exemplaire ».
  const newTint = tintForIndex(copies.length);
  const activeTint = selected === "new" ? newTint : activeCopyIndex >= 0 ? tintForIndex(activeCopyIndex) : null;
  const panelBg = activeTint?.panel ?? "bg-paper";

  return (
    <section className="mt-6">
      <h2 className="text-2xl font-semibold">Exemplaires</h2>
      <p className="mt-1 text-slate-ink">
        Chaque boîte physique est un exemplaire. C&apos;est l&apos;exemplaire qui est
        réservé ; un set avec deux exemplaires peut être loué deux fois en même temps.
        « En location » et « en battement » ne se règlent pas ici : ils découlent des
        réservations. Passez un exemplaire « En réparation » pour le bloquer le temps
        d&apos;un souci, « Retiré » s&apos;il ne reviendra pas.
      </p>

      <div className="mt-4 flex flex-wrap gap-1">
        {copies.map((c, i) => {
          const tint = tintForIndex(i);
          const active = tint ? `${tint.tabActive} border-slate-ink/15 text-ink-deep` : "bg-paper border-slate-ink/15 text-ink-deep";
          const inactive = tint ? `${tint.tabInactive} border-transparent text-slate-ink` : "bg-sky/70 border-transparent text-slate-ink hover:bg-sky";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              aria-current={selected === c.id ? "true" : undefined}
              className={`rounded-t-xl px-4 py-2.5 font-bold text-sm border border-b-0 cursor-pointer transition-colors ${
                selected === c.id ? active : inactive
              }`}
            >
              {c.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setSelected("new")}
          aria-current={selected === "new" ? "true" : undefined}
          className={`rounded-t-xl px-4 py-2.5 font-bold text-sm border border-b-0 cursor-pointer transition-colors ${
            selected === "new"
              ? newTint
                ? `${newTint.tabActive} border-slate-ink/15 text-ink-deep`
                : "bg-paper border-slate-ink/15 text-ink-deep"
              : newTint
                ? `${newTint.tabInactive} border-transparent text-slate-ink`
                : "bg-sky/70 border-transparent text-slate-ink hover:bg-sky"
          }`}
        >
          + Nouvel exemplaire
        </button>
      </div>

      <div className={`brick-card -mt-px rounded-tl-none p-6 ${panelBg}`}>
        {activeCopy ? (
          <CopyEditor key={activeCopy.id} copy={activeCopy} canDelete={copies.length > 1} />
        ) : (
          <NewCopyForm key="new" setId={setId} />
        )}
      </div>
    </section>
  );
}

/* ---------------- Suppression ---------------- */

export function DeleteSetForm({ setId }: { setId: string }) {
  const [state, action] = useActionState(deleteSet, null);
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="id" value={setId} />
      <ConfirmButton asDialog confirmLabel="Oui, supprimer définitivement" state={state}>
        Supprimer ce set
      </ConfirmButton>
    </form>
  );
}
