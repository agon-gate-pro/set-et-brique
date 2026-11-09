import { Clover, Heart } from "lucide-react";

/**
 * Pastilles de mise en avant d'un set : pilule blanche, icône pleine colorée devant le texte.
 * La couleur de l'icône est décorative (un cœur est rouge, un trèfle est vert), pas une action.
 */
const pill =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-paper/95 px-2.5 py-1 text-xs font-bold text-ink-deep shadow-brick-sm";

export function FeaturedBadge() {
  return (
    <span className={pill}>
      <Heart className="h-3.5 w-3.5 fill-brick text-brick" aria-hidden />
      Coup de cœur
    </span>
  );
}

/** Set bientôt retiré du catalogue (demande de la cliente, 9 novembre 2026). */
export function LastChanceBadge() {
  return (
    <span className={pill}>
      <Clover className="h-3.5 w-3.5 fill-leaf text-leaf-deep" aria-hidden />
      Dernière chance
    </span>
  );
}
