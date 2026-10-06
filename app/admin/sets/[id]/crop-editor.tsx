"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import { CroppedImage } from "@/components/cropped-image";
import { DEFAULT_CROP, MIN_CROP_SIZE, type ImageCrop } from "@/lib/image-crop";
import { updateSetImageCrop } from "../actions";

/** Format des cartes du catalogue, pour l'aperçu et la zone de départ d'une photo jamais recadrée. */
const FRAME_RATIO = 4 / 3;
/** En deçà de ce déplacement (px), un clic hors de la zone ne trace pas de nouvelle sélection. */
const DRAW_THRESHOLD = 4;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Zone gardée, en fractions de la largeur et de la hauteur de la photo (0 à 1). */
type Selection = { x: number; y: number; w: number; h: number };
/** Poignée : un coin ou le milieu d'un bord, nommé par ses points cardinaux. */
type Handle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

/**
 * Zone de départ : celle déjà choisie, sinon ce que le site affiche aujourd'hui pour cette photo
 * (photo rognée au cadre 4:3 autour du point enregistré, agrandie du zoom).
 */
function initialSelection(crop: ImageCrop, ratio: number): Selection {
  if (crop.rect) return { x: crop.rect.x, y: crop.rect.y, w: crop.rect.w, h: crop.rect.h };
  const zoom = Math.max(1, crop.zoom);
  const w = Math.min(1, FRAME_RATIO / ratio) / zoom;
  const h = Math.min(1, ratio / FRAME_RATIO) / zoom;
  return { x: (crop.x / 100) * (1 - w), y: (crop.y / 100) * (1 - h), w, h };
}

/** Zone entre deux points opposés, d'au moins `MIN_CROP_SIZE` de côté et dans la photo. */
function between(ax: number, ay: number, bx: number, by: number): Selection {
  const w = Math.max(MIN_CROP_SIZE, Math.abs(bx - ax));
  const h = Math.max(MIN_CROP_SIZE, Math.abs(by - ay));
  return { x: clamp(Math.min(ax, bx), 0, 1 - w), y: clamp(Math.min(ay, by), 0, 1 - h), w, h };
}

