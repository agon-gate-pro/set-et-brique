import { put } from "@vercel/blob";
import sharp from "sharp";
import { imageExtension } from "@/lib/set-images";

/**
 * Largeur maximale d'une photo de set stockée : la plus grande que Next.js demande à l'optimisation
 * d'images (`deviceSizes`, 3840 par défaut). Au-delà, les pixels ne sont jamais affichés, et un
 * original de téléphone (8064 px, 5 à 6 Mo) rend la première conversion par Vercel lente (1 à 2 s).
 */
export const MAX_STORED_WIDTH = 3840;

/** Qualité de réencodage, au-dessus des 90 de l'affichage (`PHOTO_QUALITY`) : pas de perte visible. */
const STORED_QUALITY = 92;

/**
 * Ramène à `MAX_STORED_WIDTH` une photo déjà stockée sur Vercel Blob, dans le même format : rotation
 * du téléphone appliquée, profil couleur gardé, autres métadonnées (dont la position GPS) retirées.
 * Renvoie l'adresse de la nouvelle photo, ou `null` si elle n'est pas plus large que la limite.
 * L'originale n'est pas supprimée : à l'appelant de le faire une fois la base à jour.
 */
export async function shrinkStoredImage(url: string, pathname: string, contentType: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Photo illisible (${res.status})`);
  const input = Buffer.from(await res.arrayBuffer());

  const meta = await sharp(input).metadata();
  if (meta.autoOrient.width <= MAX_STORED_WIDTH) return null;

  const resized = sharp(input).autoOrient().resize({ width: MAX_STORED_WIDTH }).keepIccProfile();
  const output = await (contentType === "image/png"
    ? resized.png({ compressionLevel: 9 })
    : contentType === "image/webp"
      ? resized.webp({ quality: STORED_QUALITY })
      : resized.jpeg({ quality: STORED_QUALITY, mozjpeg: true })
  ).toBuffer();

  const target = pathname.replace(/[^/]*$/, `${Date.now()}.${imageExtension(contentType)}`);
  const blob = await put(target, output, { access: "public", contentType, addRandomSuffix: true });
  return blob.url;
}
