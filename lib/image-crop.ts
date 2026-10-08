import type { CSSProperties } from "react";

/**
 * Zone d'une photo choisie librement par les gérants (6 octobre 2026) : `x`, `y`, `w`, `h` en
 * fractions de la largeur et de la hauteur de la photo (0 à 1), et `aspect`, le rapport
 * largeur / hauteur de la zone telle qu'elle s'affiche — gardé ici pour ne pas avoir à connaître
 * les proportions de la photo au rendu.
 */
export type CropRect = { x: number; y: number; w: number; h: number; aspect: number };

/**
 * Cadrage d'une photo de set (voir `setImages.cropX` dans `lib/db/schema.ts`). Avec `rect`, seule
 * cette zone est affichée, entière et centrée dans le cadre, des bandes comblant le reste. Sans
 * `rect` (photos jamais recadrées, ou recadrées avant le 6 octobre 2026), la photo remplit le
 * cadre autour du point (x %, y %), agrandie de `zoom`.
 */
export type ImageCrop = { x: number; y: number; zoom: number; rect?: CropRect | null };

export const DEFAULT_CROP: ImageCrop = { x: 50, y: 50, zoom: 1 };

/** Côté minimal d'une zone, en fraction de la photo. */
export const MIN_CROP_SIZE = 0.05;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Zone reçue du client ramenée dans la photo, ou `null` si elle n'est pas exploitable. */
export function sanitizeCropRect(rect: CropRect): CropRect | null {
  if (![rect.x, rect.y, rect.w, rect.h, rect.aspect].every(Number.isFinite)) return null;
  const w = clamp(rect.w, MIN_CROP_SIZE, 1);
  const h = clamp(rect.h, MIN_CROP_SIZE, 1);
  return { x: clamp(rect.x, 0, 1 - w), y: clamp(rect.y, 0, 1 - h), w, h, aspect: clamp(rect.aspect, 0.05, 20) };
}

/**
 * Styles d'un cadrage sans zone : `object-position` aligne le point (x %, y %) de la photo sur le
 * même point du cadre, puis le conteneur est agrandi autour de ce point, qui reste donc en place.
 */
export function cropStyles(crop: ImageCrop | null | undefined): { wrapper: CSSProperties; image: CSSProperties } {
  const { x, y, zoom } = crop ?? DEFAULT_CROP;
  return {
    wrapper: { transform: zoom > 1 ? `scale(${zoom})` : undefined, transformOrigin: `${x}% ${y}%` },
    image: { objectPosition: `${x}% ${y}%` },
  };
}

/**
 * Styles d'une zone choisie : une fenêtre aux proportions de la zone, la plus grande qui tienne
 * dans le cadre (unités `cq*`, le parent doit être un conteneur `size`), et la photo agrandie et
 * décalée derrière elle pour que la zone la remplisse exactement.
 */
export function rectStyles(rect: CropRect): { window: CSSProperties; photo: CSSProperties } {
  return {
    window: {
      width: `min(100cqw, calc(100cqh * ${rect.aspect}))`,
      aspectRatio: rect.aspect,
      transform: "translate(-50%, -50%)",
    },
    photo: {
      left: `${(-rect.x / rect.w) * 100}%`,
      top: `${(-rect.y / rect.h) * 100}%`,
      width: `${100 / rect.w}%`,
      height: `${100 / rect.h}%`,
    },
  };
}

/**
 * Facteur d'agrandissement de la photo par rapport à son cadre : la photo est affichée plus grande
 * que le cadre (zone choisie, ou zoom des anciens cadrages) pour n'en montrer qu'une partie.
 */
export function cropScale(crop: ImageCrop | null | undefined): number {
  if (crop?.rect) return 1 / crop.rect.w;
  return Math.max(1, crop?.zoom ?? 1);
}

/**
 * `sizes` d'un cadre ramené à la taille réelle de la photo derrière lui : sans ça, le navigateur
 * choisit dans le `srcset` une photo à la taille du cadre, que le cadrage étire ensuite (photo
 * pixelisée, d'autant plus que la zone gardée est petite). Chaque largeur devient
 * `calc(<facteur> * <largeur>)` — facteur en tête, pour que Next.js reconnaisse encore les `vw`
 * et garde un `srcset` resserré. Une entrée qu'on ne sait pas lire est laissée telle quelle.
 */
export function scaleSizes(sizes: string, factor: number): string {
  if (!(factor > 1.01)) return sizes;
  const f = Math.round(factor * 100) / 100;
  return sizes
    .split(",")
    .map((entry) => {
      const m = entry.trim().match(/^(?:(.*\))\s+)?([\d.]+(?:px|vw))$/);
      if (!m) return entry.trim();
      return `${m[1] ? `${m[1]} ` : ""}calc(${f} * ${m[2]})`;
    })
    .join(", ");
}
