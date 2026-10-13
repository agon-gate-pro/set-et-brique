CREATE TYPE "public"."booking_deposit_status" AS ENUM('none', 'held', 'failed', 'released', 'captured');--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_status" "booking_deposit_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_held_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_error" text;