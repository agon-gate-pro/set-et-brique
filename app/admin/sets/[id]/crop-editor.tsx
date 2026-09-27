"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import { Minus, Move, Plus } from "lucide-react";
import { DEFAULT_CROP, MAX_CROP_ZOOM, cropStyles, type ImageCrop } from "@/lib/image-crop";
import { updateSetImageCrop } from "../actions";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const ZOOM_STEP = 0.1;

/**
 * Fenêtre de recadrage d'une photo : on fait glisser la photo dans le cadre 4:3 (celui du
 * catalogue) et on règle le zoom. Rien n'est découpé, seul le cadrage est enregistré.
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
  const [crop, setCrop] = useState<ImageCrop>(initial);
  const [saving, setSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const natural = useRef<{ w: number; h: number } | null>(null);
  const drag = useRef<{ px: number; py: number; start: ImageCrop } | null>(null);
  const styles = cropStyles(crop);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, start: crop };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const frame = frameRef.current?.getBoundingClientRect();
    if (!d || !frame || !natural.current) return;
    // Taille affichée de la photo (object-cover), puis zoomée : l'écart avec le cadre est
    // toute la course possible, de 0 à 100 %. Glisser vers la droite montre la gauche de la photo.
    const cover = Math.max(frame.width / natural.current.w, frame.height / natural.current.h);
    const spanX = natural.current.w * cover * d.start.zoom - frame.width;
    const spanY = natural.current.h * cover * d.start.zoom - frame.height;
    setCrop({
      ...d.start,
      x: spanX > 1 ? clamp(d.start.x - ((e.clientX - d.px) * 100) / spanX, 0, 100) : d.start.x,
      y: spanY > 1 ? clamp(d.start.y - ((e.clientY - d.py) * 100) / spanY, 0, 100) : d.start.y,
    });
  }

  const setZoom = (zoom: number) => setCrop((c) => ({ ...c, zoom: clamp(Math.round(zoom * 100) / 100, 1, MAX_CROP_ZOOM) }));

  async function save() {
    setSaving(true);
    await updateSetImageCrop(imageId, crop);
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
      onClick={onClose}
    >
      <div className="brick-card bg-paper p-5 sm:p-6 w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="crop-title" className="text-xl font-bold text-ink-deep">
          Recadrer la photo
        </h2>
        <p className="mt-1 text-sm text-slate-ink">
          Faites glisser la photo et réglez le zoom : le cadre montre exactement ce qui s&apos;affichera dans le catalogue.
        </p>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl border border-slate-ink/15 bg-sky cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="absolute inset-0" style={styles.wrapper}>
            <Image
              src={url}
              alt=""
              fill
              sizes="(min-width: 640px) 560px, 90vw"
              draggable={false}
              onLoad={(e) => (natural.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={styles.image}
              className="object-cover pointer-events-none"
            />
          </div>
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-ink-deep/70 px-2.5 py-1 text-xs font-semibold text-paper">
            <Move className="h-3.5 w-3.5" aria-hidden /> Glisser pour déplacer
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom(crop.zoom - ZOOM_STEP)}
            disabled={crop.zoom <= 1}
            aria-label="Dézoomer"
            className="p-1 shrink-0 text-ink-deep cursor-pointer transition-colors hover:text-sea-deep disabled:cursor-default disabled:opacity-30 disabled:hover:text-ink-deep"
          >
            <Minus className="h-5 w-5" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_CROP_ZOOM}
            step={0.01}
            value={crop.zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            aria-valuetext={`${Math.round(crop.zoom * 100)} %`}
            className="flex-1 accent-ink-deep"
          />
          <button
            type="button"
            onClick={() => setZoom(crop.zoom + ZOOM_STEP)}
            disabled={crop.zoom >= MAX_CROP_ZOOM}
            aria-label="Zoomer"
            className="p-1 shrink-0 text-ink-deep cursor-pointer transition-colors hover:text-sea-deep disabled:cursor-default disabled:opacity-30 disabled:hover:text-ink-deep"
          >
            <Plus className="h-5 w-5" />
          </button>
          <span className="w-12 text-right text-sm font-semibold text-ink-deep tabular-nums">{Math.round(crop.zoom * 100)} %</span>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCrop(DEFAULT_CROP)}
            className="font-bold underline underline-offset-4 cursor-pointer transition-opacity hover:opacity-70"
          >
            Réinitialiser
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="font-bold underline underline-offset-4 cursor-pointer transition-opacity hover:opacity-70"
            >
              Annuler
            </button>
            <button type="button" onClick={save} disabled={saving} className="btn btn-leaf disabled:opacity-60 disabled:cursor-wait">
              {saving ? "Enregistrement…" : "Enregistrer le cadrage"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
