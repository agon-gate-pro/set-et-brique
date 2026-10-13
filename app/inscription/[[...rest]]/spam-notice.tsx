"use client";

import { usePathname } from "next/navigation";
import { MailWarning } from "lucide-react";

/**
 * Alerte affichée à l'étape où Clerk demande le code reçu par e-mail (`/inscription/verify-email-address`) :
 * selon la messagerie du client, cet e-mail arrive parfois dans les courriers indésirables. Clerk change
 * d'étape sans recharger la page, d'où la lecture de l'adresse côté navigateur.
 */
export function SpamNotice() {
  const pathname = usePathname();
  if (!pathname.includes("verify")) return null;
  return (
    <p role="status" className="flex max-w-md items-start gap-3 rounded-xl border border-sun-deep bg-sun/30 p-4 text-ink-deep">
      <MailWarning aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <span>
        <strong className="font-bold">Vous ne voyez pas l&apos;e-mail avec votre code ?</strong> Pensez à vérifier vos courriers
        indésirables (spam) : selon votre messagerie, il peut y avoir été classé par erreur.
      </span>
    </p>
  );
}
