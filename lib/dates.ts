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

/** Lundi de la semaine calendaire contenant `today`. */
export function startOfWeekIso(today: string) {
  const day = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = dimanche
  return addDays(today, -((day + 6) % 7));
}

/** Premier jour du mois calendaire contenant `today`. */
export function startOfMonthIso(today: string) {
  return `${today.slice(0, 7)}-01`;
}

/** Dernier jour du mois calendaire contenant `today`. */
export function endOfMonthIso(today: string) {
  const [year, month] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** Premier jour du mois de `today` décalé de `offset` mois (négatif pour le passé). */
export function monthStartIso(today: string, offset: number) {
  const [year, month] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
}

/** Dernière seconde du jour `iso` à Paris (23:59:59, heure d'été comme d'hiver). */
export function parisEndOfDay(iso: string) {
  const asUtc = new Date(`${iso}T23:59:59Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", timeZoneName: "longOffset" })
    .formatToParts(asUtc)
    .find((p) => p.type === "timeZoneName")?.value; // « GMT+02:00 »
  const match = offset?.match(/([+-])(\d{2}):(\d{2})/);
  const minutes = match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
  return new Date(asUtc.getTime() - minutes * 60_000);
}
