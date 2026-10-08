/**
 * Règles des photos de sets, partagées par l'écran d'envoi (navigateur), la route qui délivre
 * l'autorisation d'envoi (`app/api/admin/photos/route.ts`) et l'enregistrement en base
 * (`registerSetImage`, `app/admin/sets/actions.ts`).
 */

/** Limite fixée avec la cliente (spécification, module 1). */
export const MAX_IMAGES_PER_SET = 10;

/** Poids maximal d'une photo, choisi le 8 octobre 2026 : couvre les photos de téléphone et la plupart des JPEG d'appareil photo. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/** Côté maximal d'une photo source pour l'optimisation d'images de Vercel ; au-delà, elle ne s'afficherait pas. */
export const MAX_IMAGE_SIDE = 8192;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Au-delà, l'envoi se fait en plusieurs morceaux, plus fiable sur une connexion moyenne. */
export const MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024;

/** Dossier des photos d'un set dans le stockage. */
export function setImagePrefix(slug: string) {
  return `sets/${slug}/`;
}

export function imageExtension(type: string) {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}
