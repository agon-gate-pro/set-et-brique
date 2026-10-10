CREATE TYPE "public"."booking_extension_status" AS ENUM('pending_review', 'pending_payment', 'paid', 'refused', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "booking_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"previous_end_date" date NOT NULL,
	"new_end_date" date NOT NULL,
	"extra_days" integer NOT NULL,
	"extra_rental_cents" integer NOT NULL,
	"status" "booking_extension_status" DEFAULT 'pending_review' NOT NULL,
	"payment_due_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_extensions" ADD CONSTRAINT "booking_extensions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_extensions_booking_id_idx" ON "booking_extensions" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_extensions_active_idx" ON "booking_extensions" USING btree ("booking_id") WHERE "booking_extensions"."status" in ('pending_review', 'pending_payment');