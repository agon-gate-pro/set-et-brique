"use client";

import type { ReactNode } from "react";
import { UserProfile } from "@clerk/nextjs";
import { History, MapPin } from "lucide-react";

/**
 * Enveloppe client du composant Clerk. Les onglets personnalisés doivent être
 * créés dans un composant client : Clerk les reconnaît en comparant le type
 * des éléments enfants à `UserProfile.Page`, ce qui échoue depuis le serveur.
 * Le contenu des onglets, lui, est rendu côté serveur et passé en props.
 */
export function ProfilePanel({ coordonnees, historique }: { coordonnees: ReactNode; historique: ReactNode }) {
  return (
    <UserProfile
      path="/compte/profil"
      routing="path"
      appearance={{
        // Le cadre Clerk a une hauteur fixe avec défilement interne : on le laisse
        // prendre la hauteur de son contenu et toute la largeur disponible.
        elements: {
          rootBox: { width: "100%" },
          cardBox: { width: "100%", maxWidth: "none", height: "auto", maxHeight: "none" },
          scrollBox: { height: "auto", maxHeight: "none" },
          pageScrollBox: { height: "auto", maxHeight: "none" },
        },
      }}
    >
      <UserProfile.Page label="Coordonnées" url="coordonnees" labelIcon={<MapPin className="h-4 w-4" />}>
        {coordonnees}
      </UserProfile.Page>
      <UserProfile.Page label="Historique" url="historique" labelIcon={<History className="h-4 w-4" />}>
        {historique}
      </UserProfile.Page>
    </UserProfile>
  );
}
