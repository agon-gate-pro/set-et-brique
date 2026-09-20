ALTER TABLE "pickup_points" ADD COLUMN "slots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "pickup_points" SET "slots" = jsonb_build_array(jsonb_build_object('from', to_char("open_from", 'HH24:MI'), 'until', to_char("open_until", 'HH24:MI'))) WHERE "open_from" IS NOT NULL AND "open_until" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_points" DROP COLUMN "open_from";--> statement-breakpoint
ALTER TABLE "pickup_points" DROP COLUMN "open_until";
