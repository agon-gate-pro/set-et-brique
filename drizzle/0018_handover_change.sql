ALTER TABLE "bookings" ADD COLUMN "handover_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "handover_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "previous_pickup_point_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "previous_pickup_time" time;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_previous_pickup_point_id_pickup_points_id_fk" FOREIGN KEY ("previous_pickup_point_id") REFERENCES "public"."pickup_points"("id") ON DELETE set null ON UPDATE no action;