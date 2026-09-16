import type { Metadata } from "next";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { asc, desc, eq } from "drizzle-orm";
import { findCustomerByClerkId } from "@/lib/bookings";
import { db, schema } from "@/lib/db";
import { bookingStatusLabels, formatCents, formatDate } from "@/lib/format";
import { ProfileForm } from "../profile-form";
import { ProfilePanel } from "../profile-panel";

export const metadata: Metadata = { title: "Gérer mon compte", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Gestion du compte. Les onglets Compte et Sécurité sont ceux de Clerk
 * (e-mail, mot de passe, connexion Google, sessions, suppression). Les onglets
 * Coordonnées et Historique sont à nous : fiche client et réservations.
 * Voir `profile-panel.tsx` pour la raison de l'enveloppe client.
 */
export default async function ProfilePage() {
  const { userId } = await auth();
  const [user, customer, pickupPoints] = await Promise.all([
    currentUser(),
    userId ? findCustomerByClerkId(userId) : null,
    db
      .select({ id: schema.pickupPoints.id, name: schema.pickupPoints.name, address: schema.pickupPoints.address })
      .from(schema.pickupPoints)
      .where(eq(schema.pickupPoints.active, true))
      .orderBy(asc(schema.pickupPoints.sortOrder), asc(schema.pickupPoints.createdAt)),
  ]);
  const bookings = customer
    ? await db.query.bookings.findMany({
        where: eq(schema.bookings.customerId, customer.id),
        with: { set: { columns: { name: true, slug: true } }, pickupPoint: { columns: { name: true } } },
        orderBy: [desc(schema.bookings.createdAt)],
      })
    : [];

  return (
    <section className="mx-auto max-w-5xl px-5 md:px-8 py-14 md:py-20 flex flex-col items-center gap-8">
      <div className="w-full">
        <Link href="/compte" className="font-semibold text-ink-deep underline underline-offset-4">
          Retour à mes locations
        </Link>
        <h1 className="mt-4 text-3xl md:text-5xl font-bold">Gérer mon compte</h1>
      </div>
      <ProfilePanel
        coordonnees={
          <>
            <h2 className="text-2xl font-semibold">Coordonnées</h2>
            <div className="mt-6">
              <ProfileForm
                customer={customer ?? null}
                defaults={{ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" }}
                pickupPoints={pickupPoints}
              />
            </div>
          </>
        }
        historique={
          <>
            <h2 className="text-2xl font-semibold">Historique</h2>
            {bookings.length === 0 ? (
              <p className="mt-4 text-slate-ink">Aucune réservation pour l&apos;instant.</p>
            ) : (
              <ul className="mt-6 divide-y divide-slate-ink/10">
                {bookings.map((b) => (
                  <li key={b.id} className="py-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div>
                      <p className="font-bold text-ink-deep">
                        <Link href={`/catalogue/${b.set.slug}`} className="underline underline-offset-4">
                          {b.set.name}
                        </Link>
                        <span className="ml-2 text-sm font-semibold text-slate-ink">{b.reference}</span>
                      </p>
                      <p className="text-sm text-slate-ink">
                        Du {formatDate(b.startDate)} au {formatDate(b.endDate)}
                        {b.pickupPoint ? ` · ${b.pickupPoint.name}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-ink-deep">{formatCents(b.rentalCents)}</p>
                      <p className="text-sm text-slate-ink">{bookingStatusLabels[b.status]}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-sm text-slate-ink">
              Pour répondre à une proposition de date ou annuler une demande, passez par{" "}
              <Link href="/compte" className="font-semibold underline underline-offset-4">
                Mes locations
              </Link>
              .
            </p>
          </>
        }
      />
    </section>
  );
}
