import Image from "next/image";
import { cropScale, cropStyles, rectStyles, scaleSizes, type ImageCrop } from "@/lib/image-crop";

/** Qualité des photos de sets ; doit figurer dans `images.qualities` de `next.config.ts`, sinon Next la ramène à 75. */
const PHOTO_QUALITY = 90;

/**
 * Photo de set posée dans son cadre (parent en `relative`, avec `overflow-hidden`) selon le
 * cadrage réglé dans l'espace de gestion : la zone choisie, entière et centrée, le fond du cadre
 * faisant les bandes. Sans cadrage : la photo remplit le cadre, centrée, sans zoom.
 * `sizes` décrit le cadre ; il est agrandi ici du facteur du cadrage (voir `scaleSizes`).
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
  const photoSizes = scaleSizes(sizes, cropScale(crop));
  if (crop?.rect) {
    const styles = rectStyles(crop.rect);
    return (
      <div className="absolute inset-0" style={{ containerType: "size" }}>
        <div className="absolute left-1/2 top-1/2 overflow-hidden" style={styles.window}>
          <div className="absolute" style={styles.photo}>
            <Image src={src} alt={alt} fill sizes={photoSizes} priority={priority} quality={PHOTO_QUALITY}className={className} />
          </div>
        </div>
      </div>
    );
  }
  const styles = cropStyles(crop);
  return (
    <div className="absolute inset-0" style={styles.wrapper}>
      <Image src={src} alt={alt} fill sizes={photoSizes} priority={priority} quality={PHOTO_QUALITY}style={styles.image} className={`object-cover ${className}`} />
    </div>
  );
}
