/**
 * Bloc gris des écrans de chargement (`loading.tsx`) : silhouette du contenu à venir,
 * pour montrer tout de suite que le clic a été pris en compte. Pulsation coupée si
 * l'utilisateur a demandé moins d'animations.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-xl bg-slate-200/80 motion-safe:animate-pulse ${className}`} />;
}

/** Texte lu par les lecteurs d'écran pendant le chargement. */
export function LoadingLabel({ children }: { children: string }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}
