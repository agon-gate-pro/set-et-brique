import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  CalendarCheck,
  BadgeEuro,
  MapPin,
  CalendarOff,
  Gift,
  BarChart3,
  FileText,
  SlidersHorizontal,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Icône et couleur de chaque rubrique de l'espace de gestion, partagées par le menu
 * (`nav.tsx`), les titres de page (`AdminPageTitle`) et le tableau de bord : une rubrique a
 * partout le même repère. Couleurs du site public (brique, soleil, vert, bleu), le gris pour
 * les rubriques techniques.
 */
export const SECTION_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/sets": Package,
  "/admin/reservations": CalendarCheck,
  // Pas Ticket : c'est le visuel des bons cadeaux sur le site public.
  "/admin/forfaits": BadgeEuro,
  "/admin/lieux": MapPin,
  "/admin/fermetures": CalendarOff,
  "/admin/bons-cadeaux": Gift,
  "/admin/statistiques": BarChart3,
  "/admin/contenus": FileText,
  "/admin/reglages": SlidersHorizontal,
  "/admin/maintenance": Wrench,
};

export type Tone = "ink" | "sun" | "sea" | "leaf" | "brick" | "slate";

/** Pastille d'icône (fond clair, icône foncée) par couleur. */
export const TONE_BADGE: Record<Tone, string> = {
  ink: "bg-ink-deep text-paper",
  sun: "bg-sun text-ink-deep",
  sea: "bg-sea/15 text-sea-deep",
  leaf: "bg-leaf/15 text-leaf-deep",
  brick: "bg-brick/10 text-brick-deep",
  slate: "bg-slate-ink/10 text-ink-deep",
};

/** Texte d'un élément actif dans la couleur de sa rubrique (le jaune, illisible en texte, passe en bleu nuit). */
export const TONE_TEXT: Record<Tone, string> = {
  ink: "text-ink-deep",
  sun: "text-ink-deep",
  sea: "text-sea-deep",
  leaf: "text-leaf-deep",
  brick: "text-brick-deep",
  slate: "text-ink-deep",
};

export const SECTION_TONES: Record<string, Tone> = {
  "/admin": "ink",
  "/admin/sets": "sun",
  "/admin/reservations": "sea",
  "/admin/forfaits": "leaf",
  "/admin/lieux": "brick",
  "/admin/fermetures": "slate",
  "/admin/bons-cadeaux": "brick",
  "/admin/statistiques": "leaf",
  "/admin/contenus": "sea",
  "/admin/reglages": "slate",
  "/admin/maintenance": "slate",
};

/**
 * Titre de page de l'espace de gestion, précédé de l'icône colorée de sa rubrique sur téléphone
 * seulement : sur grand écran, le menu de gauche montre déjà la rubrique (icône retirée à la
 * demande d'Alexis, 8 octobre 2026).
 */
export function AdminPageTitle({
  section,
  className = "",
  children,
}: {
  /** Rubrique (lien du menu), ex. "/admin/sets", y compris pour ses sous-pages. */
  section: string;
  className?: string;
  children: ReactNode;
}) {
  const Icon = SECTION_ICONS[section];
  const tone = TONE_BADGE[SECTION_TONES[section] ?? "slate"];
  return (
    <h1 className={`flex items-center gap-3 text-3xl md:text-4xl font-bold ${className}`}>
      {Icon ? (
        <span className={`flex md:hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <span className="min-w-0 break-words">{children}</span>
    </h1>
  );
}
