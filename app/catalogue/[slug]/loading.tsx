import { LoadingLabel, Skeleton } from "@/components/skeleton";

/** Silhouette de la fiche d'un set (mêmes colonnes que `page.tsx`) pendant la lecture de la base. */
export default function SetLoading() {
  return (
    <section className="studs-sky border-b border-slate-ink/10">
      <LoadingLabel>Chargement du set…</LoadingLabel>
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-10 md:py-14">
        <Skeleton className="h-5 w-40" />
        <div className="mt-6 grid gap-10 md:grid-cols-[1.1fr_1fr] items-start">
          <div>
            <Skeleton className="aspect-[4/3] rounded-2xl" />
            <Skeleton className="mt-8 h-7 w-32" />
            <Skeleton className="mt-4 h-4" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
          <div>
            <Skeleton className="h-7 w-28" />
            <Skeleton className="mt-4 h-11 w-3/4" />
            <Skeleton className="mt-3 h-4 w-24" />
            <div className="mt-6 brick-card p-5 space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-5" />
              ))}
            </div>
            <Skeleton className="mt-6 h-10 w-48" />
            <Skeleton className="mt-8 h-12 w-44 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
