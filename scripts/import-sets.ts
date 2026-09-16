/**
 * Import des sets depuis le fichier CSV rempli par la cliente.
 *
 *   pnpm db:import-sets 00/Sets_LEGO.csv            # import réel
 *   pnpm db:import-sets 00/Sets_LEGO.csv --dry-run  # affiche sans écrire
 *
 * Format attendu : la grille « Liste des sets LEGO disponibles à la location »
 * (3 lignes d'en-tête puis une ligne de titres de colonnes commençant par « Titre »).
 * Une ligne dont le titre est vide est la suite du set précédent : un set de
 * location composé de plusieurs boîtes officielles (numéros, pièces, notices et
 * figurines sont cumulés).
 *
 * Idempotent : un set dont le premier numéro de boîte existe déjà en base est ignoré.
 * Chaque set créé reçoit un exemplaire « Exemplaire 1 », comme dans l'admin.
 */
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { slugify } from "../lib/format";
import type { InstructionType } from "../lib/db/schema";

/* ---------------- Parseur CSV (RFC 4180, champs multi-lignes) ---------------- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* ---------------- Normalisation des valeurs ---------------- */

const COLUMNS = {
  name: "Titre",
  description: "Description",
  pieces: "Nombre total de pièces",
  dimensions: "Dimensions une fois construit",
  setNumbers: "Numéro du set",
  instructionCount: "Nombre de notices",
  instructionType: "Type de notice (Papier/Numérique)",
  minifigCount: "Nombre de figurines",
  buildTime: "Temps estimatif de montage",
  ageMin: "Âge conseillé",
  brand: "Marque",
  deposit: "Montant de la caution",
} as const;

function clean(s: string | undefined) {
  return (s ?? "").replace(/\s+$/g, "").replace(/^\s+/g, "");
}

function int(s: string | undefined): number | null {
  const m = clean(s).replace(/\s/g, "").match(/\d+/);
  return m ? Number(m[0]) : null;
}

