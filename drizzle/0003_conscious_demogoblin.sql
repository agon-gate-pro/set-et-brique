CREATE TYPE "public"."instruction_type" AS ENUM('paper', 'digital');--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "brand" text DEFAULT 'LEGO' NOT NULL;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "set_numbers" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "public_note" text;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "minifig_count" integer;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "instruction_count" integer;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "instruction_type" "instruction_type" DEFAULT 'paper' NOT NULL;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "dimensions" text;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "build_time" text;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "weight_grams" integer;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "turnaround_days" integer;--> statement-breakpoint
-- Reprise de l'ancien numéro unique dans la liste (aucune ligne attendue, par sécurité).
UPDATE "sets" SET "set_numbers" = ARRAY["set_number"] WHERE "set_number" IS NOT NULL AND "set_number" <> '';--> statement-breakpoint
ALTER TABLE "sets" DROP COLUMN "set_number";--> statement-breakpoint
-- Battement par défaut : 4 jours (spécification, module 1). Ne touche pas une valeur déjà modifiée par les gérants.
UPDATE "site_settings" SET "value" = '4'::jsonb WHERE "key" = 'turnaround_days' AND "value" = '1'::jsonb;