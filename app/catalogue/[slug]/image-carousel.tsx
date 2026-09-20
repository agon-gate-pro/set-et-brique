"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselImage = { id: string; url: string; alt: string | null };

export function ImageCarousel({ images, name }: { images: CarouselImage[]; name: string }) {
  const [index, setIndex] = useState(0);

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
              <Image src={img.url} alt={img.alt ?? `${name}, photo ${i + 1}`} fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative flex-1 aspect-[4/3] rounded-2xl overflow-hidden bg-paper border border-slate-ink/15">
        <Image
          src={current.url}
          alt={current.alt ?? name}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 90vw"
          className="object-cover"
        />
        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-ink/15 bg-paper/90 text-ink-deep shadow-brick-sm cursor-pointer transition-colors hover:bg-paper hover:text-brick"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
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
    </div>
  );
}
