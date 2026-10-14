ALTER TABLE "bookings" ADD COLUMN "refund_cents" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "stripe_refund_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "refunded_voucher_code" text;