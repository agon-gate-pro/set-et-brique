"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export function ReviewsCarousel({ reviews }: { reviews: typeof reviewsData }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const scrollToIndex = useCallback((i: number) => {
    const track = trackRef.current;
    const card = track?.children[i] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const cards = Array.from(track.children) as HTMLElement[];
      let closest = 0;
      let min = Infinity;
      cards.forEach((card, i) => {
        const diff = Math.abs(card.offsetLeft - track.scrollLeft);
        if (diff < min) {
          min = diff;
          closest = i;
        }
      });
      setActive(closest);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  // Défilement automatique toutes les 3s, en pause au survol/toucher, comme sur le site vitrine.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % reviews.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTOPLAY_DELAY);
    return () => clearInterval(id);
  }, [paused, reviews.length, scrollToIndex]);

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
          onClick={() => scrollToIndex(Math.max(active - 1, 0))}
          disabled={active === 0}
          aria-label="Avis précédent"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-ink/15 bg-paper text-ink-deep shadow-brick-sm transition-colors hover:border-brick hover:text-brick disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollToIndex(Math.min(active + 1, reviews.length - 1))}
          disabled={active === reviews.length - 1}
          aria-label="Avis suivant"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-ink/15 bg-paper text-ink-deep shadow-brick-sm transition-colors hover:border-brick hover:text-brick disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={trackRef}
        className="flex items-stretch gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((r, i) => (
          <div
            key={r.name}
            className="group w-[85vw] sm:w-[420px] shrink-0 snap-start bg-paper p-8 md:p-9 rounded-[2rem] border border-slate-ink/10 shadow-brick-sm hover:shadow-brick transition-shadow flex flex-col"
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

      <div className="mt-2 flex justify-center gap-2">
        {reviews.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIndex(i)}
            aria-label={`Aller à l'avis ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i === active ? "bg-ink" : "bg-slate-ink/20 hover:bg-slate-ink/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
