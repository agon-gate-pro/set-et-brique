-- Durée de location libre, 1 jour minimum (spécification, module 2).
-- Ne touche que la valeur 3 posée par l'ancien seed.
UPDATE "site_settings" SET "value" = '1'::jsonb WHERE "key" = 'min_rental_days' AND "value" = '3'::jsonb;--> statement-breakpoint
DELETE FROM "site_settings" WHERE "key" = 'max_rental_days';
