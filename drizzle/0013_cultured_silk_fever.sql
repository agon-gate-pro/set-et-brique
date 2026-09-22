CREATE SEQUENCE "public"."gift_voucher_batch_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint

-- Colonne d'abord nullable : les bons déjà en base n'ont pas de numéro de lot,
-- il faut leur en attribuer un avant de rendre la colonne obligatoire.
ALTER TABLE "gift_vouchers" ADD COLUMN "batch_number" text;--> statement-breakpoint

-- Reconstitue les lots déjà en base : les bons créés ensemble par une même
-- génération (formulaire "Nouveau bon") partagent la même étiquette de lot, le
-- même montant, et sont insérés à quelques millisecondes d'écart. Regrouper
-- par minute plutôt que par timestamp exact absorbe cet écart sans risquer de
-- fusionner deux générations distinctes, plus espacées dans le temps.
WITH grouped AS (
  SELECT
    id,
    dense_rank() OVER (
      ORDER BY date_trunc('minute', created_at), coalesce(batch_label, ''), amount_cents
    ) AS batch_seq
  FROM "gift_vouchers"
)
UPDATE "gift_vouchers" gv
SET "batch_number" = 'LOT-' || lpad(grouped.batch_seq::text, 4, '0')
FROM grouped
WHERE gv.id = grouped.id;--> statement-breakpoint

-- La séquence reprend après le dernier numéro attribué en dur ci-dessus (0 si
-- la table est vide, auquel cas le premier nextval() rendra bien 1), pour que
-- la première génération suivante n'entre pas en collision.
SELECT setval(
  'gift_voucher_batch_seq',
  GREATEST(0, (
    SELECT count(DISTINCT (date_trunc('minute', created_at), coalesce(batch_label, ''), amount_cents))
    FROM "gift_vouchers"
  ))
);--> statement-breakpoint

ALTER TABLE "gift_vouchers" ALTER COLUMN "batch_number" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "gift_vouchers_batch_number_idx" ON "gift_vouchers" USING btree ("batch_number");
