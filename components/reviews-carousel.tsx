"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { GoogleLogo } from "./google-logo";
import type { reviews as reviewsData } from "@/lib/site";

const avatarPalette = [
  "bg-blue-50 text-blue-600",
  "bg-purple-50 text-purple-600",
  "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-600",
  "bg-red-50 text-red-600",
];

const AUTOPLAY_DELAY = 3000;
const TRANSITION = "transform 700ms cubic-bezier(0.65, 0, 0.35, 1)";

export function ReviewsCarousel({ reviews }: { reviews: typeof reviewsData }) {
  const trackRef = useRef<HTMLDivElement>(null);
  // active va de 0 à reviews.length inclus : la dernière valeur pointe vers un
  // clone du premier avis, ajouté en fin de piste pour boucler sans à-coup.
  const [active, setActive] = useState(0);
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const drag = useRef<{ startX: number; startOffset: number } | null>(null);

  const items = [...reviews, reviews[0]];
  const realIndex = active % reviews.length;

  const measure = (index: number) => {
    const track = trackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) return;
    setOffset(card.offsetLeft - track.offsetLeft);
  };

  // Recalcule le décalage à appliquer (en pixels) à chaque changement d'avis actif.
  useEffect(() => {
    measure(active);
  }, [active]);

  // Les cartes changent de largeur selon le breakpoint : on recalcule au redimensionnement.
  useEffect(() => {
    const onResize = () => measure(active);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);

  // Une fois arrivé sur le clone final, retour instantané (sans transition) au premier avis.
  useEffect(() => {
    if (active !== reviews.length) return;
    const timeout = setTimeout(() => {
      setAnimate(false);
      setActive(0);
    }, 700 + 30);
    return () => clearTimeout(timeout);
  }, [active, reviews.length]);

  // Réactive la transition juste après le saut instantané.
  useEffect(() => {
    if (animate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  // Défilement automatique toutes les 3s, en pause au survol/toucher, comme sur le site vitrine.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((prev) => prev + 1), AUTOPLAY_DELAY);
    return () => clearInterval(id);
  }, [paused]);

  function goTo(index: number) {
    setAnimate(true);
    setActive(index);
  }

  // Glisser au doigt / à la souris : suit le pointeur en direct, puis change
  // d'avis ou revient à la position actuelle selon la distance parcourue.
  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    setPaused(true);
    setAnimate(false);
    drag.current = { startX: e.clientX, startOffset: offset };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const delta = e.clientX - drag.current.startX;
    setOffset(drag.current.startOffset - delta);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const delta = e.clientX - drag.current.startX;
    drag.current = null;
    setPaused(false);
    setAnimate(true);

    const threshold = 50;
    if (delta <= -threshold && realIndex < reviews.length - 1) {
      setActive(realIndex + 1);
    } else if (delta >= threshold && realIndex > 0) {
      setActive(realIndex - 1);
    } else {
      measure(active);
    }
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="hidden md:flex justify-end gap-3 mb-6">
        <button
          type="button"
          onClick={() => goTo(Math.max(realIndex - 1, 0))}
          disabled={realIndex === 0}
          aria-label="Avis précédent"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-ink/15 bg-paper text-ink-deep shadow-brick-sm transition-colors hover:border-brick hover:text-brick disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(Math.min(realIndex + 1, reviews.length - 1))}
          disabled={realIndex === reviews.length - 1}
          aria-label="Avis suivant"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-ink/15 bg-paper text-ink-deep shadow-brick-sm transition-colors hover:border-brick hover:text-brick disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div
        className="overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={trackRef}
          className="flex items-stretch gap-6 md:gap-8"
          style={{
            transform: `translateX(-${offset}px)`,
            transition: animate ? TRANSITION : "none",
            willChange: "transform",
          }}
        >
          {items.map((r, i) => (
            <div
              key={i === reviews.length ? `${r.name}-loop` : r.name}
              className="group w-[85vw] sm:w-[420px] shrink-0 bg-paper p-8 md:p-9 rounded-[2rem] border border-slate-ink/10 shadow-brick-sm hover:shadow-brick transition-shadow flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold ${avatarPalette[i % avatarPalette.length]}`}
                  >
                    {r.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-bold text-ink-deep leading-tight">{r.name}</p>
                    <p className="text-sm text-slate-ink">{r.avisCount} avis</p>
                  </div>
                </div>
                <GoogleLogo className="h-6 w-6 shrink-0" />
              </div>

              <div className="mt-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, star) => (
                  <Star key={star} className="h-4 w-4 fill-sun-deep text-sun-deep" />
                ))}
              </div>

              <p className="mt-4 text-slate-ink leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                « {r.text} »
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-center gap-2">
        {reviews.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Aller à l'avis ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i === realIndex ? "bg-ink" : "bg-slate-ink/20 hover:bg-slate-ink/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
