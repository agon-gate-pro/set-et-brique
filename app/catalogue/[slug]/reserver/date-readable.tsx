import { formatDay, formatWeekday, formatYear } from "@/lib/format";

/**
 * « mercredi 23 septembre 2026 », avec le jour et le mois mis en avant : dans
 * une phrase « Du ... au ... » entièrement en gras, la période se distinguait
 * mal du reste. Le jour de semaine et l'année restent en texte normal.
 */
export function DateReadable({ iso }: { iso: string }) {
  return (
    <>
      {formatWeekday(iso)} <strong className="font-bold text-ink-deep">{formatDay(iso)}</strong> {formatYear(iso)}
    </>
  );
}
