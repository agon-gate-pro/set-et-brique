import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES_PER_SET, setImagePrefix } from "@/lib/set-images";

/** Durée de validité d'une autorisation d'envoi : le temps d'envoyer une grosse photo sur une connexion lente. */
const TOKEN_VALIDITY_MS = 15 * 60 * 1000;

/**
 * Autorisation d'envoi d'une photo de set, demandée par `upload()` de `@vercel/blob/client`
 * (`ImagesSection`, `app/admin/sets/[id]/sections.tsx`) : le navigateur envoie ensuite le fichier
 * directement sur Vercel Blob, sans passer par le serveur (limite de 4,5 Mo des fonctions Vercel).
 * Les règles sont inscrites dans l'autorisation (format, poids, dossier) : Vercel refuse un fichier
 * qui ne les respecte pas. L'inscription en base se fait ensuite par `registerSetImage`.
 * Pas de `onUploadCompleted` : Vercel ne peut pas rappeler `localhost`.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const setId = clientPayload ? (JSON.parse(clientPayload) as { setId?: unknown }).setId : null;
        if (typeof setId !== "string") throw new Error("Set manquant");
        const [set] = await db.select({ slug: schema.sets.slug }).from(schema.sets).where(eq(schema.sets.id, setId));
        if (!set) throw new Error("Set introuvable");
        if (!pathname.startsWith(setImagePrefix(set.slug))) throw new Error("Dossier non autorisé");
        const [{ n }] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.setImages)
          .where(eq(schema.setImages.setId, setId));
        if (n >= MAX_IMAGES_PER_SET) throw new Error(`${MAX_IMAGES_PER_SET} photos maximum par set`);
        return {
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + TOKEN_VALIDITY_MS,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Envoi refusé" }, { status: 400 });
  }
}
