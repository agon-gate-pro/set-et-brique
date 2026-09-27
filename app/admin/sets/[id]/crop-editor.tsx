"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import { CroppedImage } from "@/components/cropped-image";
import { DEFAULT_CROP, MAX_CROP_ZOOM, type ImageCrop } from "@/lib/image-crop";
import { updateSetImageCrop } from "../actions";

/** Format des cartes du catalogue : la sélection est verrouillée à ce rapport largeur / hauteur. */
const FRAME_RATIO = 4 / 3;
/** En deçà de ce déplacement (px), un clic hors de la zone ne trace pas de nouvelle sélection. */
const DRAW_THRESHOLD = 4;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Zone gardée, en fractions de la largeur et de la hauteur de la photo (0 à 1). */
type Selection = { x: number; y: number; w: number; h: number };
type Corner = "nw" | "ne" | "sw" | "se";

/**
 * Passage entre la zone sélectionnée et le cadrage enregistré (`ImageCrop`). Au zoom z, la partie
 * visible fait `cover / z` de la photo (cover : part visible à 100 %, photo rognée au cadre 4:3),
 * et son bord gauche est à `x % × (1 − largeur visible)` : une zone tracée se traduit donc
 * exactement en position + zoom, sans rien changer au rendu du site (`cropStyles`).
 */
function coverOf(ratio: number) {
  return { w: Math.min(1, FRAME_RATIO / ratio), h: Math.min(1, ratio / FRAME_RATIO) };
}

function selectionFromCrop(crop: ImageCrop, ratio: number): Selection {
  const cover = coverOf(ratio);
  const w = cover.w / crop.zoom;
  const h = cover.h / crop.zoom;
  return { x: (crop.x / 100) * (1 - w), y: (crop.y / 100) * (1 - h), w, h };
}

function cropFromSelection(s: Selection, ratio: number): ImageCrop {
  const cover = coverOf(ratio);
  const pos = (start: number, size: number) => (size < 0.999 ? clamp((start / (1 - size)) * 100, 0, 100) : 50);
  return { x: pos(s.x, s.w), y: pos(s.y, s.h), zoom: clamp(cover.w / s.w, 1, MAX_CROP_ZOOM) };
}

/**
 * Fenêtre de recadrage d'une photo, sur le modèle de l'outil Capture d'écran : la photo entière,
 * la zone gardée encadrée et le reste assombri. On trace une nouvelle zone en cliquant-glissant,
 * on la déplace de l'intérieur, on la redimensionne par ses coins ; ses proportions restent
 * celles du catalogue (4:3). Rien n'est découpé : seul le cadrage est enregistré.
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
    | { kind: "resize"; ax: number; ay: number }
    | { kind: "draw"; ax: number; ay: number; px: number; py: number; started: boolean }
    | null
  >(null);

  const crop = ratio && selection ? cropFromSelection(selection, ratio) : initial;

  /** Point du pointeur, en fractions de la photo. */
  function pointAt(clientX: number, clientY: number) {
    const rect = photoRef.current!.getBoundingClientRect();
    return { x: clamp((clientX - rect.left) / rect.width, 0, 1), y: clamp((clientY - rect.top) / rect.height, 0, 1) };
  }

  /** Zone en 4:3 tirée depuis un coin fixe (ax, ay) vers le point (px, py), bornée à la photo et au zoom maximal. */
  function fromAnchor(ax: number, ay: number, px: number, py: number): Selection {
    const r = ratio!;
    const cover = coverOf(r);
    const right = px >= ax;
    const down = py >= ay;
    // Largeur en fraction de la photo ; la hauteur s'en déduit pour rester à 4:3 à l'écran.
    const room = Math.min(right ? 1 - ax : ax, ((down ? 1 - ay : ay) * FRAME_RATIO) / r);
    const wanted = Math.max(Math.abs(px - ax), (Math.abs(py - ay) * FRAME_RATIO) / r);
    const w = clamp(Math.min(wanted, room), cover.w / MAX_CROP_ZOOM, cover.w);
    const h = (w * r) / FRAME_RATIO;
    return {
      x: clamp(right ? ax : ax - w, 0, 1 - w),
      y: clamp(down ? ay : ay - h, 0, 1 - h),
      w,
      h,
    };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!ratio || !selection) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointAt(e.clientX, e.clientY);
    const corner = (e.target as HTMLElement).dataset.corner as Corner | undefined;
    const s = selection;
    if (corner) {
      // Le coin opposé reste fixe.
      gesture.current = { kind: "resize", ax: corner.includes("w") ? s.x + s.w : s.x, ay: corner.includes("n") ? s.y + s.h : s.y };
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
      setSelection(fromAnchor(g.ax, g.ay, p.x, p.y));
    } else {
      if (!g.started && Math.hypot(e.clientX - g.px, e.clientY - g.py) < DRAW_THRESHOLD) return;
      g.started = true;
      setSelection(fromAnchor(g.ax, g.ay, p.x, p.y));
    }
  }

  const endGesture = () => {
    gesture.current = null;
  };

  async function save() {
    setSaving(true);
    await updateSetImageCrop(imageId, crop);
    setSaving(false);
    onClose();
  }

  const handle = "absolute h-4 w-4 rounded-sm border-2 border-ink-deep bg-paper";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
      onClick={onClose}
    >
      <div className="brick-card bg-paper p-5 sm:p-6 w-full max-w-2xl max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 id="crop-title" className="text-xl font-bold text-ink-deep">
          Recadrer la photo
        </h2>
        <p className="mt-1 text-sm text-slate-ink">
          Tracez la zone à garder en cliquant-glissant sur la photo, déplacez-la, ou agrandissez-la par ses coins.
          Ses proportions restent celles des cartes du catalogue.
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
              setSelection(selectionFromCrop(initial, r));
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
              <span data-corner="nw" className={`${handle} -left-2 -top-2 cursor-nwse-resize`} />
              <span data-corner="ne" className={`${handle} -right-2 -top-2 cursor-nesw-resize`} />
              <span data-corner="sw" className={`${handle} -left-2 -bottom-2 cursor-nesw-resize`} />
              <span data-corner="se" className={`${handle} -right-2 -bottom-2 cursor-nwse-resize`} />
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-ink-deep">Aperçu dans le catalogue</p>
            <div className="relative mt-1.5 aspect-[4/3] w-40 overflow-hidden rounded-lg border border-slate-ink/15 bg-sky">
              <CroppedImage src={url} alt="" sizes="160px" crop={crop} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => ratio && setSelection(selectionFromCrop(DEFAULT_CROP, ratio))}
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
              disabled={saving || !selection}
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
