import { auth } from "@clerk/nextjs/server";
import { and, count, eq, gt, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { todayIso } from "@/lib/dates";
import { db, schema } from "@/lib/db";
import { CUSTOMER_ACTION_STATUSES } from "@/lib/bookings";
import { HANDOVER_CHANGE_STATUSES } from "@/lib/handover";
import { expireOverduePayments } from "@/lib/payment-expiry";

/**
 * Nom du client connecté et nombre de réservations qui attendent une action de sa part (payer,
 * répondre à une date proposée, prendre note d'une modification de la remise), pour les afficher
 * dans le header sans rendre tout le site dynamique. Pour un gérant, aussi le nombre de
 * réservations qui attendent Set et Brique (`adminActions`).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ firstName: null, lastName: null, pendingActions: 0, adminActions: 0 });

  // Une échéance de paiement dépassée ne doit plus compter comme « à payer » ni comme « à remettre ».
  await expireOverduePayments();
  // Gérant : nombre de réservations qui attendent quelque chose de Set et Brique, pour la pastille
  // du bouton « Espace de gestion ». Un gérant peut ne pas avoir de fiche client.
  const adminActions = (await isAdmin()) ? await countAdminActions() : 0;

  const [customer] = await db
    .select({ id: schema.customers.id, firstName: schema.customers.firstName, lastName: schema.customers.lastName })
    .from(schema.customers)
    .where(eq(schema.customers.clerkUserId, userId));
  if (!customer) return NextResponse.json({ firstName: null, lastName: null, pendingActions: 0, adminActions });

  const [{ value: pendingActions }] = await db
    .select({ value: count() })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.customerId, customer.id),
        or(
          inArray(schema.bookings.status, [...CUSTOMER_ACTION_STATUSES]),
          // Modification du lieu ou de l'heure de remise pas encore vue (même règle que `hasUnseenHandoverChange`).
          and(
            inArray(schema.bookings.status, [...HANDOVER_CHANGE_STATUSES]),
            isNotNull(schema.bookings.handoverChangedAt),
            or(isNull(schema.bookings.handoverSeenAt), gt(schema.bookings.handoverChangedAt, schema.bookings.handoverSeenAt)),
          ),
          // Prolongation acceptée dont le supplément reste à régler (échéance pas encore passée).
          sql`exists (
            select 1 from booking_extensions e
            where e.booking_id = "bookings"."id" and e.status = 'pending_payment'
              and (e.payment_due_at is null or e.payment_due_at > now())
          )`,
        ),
      ),
    );

  return NextResponse.json({ firstName: customer.firstName, lastName: customer.lastName, pendingActions, adminActions });
}

/**
 * Réservations qui demandent un geste des gérants, chacune comptée une fois :
 * demande à traiter (location ou prolongation), set à remettre aujourd'hui ou en retard de remise,
 * set en retard de retour, empreinte de caution refusée alors que le set est dû.
 */
async function countAdminActions() {
  const b = schema.bookings;
  const today = todayIso();
  const [{ value }] = await db
    .select({ value: count() })
    .from(b)
    .where(
      or(
        eq(b.status, "pending_review"),
        sql`exists (select 1 from booking_extensions e where e.booking_id = "bookings"."id" and e.status = 'pending_review')`,
        and(eq(b.status, "confirmed"), lte(b.startDate, today)),
        and(eq(b.status, "picked_up"), lt(b.endDate, today)),
        and(inArray(b.status, ["confirmed", "picked_up"]), eq(b.depositStatus, "failed")),
      ),
    );
  return value;
}
