-- Ajout des statuts pending_review et date_proposed.
-- ALTER TYPE ... ADD VALUE ne peut pas être utilisé dans la même transaction
-- (Postgres : « unsafe use of new value ») et Drizzle applique les migrations
-- en attente dans une seule transaction. On recrée donc le type.
ALTER TYPE "public"."booking_status" RENAME TO "booking_status_old";--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending_review', 'date_proposed', 'pending_payment', 'confirmed', 'picked_up', 'returned', 'cancelled');--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."booking_status" USING "status"::text::"public"."booking_status";--> statement-breakpoint
ALTER TABLE "booking_events" ALTER COLUMN "from_status" TYPE "public"."booking_status" USING "from_status"::text::"public"."booking_status";--> statement-breakpoint
ALTER TABLE "booking_events" ALTER COLUMN "to_status" TYPE "public"."booking_status" USING "to_status"::text::"public"."booking_status";--> statement-breakpoint
DROP TYPE "public"."booking_status_old";--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending_review';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "proposed_start_date" date;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "proposed_end_date" date;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "blocked_reason" text;