function euros(s: string | undefined): number {
  const m = clean(s).replace(/\s/g, "").match(/(\d+)(?:[.,](\d{1,2}))?/);
  if (!m) return 0;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

function instructionTypeOf(s: string | undefined): InstructionType {
  return /num/i.test(clean(s)) ? "digital" : "paper";
}

function buildTimeOf(s: string | undefined): string | null {
  const n = int(s);
  return n === null ? null : `${n} h`;
}

function brandOf(s: string | undefined): string {
  const b = clean(s);
  if (!b || b.toLowerCase() === "lego") return "LEGO";
  return b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
}

function setNumbersOf(s: string | undefined): string[] {
  return clean(s)
    .split(/[+,;/\s]+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

/** Titres du CSV saisis en capitales ou avec des coquilles : forme affichée au client. */
const NAME_OVERRIDES: Record<string, string> = {
  "faucon millenium": "Faucon Millenium",
  "marteau de thor": "Marteau de Thor",
  "coupe du monde": "Coupe du Monde",
  "keith haring": "Keith Haring",
  "edwige collector harry potter": "Edwige collector Harry Potter",
  catamaran: "Catamaran",
  "chemin de traverse harry potter": "Chemin de Traverse Harry Potter",
  ninjago: "Ninjago",
  "borne pac man": "Borne Pac-Man",
  "parc d'attraction": "Parc d'attractions",
  "camera disney": "Caméra Disney",
  "les fossiles de dinosaures": "Les fossiles de dinosaures",
  "la mine de l'ouest": "La mine de l'Ouest",
  yacth: "Yacht",
  "ford mustang": "Ford Mustang",
  r2d2: "R2-D2",
  "la maison en a": "La maison en A",
  "vilage viking": "Village viking",
  "gare et train radiocommande": "Gare et train radiocommandé",
  "chateau harry potter": "Château Harry Potter",
  "echec pirate": "Échecs pirate",
  "defender technic": "Defender Technic",
  "restaurant parisien": "Restaurant parisien",
  "mario et yoshi": "Mario et Yoshi",
  "fusee saturn 5": "Fusée Saturn V",
  "bateau pirate": "Bateau pirate",
  "fontaine de trevi": "Fontaine de Trevi",
  "pyramide de gizeh": "Pyramide de Gizeh",
};

function nameOf(s: string | undefined): string {
  const raw = clean(s).replace(/\s+/g, " ");
  const key = raw.toLowerCase();
  if (NAME_OVERRIDES[key]) return NAME_OVERRIDES[key];
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Gamme LEGO déduite du premier numéro de boîte (absente du CSV, à vérifier par la cliente). */
const THEME_BY_NUMBER: Record<string, string> = {
  "75257": "Star Wars",
  "76209": "Marvel",
  "31216": "Art",
  "76391": "Harry Potter",
  "42105": "Technic",
  "75978": "Harry Potter",
  "71720": "Ninjago",
  "10323": "Icons",
  "31084": "Creator 3-en-1",
  "43230": "Disney",
  "21320": "Ideas",
  "41015": "Friends",
  "10265": "Creator Expert",
  "75308": "Star Wars",
  "21338": "Ideas",
  "21343": "Ideas",
  "60197": "City",
  "75954": "Harry Potter",
  "42110": "Technic",
  "10243": "Creator Expert",
  "71438": "Super Mario",
  "92176": "Ideas",
  "31109": "Creator 3-en-1",
  "21062": "Architecture",
  "21058": "Architecture",
};

/* ---------------- Lecture du fichier ---------------- */

type ImportedSet = {
  name: string;
  description: string | null;
  pieces: number | null;
  dimensions: string | null;
  setNumbers: string[];
  instructionCount: number | null;
  instructionType: InstructionType;
  minifigCount: number | null;
  buildTime: string | null;
  ageMin: number | null;
  brand: string;
  depositCents: number;
  theme: string | null;
};

function readSets(path: string): ImportedSet[] {
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headerIndex = rows.findIndex((r) => clean(r[0]) === COLUMNS.name);
  if (headerIndex < 0) throw new Error(`Ligne de titres « ${COLUMNS.name} » introuvable dans ${path}`);
  const header = rows[headerIndex].map(clean);
  const col = (key: keyof typeof COLUMNS) => {
    const i = header.indexOf(COLUMNS[key]);
    if (i < 0) throw new Error(`Colonne « ${COLUMNS[key]} » introuvable`);
    return i;
  };
  const c = Object.fromEntries(
    (Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]).map((k) => [k, col(k)]),
  ) as Record<keyof typeof COLUMNS, number>;

  const sets: ImportedSet[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    if (row.every((v) => clean(v) === "")) continue;
    const title = clean(row[c.name]);
    const numbers = setNumbersOf(row[c.setNumbers]);

    if (!title) {
      // Ligne de suite : boîte supplémentaire du set précédent.
      const prev = sets.at(-1);
      if (!prev) throw new Error("Ligne sans titre avant le premier set");
      prev.setNumbers.push(...numbers.filter((n) => !prev.setNumbers.includes(n)));
      const add = (a: number | null, b: number | null) => (a === null && b === null ? null : (a ?? 0) + (b ?? 0));
      prev.pieces = add(prev.pieces, int(row[c.pieces]));
      prev.instructionCount = add(prev.instructionCount, int(row[c.instructionCount]));
      prev.minifigCount = add(prev.minifigCount, int(row[c.minifigCount]));
      const dims = clean(row[c.dimensions]);
      if (dims) prev.dimensions = prev.dimensions ? `${prev.dimensions} + ${dims}` : dims;
      continue;
    }

    sets.push({
      name: nameOf(title),
      description: clean(row[c.description]) || null,
      pieces: int(row[c.pieces]),
      dimensions: clean(row[c.dimensions]).replace(/\s+/g, " ") || null,
      setNumbers: numbers,
      instructionCount: int(row[c.instructionCount]),
      instructionType: instructionTypeOf(row[c.instructionType]),
      minifigCount: int(row[c.minifigCount]),
      buildTime: buildTimeOf(row[c.buildTime]),
      ageMin: int(row[c.ageMin]),
      brand: brandOf(row[c.brand]),
      depositCents: euros(row[c.deposit]),
      theme: THEME_BY_NUMBER[numbers[0] ?? ""] ?? null,
    });
  }
  return sets;
}

/* ---------------- Écriture ---------------- */

async function uniqueSlug(base: string) {
  const root = slugify(base) || "set";
  let slug = root;
  for (let i = 2; i < 100; i++) {
    const [existing] = await db.select({ id: schema.sets.id }).from(schema.sets).where(eq(schema.sets.slug, slug));
    if (!existing) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const path = args.find((a) => !a.startsWith("--"));
  if (!path) throw new Error("Usage : pnpm db:import-sets <fichier.csv> [--dry-run]");

  const sets = readSets(path);
  console.log(`${sets.length} set(s) lus dans ${path}${dryRun ? " (simulation)" : ""}`);

  const existing = await db
    .select({ name: schema.sets.name, setNumbers: schema.sets.setNumbers })
    .from(schema.sets);
  const known = new Set(existing.flatMap((s) => s.setNumbers));

  let created = 0;
  let skipped = 0;
  for (const s of sets) {
    const first = s.setNumbers[0];
    if (first && known.has(first)) {
      console.log(`= ${s.name} (${s.setNumbers.join(" + ")}) : déjà en base, ignoré`);
      skipped++;
      continue;
    }
    console.log(
      `+ ${s.name} · ${s.brand} ${s.setNumbers.join(" + ")} · ${s.pieces ?? "?"} pièces · ` +
        `${s.instructionCount ?? "?"} notice(s) ${s.instructionType} · ${s.minifigCount ?? "?"} fig. · ` +
        `${s.buildTime ?? "?"} · ${s.ageMin ?? "?"} ans+ · caution ${s.depositCents / 100} € · ` +
        `${s.theme ?? "gamme ?"} · ${s.dimensions ?? "dimensions ?"}`,
    );
    if (dryRun) continue;

    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.sets)
        .values({
          slug: await uniqueSlug(s.name),
          name: s.name,
          brand: s.brand,
          setNumbers: s.setNumbers,
          theme: s.theme,
          description: s.description,
          pieces: s.pieces,
          minifigCount: s.minifigCount,
          instructionCount: s.instructionCount,
          instructionType: s.instructionType,
          dimensions: s.dimensions,
          buildTime: s.buildTime,
          ageMin: s.ageMin,
          depositCents: s.depositCents,
          status: "published",
          sortOrder: created,
        })
        .returning({ id: schema.sets.id });
      await tx.insert(schema.setCopies).values({ setId: row.id, label: "Exemplaire 1" });
    });
    s.setNumbers.forEach((n) => known.add(n));
    created++;
  }

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(schema.sets);
  console.log(`\n${created} créé(s), ${skipped} ignoré(s), ${total} set(s) en base.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
