CREATE TYPE "public"."gift_voucher_origin" AS ENUM('purchase', 'admin');--> statement-breakpoint
CREATE TYPE "public"."gift_voucher_status" AS ENUM('valid', 'used', 'cancelled');--> statement-breakpoint
CREATE TABLE "gift_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"origin" "gift_voucher_origin" DEFAULT 'admin' NOT NULL,
	"status" "gift_voucher_status" DEFAULT 'valid' NOT NULL,
	"batch_label" text,
	"note" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "gift_vouchers_code_idx" ON "gift_vouchers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "gift_vouchers_status_idx" ON "gift_vouchers" USING btree ("status");