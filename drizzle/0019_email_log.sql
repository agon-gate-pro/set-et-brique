CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"kind" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"provider_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminders_paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_log_booking_id_idx" ON "email_log" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_log_reminder_idx" ON "email_log" USING btree ("booking_id","kind") WHERE "email_log"."kind" like 'reminder_%';