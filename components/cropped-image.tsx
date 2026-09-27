import Image from "next/image";
import { cropStyles, type ImageCrop } from "@/lib/image-crop";

/**
 * Photo de set qui remplit son cadre (parent en `relative`, avec `overflow-hidden`) selon le
 * cadrage réglé dans l'espace de gestion. Sans cadrage : centrée, sans zoom, comme avant.
 */
export function CroppedImage({
  src,
  alt,
  sizes,
  crop,
  priority,
  className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  crop?: ImageCrop | null;
  priority?: boolean;
  /** Classes de l'image elle-même, ex. un effet au survol. */
  className?: string;
}) {
  const styles = cropStyles(crop);
  return (
    <div className="absolute inset-0" style={styles.wrapper}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={styles.image} className={`object-cover ${className}`} />
    </div>
  );
}
