ALTER TABLE "bookings" ADD COLUMN "deposit_captured_cents" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_capture_reason" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_settled_at" timestamp with time zone;