"use client";

import { useEffect } from "react";

/**
 * Ouvre la fenêtre d'impression du navigateur à l'arrivée sur la page (`?imprimer=1`, bouton
 * « Imprimer le bon cadeau » après l'achat), une fois le logo et la police du bon chargés.
 */
export function AutoPrint() {
  useEffect(() => {
    let cancelled = false;
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".print-area img"));
    Promise.all([
      document.fonts.ready,
      ...images.map((img) => (img.complete ? null : new Promise((resolve) => img.addEventListener("load", resolve, { once: true })))),
    ]).then(() => {
      if (!cancelled) window.print();
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
