ALTER TABLE "bookings" ADD COLUMN "stripe_payment_method_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "stripe_customer_id" text;