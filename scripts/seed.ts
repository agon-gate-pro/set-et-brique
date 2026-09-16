/**
 * Amorçage de la base : contenus repris de l'ancien site et réglages par défaut.
 * Idempotent : ne réinsère pas ce qui existe déjà.
 *
 *   pnpm db:seed
 */
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { press, reviews, site } from "../lib/site";
import { settingDefaults } from "../lib/settings";

async function main() {
  const [{ count: testimonialCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.testimonials);
  if (testimonialCount === 0) {
    await db.insert(schema.testimonials).values(
      reviews.map((r, i) => ({
        author: r.name,
        text: r.text,
        source: "Google",
        sortOrder: i,
      })),
    );
    console.log(`+ ${reviews.length} avis`);
  }

  const [{ count: pressCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.pressArticles);
  if (pressCount === 0) {
    await db.insert(schema.pressArticles).values(
      press.map((p, i) => ({
        outlet: p.outlet,
        title: p.title,
        quote: p.quote,
        url: p.href,
        sortOrder: i,
      })),
    );
    console.log(`+ ${press.length} articles de presse`);
  }

  const [{ count: pickupCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.pickupPoints);
  if (pickupCount === 0) {
    // Les cinq lieux confirmés par la cliente (spécification, module 2).
    const points = [
      { name: "Aire de covoiturage de Lanester", address: "Lanester, à côté du McDonald's" },
      { name: "Aire de covoiturage de Guidel", address: "Guidel" },
      { name: "Aire de covoiturage de Kerizan", address: "Brec'h" },
      { name: "Intermarché Drive de Monistrol", address: "Lorient" },
      { name: "Aire de covoiturage de Plouay", address: "Plouay" },
    ];
    await db.insert(schema.pickupPoints).values(
      points.map((pt, i) => ({
        ...pt,
        instructions: "L'heure exacte de remise est convenue par téléphone ou email après la réservation.",
        sortOrder: i,
      })),
    );
    console.log(`+ ${points.length} lieux de remise`);
  }

  const [{ count: planCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.ratePlans)
    .where(eq(schema.ratePlans.isDefault, true));
  if (planCount === 0) {
    await db.insert(schema.ratePlans).values({
      name: "Forfait 1",
      priceCentsPerDay: 200,
      isDefault: true,
      sortOrder: 0,
    });
    console.log("+ forfait par défaut : Forfait 1, 2 € par jour");
  }

  const settings: Record<string, unknown> = {
    ...settingDefaults,
    contact_email: site.email,
    contact_phone: site.phone,
  };
  for (const [key, value] of Object.entries(settings)) {
    await db
      .insert(schema.siteSettings)
      .values({ key, value })
      .onConflictDoNothing();
  }
  console.log("+ réglages par défaut");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
