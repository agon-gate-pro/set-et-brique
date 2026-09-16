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

/** Fin de location en jours calendaires : mardi + 4 jours = vendredi. */
export function endDateFor(startDate: string, days: number) {
  return addDays(startDate, days - 1);
}
