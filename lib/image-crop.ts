import type { CSSProperties } from "react";

/** Cadrage d'une photo de set (voir `setImages.cropX` dans `lib/db/schema.ts`). */
export type ImageCrop = { x: number; y: number; zoom: number };

export const DEFAULT_CROP: ImageCrop = { x: 50, y: 50, zoom: 1 };
export const MAX_CROP_ZOOM = 3;

/**
 * Styles qui appliquent un cadrage à une image `object-cover` posée dans un cadre :
 * `object-position` aligne le point (x %, y %) de la photo sur le même point du cadre,
 * puis le conteneur est agrandi autour de ce point, qui reste donc en place.
 * Les mêmes styles servent à l'éditeur et à l'affichage : ce qu'on règle est ce qu'on voit.
 */
export function cropStyles(crop: ImageCrop | null | undefined): { wrapper: CSSProperties; image: CSSProperties } {
  const { x, y, zoom } = crop ?? DEFAULT_CROP;
  return {
    wrapper: { transform: zoom !== 1 ? `scale(${zoom})` : undefined, transformOrigin: `${x}% ${y}%` },
    image: { objectPosition: `${x}% ${y}%` },
  };
}
