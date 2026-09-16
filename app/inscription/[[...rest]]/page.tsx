import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { coordinatesUrl, safeReturnPath } from "@/lib/bookings";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

/**
 * Après l'inscription, le nouveau client arrive sur ses coordonnées (nécessaires
 * pour réserver). S'il venait d'une page précise (réservation), il y retourne ensuite.
 */
export default async function SignUpPage({ searchParams }: PageProps<"/inscription/[[...rest]]">) {
  const { redirect_url } = await searchParams;
  const afterSignUp = coordinatesUrl(safeReturnPath(redirect_url));
  return (
    <section className="studs-sky border-b border-slate-ink/10">
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 flex flex-col items-center gap-8">
        <div className="text-center max-w-md">
          <h1 className="text-3xl md:text-5xl font-bold">Créer un compte</h1>
          <p className="mt-3 text-slate-ink">
            Un compte sert à réserver un set et à suivre vos locations.
          </p>
        </div>
        <SignUp forceRedirectUrl={afterSignUp} />
      </div>
    </section>
  );
}
