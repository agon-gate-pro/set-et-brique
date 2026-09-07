import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

export default async function AccountPage() {
  const [user, admin] = await Promise.all([currentUser(), isAdmin()]);

  return (
    <section className="mx-auto max-w-6xl px-5 md:px-8 py-14 md:py-20">
      <h1 className="text-3xl md:text-5xl font-bold">
        Bonjour {user?.firstName ?? ""}
      </h1>
      <p className="mt-4 text-lg text-slate-ink max-w-xl">
        Vos réservations apparaîtront ici. Pour l&apos;instant, le catalogue
        et la réservation en ligne sont en cours de construction.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/catalogue" className="btn btn-brick">
          Voir le catalogue
        </Link>
        {admin ? (
          <Link href="/admin" className="btn btn-sun">
            Espace de gestion
          </Link>
        ) : null}
      </div>
    </section>
  );
}
