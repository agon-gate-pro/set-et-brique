import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig } from "drizzle-kit";

// Les migrations passent par la connexion directe (sans pooler),
// comme le recommande Neon. L'application, elle, utilise DATABASE_URL.
const rawUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL_UNPOOLED manquante (voir .env.local)");
}
// Même normalisation que lib/db/index.ts : évite l'avertissement SSL de pg.
const url = rawUrl.replace(/sslmode=(require|prefer|verify-ca)\b/, "sslmode=verify-full");

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
