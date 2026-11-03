/**
 * Réduit à 3840 px de large les photos de sets déjà en ligne, avec le même traitement qu'à l'envoi
 * (`shrinkStoredImage`, `lib/image-resize.ts`). Sans `--appliquer`, rien n'est modifié.
 *
 *   pnpm photos:reduire                                  # essai à blanc : photos à réduire, fichiers orphelins
 *   pnpm photos:reduire --set marteau-de-thor            # essai à blanc sur un seul set
 *   pnpm photos:reduire --appliquer [--set <slug>]       # réduit, met la base à jour, garde les originales
 *   pnpm photos:reduire --orphelins --appliquer          # supprime les fichiers de `sets/` qu'aucune photo n'utilise
 *
 * Les originales ne sont pas supprimées par `--appliquer` : l'accueil est en cache une heure
 * (`revalidate`, `app/page.tsx`) et ses tuiles de gammes peuvent encore pointer vers elles. Une fois
 * ce délai passé (ou après un déploiement), `--orphelins --appliquer` les supprime, avec tout autre
 * fichier de `sets/` qu'aucune photo n'utilise, envoyé il y a plus d'une heure (un envoi en cours n'est
 * pas encore inscrit en base).
 */
import { del, list } from "@vercel/blob";
import { asc, eq } from "drizzle-orm";
import sharp from "sharp";
import { db, schema } from "../lib/db";
import { MAX_STORED_WIDTH, shrinkStoredImage } from "../lib/image-resize";

const args = process.argv.slice(2);
const apply = args.includes("--appliquer");
const orphansMode = args.includes("--orphelins");
const setIndex = args.indexOf("--set");
const onlySet = setIndex >= 0 ? args[setIndex + 1] : null;
if (setIndex >= 0 && !onlySet) {
  console.error("Usage : pnpm photos:reduire [--set <slug>] [--orphelins] [--appliquer]");
  process.exit(1);
}

const mo = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} Mo`;

/** Dimensions affichées (rotation appliquée) : début du fichier d'abord, le fichier entier si l'en-tête n'y tient pas. */
async function probe(url: string) {
  const res = await fetch(url, { headers: { Range: "bytes=0-262143" } });
  if (!res.ok) throw new Error(`Photo illisible (${res.status})`);
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const total = Number(res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length") ?? 0);
  let buffer = Buffer.from(await res.arrayBuffer());
  let meta = await sharp(buffer).metadata().catch(() => null);
  if (!meta && res.status === 206) {
    buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
    meta = await sharp(buffer).metadata();
  }
  if (!meta) throw new Error("Dimensions illisibles");
  return { width: meta.autoOrient.width, height: meta.autoOrient.height, contentType, size: total || buffer.length };
}

async function reducePhotos() {
  const rows = await db
    .select({ id: schema.setImages.id, url: schema.setImages.url, slug: schema.sets.slug })
    .from(schema.setImages)
    .innerJoin(schema.sets, eq(schema.setImages.setId, schema.sets.id))
    .where(onlySet ? eq(schema.sets.slug, onlySet) : undefined)
    .orderBy(asc(schema.sets.slug), asc(schema.setImages.sortOrder));
  if (rows.length === 0) {
    console.log(onlySet ? `Aucune photo pour le set « ${onlySet} ».` : "Aucune photo en base.");
    return;
  }

  let count = 0;
  let before = 0;
  let after = 0;
  let failures = 0;
  for (const row of rows) {
    const name = `${row.slug}/${row.url.split("/").pop()}`;
    try {
      const info = await probe(row.url);
      if (info.width <= MAX_STORED_WIDTH) continue;
      count += 1;
      before += info.size;
      if (!apply) {
        console.log(`à réduire  ${name}  ${info.width} × ${info.height}  ${mo(info.size)}`);
        continue;
      }
      const pathname = new URL(row.url).pathname.slice(1);
      const newUrl = await shrinkStoredImage(row.url, pathname, info.contentType);
      if (!newUrl) continue;
      try {
        await db.update(schema.setImages).set({ url: newUrl }).where(eq(schema.setImages.id, row.id));
      } catch (e) {
        await del(newUrl).catch(() => undefined);
        throw e;
      }
      const res = await fetch(newUrl, { method: "HEAD" });
      const newSize = Number(res.headers.get("content-length") ?? 0);
      after += newSize;
      console.log(`réduite    ${name}  ${info.width} × ${info.height}  ${mo(info.size)} → ${mo(newSize)}`);
    } catch (e) {
      failures += 1;
      console.error(`ÉCHEC      ${name}  ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log("");
  console.log(`${rows.length} photo(s) examinée(s), ${count} plus large(s) que ${MAX_STORED_WIDTH} px (${mo(before)}).`);
  if (apply) {
    console.log(`Après réduction : ${mo(after)}. Originales gardées : \`pnpm photos:reduire --orphelins --appliquer\` dans une heure.`);
  } else {
    console.log("Essai à blanc : rien n'a été modifié. Ajouter --appliquer pour réduire.");
  }
  if (failures > 0) console.log(`${failures} échec(s), voir ci-dessus : ces photos sont restées telles quelles.`);
}

async function deleteOrphans() {
  const used = new Set((await db.select({ url: schema.setImages.url }).from(schema.setImages)).map((r) => r.url));
  const limit = Date.now() - 60 * 60 * 1000;
  const orphans: { url: string; pathname: string; size: number }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "sets/", cursor, limit: 1000 });
    for (const b of page.blobs) {
      if (!used.has(b.url) && new Date(b.uploadedAt).getTime() < limit) orphans.push(b);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  for (const o of orphans) console.log(`${apply ? "supprimé " : "orphelin "}  ${o.pathname}  ${mo(o.size)}`);
  if (apply && orphans.length > 0) await del(orphans.map((o) => o.url));
  console.log("");
  console.log(`${orphans.length} fichier(s) qu'aucune photo n'utilise (${mo(orphans.reduce((s, o) => s + o.size, 0))}).`);
  if (!apply && orphans.length > 0) console.log("Essai à blanc : rien n'a été supprimé. Ajouter --appliquer pour supprimer.");
}

(orphansMode ? deleteOrphans() : reducePhotos()).then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
