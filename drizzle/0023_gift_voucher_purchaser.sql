ALTER TABLE "gift_vouchers" ADD COLUMN "purchaser_clerk_user_id" text;--> statement-breakpoint
CREATE INDEX "gift_vouchers_purchaser_idx" ON "gift_vouchers" USING btree ("purchaser_clerk_user_id");