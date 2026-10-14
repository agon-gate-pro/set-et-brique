"use client";

import { useState, useTransition } from "react";
import { startDepositCard } from "./actions";

/**
 * Caution non garantie (empreinte refusée, ou aucune carte connue après un règlement hors ligne) :
 * le client enregistre une carte sur une page Stripe sans paiement, et l'empreinte est reposée au
 * retour si elle est due. Voir `createDepositCardCheckout` (`lib/payments.ts`).
 */
export function DepositCardButton({ bookingId, label }: { bookingId: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await startDepositCard(bookingId);
            if ("url" in result) window.location.assign(result.url);
            else setError("error" in result ? result.error : "Rien à faire.");
          })
        }
        className="btn-brick"
      >
        {pending ? "Un instant…" : label}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-brick-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}
