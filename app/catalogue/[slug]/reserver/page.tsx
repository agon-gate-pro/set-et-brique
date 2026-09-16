import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { AvailabilityBadge } from "@/components/catalogue/availability-badge";
import { addDays, loadAvailability, todayIso } from "@/lib/availability";
import { coordinatesUrl, findCustomerByClerkId, isCustomerComplete } from "@/lib/bookings";
import { db, schema } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = { title: "Réserver", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ReservePage({ params }: PageProps<"/catalogue/[slug]/reserver">) {
  const { slug } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/connexion?redirect_url=/catalogue/${slug}/reserver`);

  const set = await db.query.sets.findFirst({
    where: and(eq(schema.sets.slug, slug), eq(schema.sets.status, "published")),
    with: { ratePlan: true },
  });
  if (!set) notFound();

  const [user, customer, pickupPoints, defaultPlan, minDays, availability] = await Promise.all([
    currentUser(),
    findCustomerByClerkId(userId),
    db
      .select({ id: schema.pickupPoints.id, name: schema.pickupPoints.name, address: schema.pickupPoints.address })
      .from(schema.pickupPoints)
      .where(eq(schema.pickupPoints.active, true))
      .orderBy(asc(schema.pickupPoints.sortOrder), asc(schema.pickupPoints.createdAt)),
    db.query.ratePlans.findFirst({ where: eq(schema.ratePlans.isDefault, true) }),
    getSetting("min_rental_days"),
    loadAvailability([set]),
  ]);
  const pricePerDay = set.ratePlan?.priceCentsPerDay ?? defaultPlan?.priceCentsPerDay ?? null;
  const a = availability.get(set.id);

  return (
    <section className="mx-auto max-w-4xl px-5 md:px-8 py-10 md:py-14">
      <Link href={`/catalogue/${set.slug}`} className="font-bold underline underline-offset-4">
        Retour à la fiche
      </Link>
      <h1 className="mt-3 text-3xl md:text-5xl font-bold">Réserver {set.name}</h1>
      <div className="mt-3">{a ? <AvailabilityBadge availability={a} withDate /> : null}</div>

      {customer?.blocked ? (
        <p className="mt-8 brick-card p-6 bg-red-50 border-brick font-semibold text-brick-deep">
          Votre compte ne permet plus de réserver. Contactez-nous pour en discuter.
        </p>
      ) : !isCustomerComplete(customer) ? (
        <div className="mt-8 brick-card p-6 bg-sun/40">
          <h2 className="text-2xl font-semibold">Vos coordonnées d&apos;abord</h2>
          <p className="mt-3 text-slate-ink max-w-xl">
            Pour réserver, nous avons besoin de vos nom, prénom, téléphone et adresse : ils figurent sur le
            contrat de location et la facture. C&apos;est à faire une seule fois, vous reviendrez ensuite sur cette page.
          </p>
          <Link href={coordinatesUrl(`/catalogue/${set.slug}/reserver`)} className="btn btn-brick mt-5 inline-block">
            Compléter mes coordonnées
          </Link>
        </div>
      ) : pricePerDay == null || pickupPoints.length === 0 ? (
        <p className="mt-8 brick-card p-6 bg-sky">
          La réservation en ligne n&apos;est pas encore possible pour ce set. Contactez-nous.
        </p>
      ) : (
        <div className="mt-8">
          <BookingForm
            set={{ id: set.id, slug: set.slug, name: set.name, depositCents: set.depositCents }}
            pricePerDay={pricePerDay}
            minDays={minDays}
            minStartDate={addDays(todayIso(), 1)}
            pickupPoints={pickupPoints}
            customer={customer ?? null}
            defaults={{ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" }}
          />
        </div>
      )}
    </section>
  );
}
