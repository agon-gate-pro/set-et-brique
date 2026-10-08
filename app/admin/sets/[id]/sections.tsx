"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { upload } from "@vercel/blob/client";
import { Crop, ImagePlus, Trash2 } from "lucide-react";
import { CroppedImage } from "@/components/cropped-image";
import { CropEditor } from "./crop-editor";
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
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_SIDE,
  MAX_IMAGES_PER_SET,
  MULTIPART_THRESHOLD_BYTES,
  imageExtension,
  setImagePrefix,
} from "@/lib/set-images";
import {
  addCopy,
  deleteCopy,
  deleteSet,
  deleteSetImage,
  moveSetImage,
  registerSetImage,
  reorderSetImages,
  updateCopy,
  updateSetImageAlt,
} from "../actions";

/* ---------------- Photos ---------------- */

const MAX_IMAGE_MB = MAX_IMAGE_BYTES / 1024 / 1024;

/** Dimensions d'une photo, lues par le navigateur sans attendre son décodage complet. */
function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Vérifications faites avant l'envoi, pour un message clair tout de suite (le serveur revérifie). */
async function checkImageFile(file: File): Promise<string | null> {
  if (!IMAGE_TYPES.includes(file.type)) return `Format non accepté pour « ${file.name} » : JPEG, PNG ou WebP.`;
  if (file.size > MAX_IMAGE_BYTES) return `« ${file.name} » dépasse ${MAX_IMAGE_MB} Mo.`;
  const size = await imageSize(file);
  if (!size) return `« ${file.name} » n'a pas pu être lue comme une photo.`;
  if (Math.max(size.width, size.height) > MAX_IMAGE_SIDE) {
    return `« ${file.name} » est trop grande (${size.width} × ${size.height} px, ${MAX_IMAGE_SIDE} px au plus de côté) : réduisez-la avant de l'envoyer.`;
  }
  return null;
}

/** Dans son propre composant pour que `useFormStatus` ne reflète que ce petit formulaire. */
function MoveButtons({ imageId, canMoveLeft, canMoveRight }: { imageId: string; canMoveLeft: boolean; canMoveRight: boolean }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        formAction={moveSetImage.bind(null, imageId, "up")}
        disabled={!canMoveLeft || pending}
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold cursor-pointer transition-colors hover:bg-sky hover:text-brick disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
        aria-label="Avancer"
      >
        {pending ? "…" : "←"}
      </button>
      <button
        type="submit"
        formAction={moveSetImage.bind(null, imageId, "down")}
        disabled={!canMoveRight || pending}
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold cursor-pointer transition-colors hover:bg-sky hover:text-brick disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
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
      placeholder="Description…"
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
      aria-label="Retirer la photo"
      className="flex h-8 w-8 sm:h-auto sm:w-auto items-center justify-center rounded-full font-bold text-brick-deep sm:underline sm:underline-offset-4 cursor-pointer transition-colors hover:text-brick hover:bg-red-50 sm:hover:bg-transparent disabled:cursor-wait disabled:opacity-50"
    >
      {/* Téléphone : corbeille seule, le libellé ne tenait pas à côté des flèches. */}
      <Trash2 className="h-4 w-4 sm:hidden" aria-hidden="true" />
      <span className="hidden sm:inline">{pending ? "Retrait…" : "Retirer"}</span>
    </button>
  );
}

