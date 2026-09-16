import type { Metadata } from "next";
import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Gérer mon compte", robots: { index: false } };

/**
 * Gestion du compte Clerk : e-mail, mot de passe, connexion Google, sessions,
 * suppression du compte. Les coordonnées de livraison (téléphone, adresse)
 * sont dans la fiche client et se mettent à jour dans le tunnel de réservation.
 */
export default function ProfilePage() {
  return (
    <section className="mx-auto max-w-4xl px-5 md:px-8 py-14 md:py-20 flex flex-col items-center gap-8">
      <div className="w-full">
        <Link href="/compte" className="font-semibold text-ink-deep underline underline-offset-4">
          Retour à mes locations
        </Link>
        <h1 className="mt-4 text-3xl md:text-5xl font-bold">Gérer mon compte</h1>
      </div>
      <UserProfile path="/compte/profil" routing="path" />
    </section>
  );
}
