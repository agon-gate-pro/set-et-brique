"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { CroppedImage } from "@/components/cropped-image";
import type { CropRect } from "@/lib/image-crop";

type CarouselImage = {
  id: string;
  url: string;
  alt: string | null;
  cropX: number;
  cropY: number;
  cropZoom: number;
  cropRect: CropRect | null;
};

const cropOf = (img: CarouselImage) => ({ x: img.cropX, y: img.cropY, zoom: img.cropZoom, rect: img.cropRect });

export function ImageCarousel({ images, name }: { images: CarouselImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  // Photo ouverte en grand par-dessus la page.
  const [zoomed, setZoomed] = useState(false);
  const count = images.length;
  // Point de départ d'un glissement du doigt sur la photo en grand.
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const previous = () => setIndex((i) => (i - 1 + count) % count);
  const next = () => setIndex((i) => (i + 1) % count);

  // En grand : Échap ferme, les flèches du clavier changent de photo, la page derrière ne défile pas.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
      else if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + count) % count);
      else if (e.key === "ArrowRight") setIndex((i) => (i + 1) % count);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [zoomed, count]);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-paper border border-slate-ink/15">
        <div className="absolute inset-0 grid place-items-center text-slate-ink/50 font-semibold">Photo à venir</div>
      </div>
    );
  }

  const current = images[index];
  const hasMultiple = images.length > 1;

  return (
    <div className="flex gap-2 sm:gap-3">
      {hasMultiple ? (
        <div className="flex w-14 sm:w-16 md:w-20 shrink-0 flex-col gap-2 overflow-y-auto max-h-[248px] sm:max-h-[280px] md:max-h-[344px]">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Voir la photo ${i + 1}`}
              aria-current={i === index}
              className={`relative aspect-square shrink-0 overflow-hidden rounded-lg border-2 cursor-pointer transition-colors ${
                i === index ? "border-brick" : "border-transparent opacity-80 hover:border-slate-ink/30 hover:opacity-100"
              }`}
            >
              <CroppedImage src={img.url} alt={img.alt ?? `${name}, photo ${i + 1}`} sizes="80px" crop={cropOf(img)} />
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative flex-1 aspect-[4/3] rounded-2xl overflow-hidden bg-paper border border-slate-ink/15">
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Agrandir la photo"
          className="absolute inset-0 block cursor-zoom-in focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-sun"
        >
          <CroppedImage src={current.url} alt={current.alt ?? name} priority sizes="(min-width: 768px) 50vw, 90vw" crop={cropOf(current)} />
        </button>
        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={previous}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-ink/15 bg-paper/90 text-ink-deep shadow-brick-sm cursor-pointer transition-colors hover:bg-paper hover:text-brick"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-ink/15 bg-paper/90 text-ink-deep shadow-brick-sm cursor-pointer transition-colors hover:bg-paper hover:text-brick"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink-deep/70 px-2.5 py-1 text-xs font-semibold text-paper">
              {index + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>

      {zoomed ? (
        // Même cadrage que dans le catalogue, en grand ; un clic à côté ferme.
        <div
          className="fixed inset-0 z-50 bg-ink-deeper/90"
          role="dialog"
          aria-modal="true"
          aria-label={`${name}, photo en grand`}
          onClick={() => setZoomed(false)}
          // Au doigt : glisser à gauche ou à droite change de photo.
          onTouchStart={(e) => {
            swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchEnd={(e) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start || !hasMultiple) return;
            const dx = e.changedTouches[0].clientX - start.x;
            const dy = e.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
            if (dx < 0) next();
            else previous();
          }}
        >
          {/* Mobile : photo bord à bord, la place en haut et en bas reste à la croix et au compteur. */}
          <div className="absolute inset-x-0 inset-y-16 sm:inset-10" style={{ containerType: "size" }}>
            {current.cropRect ? (
              <CroppedImage src={current.url} alt={current.alt ?? name} sizes="100vw" crop={cropOf(current)} />
            ) : (
              // Sans zone choisie, le cadrage vaut pour un cadre 4:3 : le plus grand qui tienne à l'écran.
              <div
                className="absolute left-1/2 top-1/2 aspect-[4/3] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg"
                style={{ width: "min(100cqw, calc(100cqh * 4 / 3))" }}
              >
                <CroppedImage src={current.url} alt={current.alt ?? name} sizes="100vw" crop={cropOf(current)} />
              </div>
            )}
          </div>
          <button
            type="button"
            autoFocus
            onClick={() => setZoomed(false)}
            aria-label="Fermer"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-paper/90 text-ink-deep shadow-brick-sm cursor-pointer transition-colors hover:bg-paper hover:text-brick"
          >
            <X className="h-5 w-5" />
          </button>
          {hasMultiple ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  previous();
                }}
                aria-label="Photo précédente"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-paper/90 text-ink-deep shadow-brick-sm cursor-pointer transition-colors hover:bg-paper hover:text-brick"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Photo suivante"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-paper/90 text-ink-deep shadow-brick-sm cursor-pointer transition-colors hover:bg-paper hover:text-brick"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-paper/90 px-3 py-1 text-sm font-semibold text-ink-deep">
                {index + 1} / {images.length}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
