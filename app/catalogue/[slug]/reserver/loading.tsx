import { LoadingLabel, Skeleton } from "@/components/skeleton";

/** Silhouette de la page de réservation pendant la lecture du planning. */
export default function BookingLoading() {
  return (
    <section className="mx-auto max-w-4xl px-5 md:px-8 py-10 md:py-14">
      <LoadingLabel>Chargement du planning…</LoadingLabel>
      <div>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-4 h-10 w-3/4" />
        <Skeleton className="mt-3 h-7 w-28" />
        <div className="mt-8 brick-card p-6 grid gap-5 sm:grid-cols-2">
          <Skeleton className="sm:col-span-2 h-7 w-32" />
          <Skeleton className="sm:col-span-2 h-20" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-36" />
        </div>
      </div>
    </section>
  );
}
