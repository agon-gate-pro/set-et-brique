import { formatDay, setAvailabilityLabels } from "@/lib/format";
import type { SetAvailabilityResult } from "@/lib/availability";

const styles = {
  available: "bg-sun text-ink-deep",
  rented: "bg-ink text-paper",
  turnaround: "bg-sky text-ink-deep border-slate-ink/30",
  repair: "bg-brick text-paper",
  retired: "bg-slate-200 text-slate-ink",
} as const;

/** Pastille de statut d'un set, avec la date de retour quand elle est connue. */
export function AvailabilityBadge({
  availability,
  withDate = false,
}: {
  availability: SetAvailabilityResult;
  withDate?: boolean;
}) {
  const { status, nextAvailableDate } = availability;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`text-sm font-bold px-2.5 py-1 rounded-md border border-slate-ink/15 ${styles[status]}`}>
        {setAvailabilityLabels[status]}
      </span>
      {withDate && nextAvailableDate ? (
        <span className="text-sm text-slate-ink">de retour le {formatDay(nextAvailableDate)}</span>
      ) : null}
    </span>
  );
}
