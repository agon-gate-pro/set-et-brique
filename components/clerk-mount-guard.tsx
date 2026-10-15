"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

/** Délai avant de recharger ou de proposer un rechargement, en millisecondes. */
const DELAY_MS = 4000;
/** Clé de session : la page a déjà été rechargée automatiquement une fois, on ne boucle pas. */
const RELOADED_KEY = "clerk-mount-reloaded";

/**
 * Filet de sécurité autour d'un composant Clerk (`SignIn`, `SignUp`, `UserProfile`). Ces composants
 * sont dessinés dans le navigateur par le script de Clerk ; s'il tarde ou échoue (premier chargement
 * depuis `clerk.set-et-brique.com`, réseau lent), la zone reste vide sans explication. Si aucun
 * élément Clerk (`.cl-rootBox`) n'est apparu au bout de quelques secondes, la page est rechargée
 * une fois toute seule (cas constaté juste après la création d'un compte : la page arrive vide
 * tant qu'on ne recharge pas). Si ça ne suffit pas, on propose de recharger à la main ; le
 * message disparaît dès que Clerk finit par s'afficher.
 */
export function ClerkMountGuard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const mounted = () => Boolean(ref.current?.querySelector(".cl-rootBox"));
    const timer = window.setTimeout(() => {
      if (mounted()) return;
      let reloaded = true;
      try {
        reloaded = sessionStorage.getItem(RELOADED_KEY) === "1";
        if (!reloaded) sessionStorage.setItem(RELOADED_KEY, "1");
      } catch {
        // Stockage indisponible (navigation privée stricte) : on se contente du message.
      }
      if (reloaded) setStalled(true);
      else window.location.reload();
    }, DELAY_MS);
    const observer = new MutationObserver(() => {
      if (!mounted()) return;
      setStalled(false);
      try {
        sessionStorage.removeItem(RELOADED_KEY);
      } catch {
        // idem
      }
    });
    if (ref.current) observer.observe(ref.current, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {stalled ? (
        <div role="status" className="flex max-w-md flex-col items-start gap-3 rounded-xl border border-sun-deep bg-sun/30 p-4 text-ink-deep">
          <p>
            <strong className="font-bold">Le chargement prend plus de temps que prévu.</strong> Rechargez la page pour
            afficher la suite.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-paper text-sm py-2 px-4">
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Recharger la page
          </button>
        </div>
      ) : null}
      <div ref={ref} className="contents">
        {children}
      </div>
    </>
  );
}
