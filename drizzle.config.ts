import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig } from "drizzle-kit";

// Les migrations passent par la connexion directe (sans pooler),
// comme le recommande Neon. L'application, elle, utilise DATABASE_URL.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED manquante (voir .env.local)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
