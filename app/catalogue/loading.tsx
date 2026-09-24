import { LoadingLabel, Skeleton } from "@/components/skeleton";

/** Silhouette du catalogue (même grille que `catalogue-browser.tsx`) pendant la lecture de la base. */
export default function CatalogueLoading() {
  return (
    <>
      <LoadingLabel>Chargement du catalogue…</LoadingLabel>
      <section className="studs-sky border-b border-slate-ink/10">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-5 md:py-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">Le catalogue</h1>
          <Skeleton className="h-4 w-64" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 md:px-8 py-6 md:py-8 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8 lg:items-start">
        <Skeleton className="mb-5 h-10 w-28 rounded-full lg:hidden" />
        <div className="hidden lg:block brick-card p-5 space-y-5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-12" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="brick-card overflow-hidden">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="p-4 space-y-2.5">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-28" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
