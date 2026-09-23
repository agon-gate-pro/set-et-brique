import { formatDay, setAvailabilityLabels } from "@/lib/format";
import type { SetAvailabilityResult } from "@/lib/availability";

const styles = {
  available: "bg-sun text-ink-deep",
  rented: "bg-ink text-paper",
  turnaround: "bg-sky text-ink-deep border-slate-ink/30",
  repair: "bg-brick text-paper",
  retired: "bg-slate-200 text-slate-ink",
} as const;

/**
 * Pastille de statut d'un set. Loué ou en battement, avec une date de retour
 * connue : le statut passe en petit, discret, et une seconde pastille reprend
 * le même visuel que « Disponible » (`styles.available`) avec « Disponible à
 * partir du … » — c'est elle qui donne envie de cliquer, pas le rappel qu'il
 * est pris pour l'instant, qui prenait toute la place avant (décision du 22
 * septembre 2026, revue une seconde fois le même jour : une phrase en rouge
 * essayée d'abord, jugée trop proche des messages de blocage).
 */
export function AvailabilityBadge({
  availability,
  withDate = false,
}: {
  availability: SetAvailabilityResult;
  withDate?: boolean;
}) {
  const { status, nextAvailableDate } = availability;

  if (withDate && nextAvailableDate && (status === "rented" || status === "turnaround")) {
    return (
      <span className="block">
        <span className="inline-block rounded-md bg-ink-deep/10 px-2 py-0.5 text-xs font-semibold text-ink-deep">
          {setAvailabilityLabels[status]}
        </span>
        <span
          className={`mt-2 block w-fit text-sm font-bold px-2.5 py-1 rounded-md border border-slate-ink/15 ${styles.available}`}
        >
          Disponible à partir du {formatDay(nextAvailableDate)}
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-block text-sm font-bold px-2.5 py-1 rounded-md border border-slate-ink/15 ${styles[status]}`}>
      {setAvailabilityLabels[status]}
    </span>
  );
}
