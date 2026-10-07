import { auth } from "@clerk/nextjs/server";
import { and, count, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { CUSTOMER_ACTION_STATUSES } from "@/lib/bookings";
import { HANDOVER_CHANGE_STATUSES } from "@/lib/handover";
import { expireOverduePayments } from "@/lib/payment-expiry";

/**
 * Nom du client connecté et nombre de réservations qui attendent une action de sa part (payer,
 * répondre à une date proposée, prendre note d'une modification de la remise), pour les afficher
 * dans le header sans rendre tout le site dynamique.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ firstName: null, lastName: null, pendingActions: 0 });

  const [customer] = await db
    .select({ id: schema.customers.id, firstName: schema.customers.firstName, lastName: schema.customers.lastName })
    .from(schema.customers)
    .where(eq(schema.customers.clerkUserId, userId));
  if (!customer) return NextResponse.json({ firstName: null, lastName: null, pendingActions: 0 });

  // Une échéance de paiement dépassée ne doit plus compter comme « à payer » dans la pastille.
  await expireOverduePayments();
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
        ),
      ),
    );

  return NextResponse.json({ firstName: customer.firstName, lastName: customer.lastName, pendingActions });
}
