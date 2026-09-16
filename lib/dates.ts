/** Utilitaires de dates ISO (aaaa-mm-jj), sans dépendance serveur : utilisables côté navigateur. */

/** Date du jour à Paris, comparable aux colonnes `date`. */
export function todayIso() {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Nombre de jours entre deux dates ISO (positif si `to` est après `from`). */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Jours de retard d'un set encore dehors : le client doit rendre le jour J
 * (jours calendaires), le retard court à partir de J+1 (spécification, module 9).
 */
export function daysLate(endDate: string, today: string = todayIso()) {
  return Math.max(0, daysBetween(endDate, today));
}

/** Fin de location en jours calendaires : mardi + 4 jours = vendredi. */
export function endDateFor(startDate: string, days: number) {
  return addDays(startDate, days - 1);
}
