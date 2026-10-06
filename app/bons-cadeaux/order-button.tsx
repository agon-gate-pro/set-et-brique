"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { X } from "lucide-react";

type Props = {
  /** Montant du bon, en euros. */
  amount: number;
  /** Équivalent en jours au forfait par défaut, `null` si aucun forfait par défaut. */
  days: number | null;
};

/** Paramètre d'adresse qui rouvre le récapitulatif au retour de la connexion (`?commander=20`). */
const ORDER_PARAM = "commander";

const buttonClass = "btn btn-sun justify-center mt-auto w-full px-4 text-base lg:text-[1.0625rem]";

function OrderLabel() {
  // Trois colonnes étroites sur tablette : libellé court pour tenir sur une ligne.
  return (
    <>
      <span className="sm:hidden lg:inline">Commander ce bon</span>
      <span className="hidden sm:inline lg:hidden">Commander</span>
    </>
  );
}

/** Bouton seul, rendu dans la page statique le temps que `OrderButton` lise l'adresse côté navigateur. */
export function OrderButtonFallback({ amount }: Pick<Props, "amount">) {
  return (
    <button type="button" disabled aria-label={`Commander un bon cadeau de ${amount} €`} className={buttonClass}>
      <OrderLabel />
    </button>
  );
}

/**
 * « Commander ce bon » : la connexion est demandée au clic (comme « Valider ces dates » dans le
 * tunnel de réservation), puis le récapitulatif de l'achat s'ouvre, montant repris dans l'adresse
 * de retour. La page reste statique : l'état de connexion est lu côté navigateur.
 */
export function OrderButton({ amount, days }: Props) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(searchParams.get(ORDER_PARAM) === String(amount));
  const [notice, setNotice] = useState(false);

  function handleOrder() {
    if (!isSignedIn) {
      const target = `/bons-cadeaux?${ORDER_PARAM}=${amount}`;
      router.push(`/connexion?redirect_url=${encodeURIComponent(target)}`);
      return;
    }
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setNotice(false);
    // Sans ça, recharger la page rouvrirait le récapitulatif.
    window.history.replaceState(null, "", window.location.pathname);
  }

  function handlePay() {
    // Paiement en ligne (module 4) : c'est ici que partira la redirection vers la fenêtre de paiement.
    setNotice(true);
  }

  return (
    <>
      <button type="button" onClick={handleOrder} aria-label={`Commander un bon cadeau de ${amount} €`} className={buttonClass}>
        <OrderLabel />
      </button>
      {open && isSignedIn ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          <div className="brick-card bg-paper p-4 sm:p-6 max-w-sm w-full text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-ink-deep">Votre commande</h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fermer"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-ink cursor-pointer transition-colors hover:bg-sky hover:text-brick-deep"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-sky border border-slate-ink/15 p-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-bold text-ink-deep">Bon cadeau Set et Brique</p>
                <p className="font-bold text-ink-deep">{amount} €</p>
              </div>
              {days ? <p className="mt-1 text-sm text-slate-ink">Soit {days} jours de location</p> : null}
              <ul className="mt-3 space-y-1 text-sm text-slate-ink list-disc pl-5 marker:text-sun-deep">
                <li>Valable un an à partir de l&apos;achat</li>
                <li>Utilisable sur n&apos;importe quel set du catalogue</li>
                <li>Ni remboursable ni échangeable</li>
              </ul>
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-4">
              <p className="text-slate-ink">Total à payer</p>
              <p className="display text-2xl font-bold text-leaf-deep">{amount} €</p>
            </div>

            {notice ? (
              <p className="mt-3 text-sm text-slate-ink" role="status">
                Le paiement en ligne arrive très bientôt.
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-4">
              <button type="button" onClick={handleClose} className="font-bold underline underline-offset-4 cursor-pointer">
                Annuler
              </button>
              <button type="button" onClick={handlePay} className="btn btn-brick">
                Payer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