const HANDLES: { id: Handle; className: string }[] = [
  { id: "nw", className: "-left-2 -top-2 cursor-nwse-resize" },
  { id: "n", className: "left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize" },
  { id: "ne", className: "-right-2 -top-2 cursor-nesw-resize" },
  { id: "e", className: "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
  { id: "se", className: "-right-2 -bottom-2 cursor-nwse-resize" },
  { id: "s", className: "left-1/2 -bottom-2 -translate-x-1/2 cursor-ns-resize" },
  { id: "sw", className: "-left-2 -bottom-2 cursor-nesw-resize" },
  { id: "w", className: "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
];

/**
 * Fenêtre de recadrage d'une photo, sur le modèle de l'outil Capture d'écran : la photo entière,
 * la zone gardée encadrée et le reste assombri. On trace une nouvelle zone en cliquant-glissant,
 * on la déplace de l'intérieur, on la redimensionne par ses coins ou par ses bords, sans
 * proportions imposées : le site affiche la zone entière dans ses cadres, avec des bandes si elle
 * n'en a pas les proportions. Rien n'est découpé : seule la zone est enregistrée.
 */
export function CropEditor({
  imageId,
  url,
  initial,
  onClose,
}: {
  imageId: string;
  url: string;
  initial: ImageCrop;
  onClose: () => void;
}) {
  // Rapport largeur / hauteur de la photo, connu une fois chargée.
  const [ratio, setRatio] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<
    | { kind: "move"; px: number; py: number; start: Selection }
    | { kind: "resize"; handle: Handle; start: Selection }
    | { kind: "draw"; ax: number; ay: number; px: number; py: number; started: boolean }
    | null
  >(null);

  const rect = ratio && selection ? { ...selection, aspect: (selection.w / selection.h) * ratio } : null;

  /** Point du pointeur, en fractions de la photo. */
  function pointAt(clientX: number, clientY: number) {
    const box = photoRef.current!.getBoundingClientRect();
    return { x: clamp((clientX - box.left) / box.width, 0, 1), y: clamp((clientY - box.top) / box.height, 0, 1) };
  }

  /** Zone de départ dont seuls les bords tenus par la poignée suivent le pointeur ; les autres restent fixes. */
  function resized(s: Selection, handle: Handle, p: { x: number; y: number }): Selection {
    let left = s.x;
    let right = s.x + s.w;
    let top = s.y;
    let bottom = s.y + s.h;
    if (handle.includes("w")) left = Math.min(p.x, right - MIN_CROP_SIZE);
    if (handle.includes("e")) right = Math.max(p.x, left + MIN_CROP_SIZE);
    if (handle.includes("n")) top = Math.min(p.y, bottom - MIN_CROP_SIZE);
    if (handle.includes("s")) bottom = Math.max(p.y, top + MIN_CROP_SIZE);
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!ratio || !selection) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointAt(e.clientX, e.clientY);
    const handle = (e.target as HTMLElement).dataset.handle as Handle | undefined;
    const s = selection;
    if (handle) {
      gesture.current = { kind: "resize", handle, start: s };
    } else if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) {
      gesture.current = { kind: "move", px: p.x, py: p.y, start: s };
    } else {
      gesture.current = { kind: "draw", ax: p.x, ay: p.y, px: e.clientX, py: e.clientY, started: false };
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || !ratio) return;
    const p = pointAt(e.clientX, e.clientY);
    if (g.kind === "move") {
      const s = g.start;
      setSelection({ ...s, x: clamp(s.x + p.x - g.px, 0, 1 - s.w), y: clamp(s.y + p.y - g.py, 0, 1 - s.h) });
    } else if (g.kind === "resize") {
      setSelection(resized(g.start, g.handle, p));
    } else {
      if (!g.started && Math.hypot(e.clientX - g.px, e.clientY - g.py) < DRAW_THRESHOLD) return;
      g.started = true;
      setSelection(between(g.ax, g.ay, p.x, p.y));
    }
  }

  const endGesture = () => {
    gesture.current = null;
  };

  async function save() {
    if (!rect) return;
    setSaving(true);
    await updateSetImageCrop(imageId, rect);
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
      onClick={onClose}
    >
      <div className="brick-card bg-paper p-4 sm:p-6 w-full max-w-2xl max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 id="crop-title" className="text-xl font-bold text-ink-deep">
          Recadrer la photo
        </h2>
        <p className="mt-1 text-sm text-slate-ink">
          Tracez la zone à afficher en cliquant-glissant sur la photo, déplacez-la, ou ajustez-la par ses coins et
          ses bords. Le site l&apos;affiche en entier ; si elle n&apos;a pas les proportions de la carte, des bandes
          claires comblent le reste.
        </p>

        <div
          ref={photoRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          className="relative mx-auto mt-4 overflow-hidden rounded-lg bg-sky touch-none select-none cursor-crosshair"
          style={{
            aspectRatio: ratio ?? FRAME_RATIO,
            width: `min(100%, calc(55vh * ${ratio ?? FRAME_RATIO}))`,
          }}
        >
          <Image
            src={url}
            alt=""
            fill
            sizes="(min-width: 640px) 640px, 90vw"
            draggable={false}
            onLoad={(e) => {
              const r = e.currentTarget.naturalWidth / e.currentTarget.naturalHeight;
              setRatio(r);
              setSelection(initialSelection(initial, r));
            }}
            className="object-contain pointer-events-none"
          />
          {selection ? (
            <div
              className="absolute cursor-move border-2 border-paper outline outline-1 outline-ink-deep/60"
              style={{
                left: `${selection.x * 100}%`,
                top: `${selection.y * 100}%`,
                width: `${selection.w * 100}%`,
                height: `${selection.h * 100}%`,
                // Tout ce qui est hors de la zone est assombri.
                boxShadow: "0 0 0 9999px rgb(15 24 55 / 0.55)",
              }}
            >
              {HANDLES.map((h) => (
                <span
                  key={h.id}
                  data-handle={h.id}
                  // Zone sensible plus large que le carré visible, pour le doigt.
                  className={`absolute h-4 w-4 rounded-sm border-2 border-ink-deep bg-paper after:absolute after:-inset-3 after:content-[''] ${h.className}`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-ink-deep">Aperçu dans le catalogue</p>
            <div className="relative mt-1.5 aspect-[4/3] w-40 overflow-hidden rounded-lg border border-slate-ink/15 bg-sky">
              <CroppedImage src={url} alt="" sizes="160px" crop={rect ? { ...DEFAULT_CROP, rect } : initial} />
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-start">
            <button
              type="button"
              onClick={() => ratio && setSelection(initialSelection(DEFAULT_CROP, ratio))}
              className="font-bold underline underline-offset-4 cursor-pointer transition-opacity hover:opacity-70"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-bold underline underline-offset-4 cursor-pointer transition-opacity hover:opacity-70"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !rect}
              className="btn btn-leaf disabled:opacity-60 disabled:cursor-wait"
            >
              {saving ? "Enregistrement…" : "Enregistrer le cadrage"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
