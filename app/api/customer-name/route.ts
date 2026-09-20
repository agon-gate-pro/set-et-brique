import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

/** Nom du client connecté, pour l'afficher dans le header sans rendre tout le site dynamique. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ firstName: null, lastName: null });

  const [customer] = await db
    .select({ firstName: schema.customers.firstName, lastName: schema.customers.lastName })
    .from(schema.customers)
    .where(eq(schema.customers.clerkUserId, userId));

  return NextResponse.json({ firstName: customer?.firstName ?? null, lastName: customer?.lastName ?? null });
}
