import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { site } from "@/lib/site";

// Présentation du site pour les moteurs de réponse par IA (convention llms.txt).
export const revalidate = 3600;

export async function GET() {
  const sets = await db
    .select({ slug: schema.sets.slug, name: schema.sets.name, theme: schema.sets.theme, pieces: schema.sets.pieces })
    .from(schema.sets)
    .where(eq(schema.sets.status, "published"))
    .orderBy(desc(schema.sets.featured), asc(schema.sets.sortOrder), asc(schema.sets.name));
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `Set et Brique est un commerce local de ${site.city}, tenu par une famille. Il loue à la journée de grands sets de briques de construction (LEGO, 500 à 7 500 pièces) aux familles, écoles, entreprises et structures de santé du pays de Lorient, dans un rayon d'environ ${site.radiusKm} km.`,
    "",
    "## Comment ça marche",
    "",
    "- Choisir un set dans le catalogue, puis ses dates : la disponibilité est affichée en temps réel.",
    "- Le prix est par jour calendaire et dégressif avec la durée ; une caution est bloquée sur la carte à la remise, jamais débitée sauf casse ou perte.",
    "- La demande est confirmée par Set et Brique, puis payée en ligne par carte (Stripe).",
    "- Remise et retour en main propre sur un lieu de rendez-vous autour de Lorient, à l'heure convenue.",
    "- Prolongation possible pendant la location, depuis l'espace client.",
    "- Bons cadeaux de 10, 20 ou 30 €, valables un an sur tout le catalogue.",
    "",
    "## Pages",
    "",
    `- [Accueil](${site.url}/) : le concept, les gammes, les avis clients, la presse, le contact.`,
    `- [Catalogue](${site.url}/catalogue) : tous les sets à louer, filtrables par gamme, nombre de pièces et prix.`,
    `- [Bons cadeaux](${site.url}/bons-cadeaux)`,
    `- [Qui sommes-nous](${site.url}/qui-sommes-nous)`,
    `- [Conditions générales de location](${site.url}/cgl)`,
    "",
    "## Sets à louer",
    "",
    ...sets.map(
      (s) =>
        `- [${s.name}](${site.url}/catalogue/${s.slug})${s.theme ? ` — ${s.theme}` : ""}${s.pieces ? `, ${s.pieces.toLocaleString("fr-FR")} pièces` : ""}`,
    ),
    "",
    "## Contact",
    "",
    `- Téléphone : ${site.phone}`,
    `- E-mail : ${site.email}`,
    `- Adresse : ${site.address}`,
    `- Facebook : ${site.links.facebook}`,
    `- Instagram : ${site.links.instagram}`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
