ALTER TABLE "gift_vouchers" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "gift_vouchers" ADD COLUMN "purchaser_email" text;--> statement-breakpoint
CREATE UNIQUE INDEX "gift_vouchers_stripe_session_idx" ON "gift_vouchers" USING btree ("stripe_checkout_session_id");