export function ImagesSection({ setId, setSlug, images }: { setId: string; setSlug: string; images: SetImage[] }) {
  const [uploadState, setUploadState] = useState<ActionState>(null);
  const [uploadProgress, setUploadProgress] = useState<{ index: number; total: number; fileName: string; percent: number } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Une photo après l'autre, envoyée directement du navigateur vers Vercel Blob
  // (autorisation : `app/api/admin/photos/route.ts`), puis inscrite en base par
  // `registerSetImage`. Pas de description ici : avec plusieurs photos à la fois,
  // un texte commun au lot n'aurait pas de sens ; elle s'ajoute après coup.
  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const files = Array.from(fileInputRef.current?.files ?? []);
    if (files.length === 0) return;
    setUploadState(null);
    let uploaded = 0;
    const failures: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ index: i + 1, total: files.length, fileName: file.name, percent: 0 });
      if (images.length + uploaded >= MAX_IMAGES_PER_SET) {
        failures.push(`${MAX_IMAGES_PER_SET} photos maximum par set. Retirez-en une avant d'en ajouter.`);
        continue;
      }
      const problem = await checkImageFile(file);
      if (problem) {
        failures.push(problem);
        continue;
      }
      try {
        const blob = await upload(`${setImagePrefix(setSlug)}${Date.now()}.${imageExtension(file.type)}`, file, {
          access: "public",
          handleUploadUrl: "/api/admin/photos",
          clientPayload: JSON.stringify({ setId }),
          contentType: file.type,
          multipart: file.size > MULTIPART_THRESHOLD_BYTES,
          onUploadProgress: ({ percentage }) => setUploadProgress((p) => (p ? { ...p, percent: percentage } : p)),
        });
        const result = await registerSetImage(setId, blob.url);
        if (result.error) failures.push(`« ${file.name} » : ${result.error}`);
        else uploaded += 1;
      } catch {
        failures.push(`Échec de l'envoi de « ${file.name} », réessayez.`);
      }
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
  const [croppingId, setCroppingId] = useState<string | null>(null);

  const byId = new Map(images.map((img) => [img.id, img]));
  const ordered = order.map((id) => byId.get(id)).filter((img): img is SetImage => img != null);
  const cropping = croppingId ? byId.get(croppingId) : undefined;

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
        La première photo est celle affichée dans le catalogue. JPEG, PNG ou WebP, {MAX_IMAGE_MB} Mo maximum,{" "}
        {MAX_IMAGES_PER_SET} photos par set au plus ({images.length}/{MAX_IMAGES_PER_SET}). Glissez une photo
        pour la réordonner, ou utilisez les flèches. « Recadrer » règle le zoom et la partie visible
        de chaque photo, sans modifier le fichier.
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
              {/* Même cadre 4:3 que le catalogue : la vignette montre le cadrage réel. */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <CroppedImage
                  src={img.url}
                  alt={img.alt ?? ""}
                  sizes="(min-width: 768px) 200px, 45vw"
                  crop={{ x: img.cropX, y: img.cropY, zoom: img.cropZoom, rect: img.cropRect }}
                />
                {i === 0 ? (
                  <span className="absolute top-2 left-2 text-xs font-bold bg-sun px-2 py-0.5 rounded-md">
                    principale
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setCroppingId(img.id)}
                  aria-label="Recadrer"
                  className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-paper/95 p-2 sm:px-2.5 sm:py-1 text-xs font-bold text-ink-deep shadow-brick-sm cursor-pointer transition-colors hover:bg-sky"
                >
                  <Crop className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden />
                  {/* Téléphone : icône seule, le libellé couvrait la moitié de la vignette. */}
                  <span className="hidden sm:inline">Recadrer</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 text-sm">
                <form className="flex">
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

      {cropping ? (
        <CropEditor
          key={cropping.id}
          imageId={cropping.id}
          url={cropping.url}
          initial={{ x: cropping.cropX, y: cropping.cropY, zoom: cropping.cropZoom, rect: cropping.cropRect }}
          onClose={() => setCroppingId(null)}
        />
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
              Photo {uploadProgress.index} sur {uploadProgress.total} · {Math.round(uploadProgress.percent)} %
            </p>
            <p className="mt-1 text-sm text-slate-ink truncate" title={uploadProgress.fileName}>
              {uploadProgress.fileName}
            </p>
            <div className="mt-4 h-2 rounded-full bg-sky overflow-hidden">
              <div
                className="h-full bg-brick transition-all"
                style={{ width: `${((uploadProgress.index - 1 + uploadProgress.percent / 100) / uploadProgress.total) * 100}%` }}
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
