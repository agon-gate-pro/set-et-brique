"use client";

import { useEffect } from "react";

/**
 * Remet la page en haut à l'arrivée. Next.js garde la position de défilement d'une page à
 * l'autre tant que la nouvelle page reste visible dans la fenêtre : depuis le bas du
 * catalogue, on arrivait au milieu de la fiche d'un set. `instant` pour ne pas hériter du
 * `scroll-behavior: smooth` global (défilement animé visible).
 */
export function ScrollToTop() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return null;
}
