/**
 * Amorçage de la base : contenus repris de l'ancien site et réglages par défaut.
 * Idempotent : ne réinsère pas ce qui existe déjà.
 *
 *   pnpm db:seed
 */
import { isNull, sql } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { press, reviews, site } from "../lib/site";

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
    await db.insert(schema.pickupPoints).values({
      name: "Lorient, lieu convenu ensemble",
      address: "Lorient",
      instructions:
        "Le lieu et l'heure exacts sont fixés par message après la réservation, jusqu'à 30 km autour de Lorient.",
    });
    console.log("+ 1 lieu de remise");
  }

  const [{ count: tierCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.priceTiers)
    .where(isNull(schema.priceTiers.setId));
  if (tierCount === 0) {
    // Grille d'exemple, à remplacer par les vrais tarifs depuis l'admin.
    await db.insert(schema.priceTiers).values([
      { setId: null, minDays: 1, priceCentsPerDay: 500 },
      { setId: null, minDays: 7, priceCentsPerDay: 400 },
      { setId: null, minDays: 14, priceCentsPerDay: 300 },
    ]);
    console.log("+ grille tarifaire par défaut (exemple)");
  }

  const settings: Record<string, unknown> = {
    turnaround_days: 1,
    min_rental_days: 3,
    max_rental_days: 30,
    radius_km: site.radiusKm,
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
