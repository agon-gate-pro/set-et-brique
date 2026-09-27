ALTER TABLE "set_images" ADD COLUMN "crop_x" real DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "set_images" ADD COLUMN "crop_y" real DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "set_images" ADD COLUMN "crop_zoom" real DEFAULT 1 NOT NULL;