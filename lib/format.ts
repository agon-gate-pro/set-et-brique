const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

/** « 12 oct. 2026 » à partir d'un timestamp complet (`Date` ou ISO avec heure). */
export function formatDateTime(date: Date | string) {
  return dateTimeFormatter.format(typeof date === "string" ? new Date(date) : date);
}

export function formatCents(cents: number) {
  return euro.format(cents / 100);
}

/** Centimes vers texte de saisie ("12,50"). */
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Numéro de téléphone lisible : « 06 12 34 56 78 ». Un numéro français saisi
 * avec +33, des points ou des espaces est ramené à cette forme ; tout autre
 * numéro est rendu tel quel, espaces réduits.
 */
export function formatPhone(input: string) {
  const raw = input.trim();
  let digits = raw.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+33")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("0033")) digits = `0${digits.slice(4)}`;
  // Numéro français, complet ou en cours de saisie : groupes de deux chiffres.
  if (/^0\d{0,9}$/.test(digits)) return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  return raw.replace(/\s+/g, " ");
}

/**
 * Temps de montage saisi en texte libre, en heures : « 28 h » → 28, « 1 h 30 » → 1,5,
 * « 120 minutes » → 2, « 8 à 10 h » → 10 (la borne haute). `null` si illisible.
 */
export function parseBuildHours(text: string | null) {
  if (!text) return null;
  const t = text.toLowerCase().replace(/(\d),(\d)/g, "$1.$2");
  const numbers = [...t.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (numbers.length === 0) return null;
  const hoursMinutes = t.match(/(\d+)\s*h(?:eures?)?\s*(\d{1,2})\b/);
  if (hoursMinutes) return Number(hoursMinutes[1]) + Number(hoursMinutes[2]) / 60;
  if (/\d\s*h\b|heure/.test(t)) return Math.max(...numbers);
  if (/min/.test(t)) return Math.max(...numbers) / 60;
  return null;
}

/**
 * Temps de montage affiché au client, toujours en heures : « 120 minutes » → « 2 h »,
 * « 1,5 h » → « 1 h 30 ». Une fourchette en heures (« 8 à 10 h ») est gardée telle quelle,
 * un texte illisible aussi.
 */
export function formatBuildTime(text: string | null) {
  if (!text?.trim()) return null;
  const hours = parseBuildHours(text);
  if (hours === null) return text.trim();
  if (/\d\s*(?:à|-)\s*\d/.test(text) && !/min/i.test(text)) return text.trim();
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (whole === 0) return `${minutes} min`;
  return minutes ? `${whole} h ${String(minutes).padStart(2, "0")}` : `${whole} h`;
}

/** Lien `tel:` sans espaces ni ponctuation. */
export function phoneHref(input: string) {
  return `tel:${input.replace(/[\s.\-()]/g, "")}`;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const setStatusLabels = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
} as const;

export const copyConditionLabels = {
  new: "Neuf",
  very_good: "Très bon état",
  good: "Bon état",
  worn: "Usé",
} as const;

export const copyStatusLabels = {
  available: "Disponible",
  maintenance: "En réparation",
  retired: "Retiré",
} as const;

/** Statuts vus par le client (spécification, module 1). */
export const setAvailabilityLabels = {
  available: "Disponible",
  rented: "En location",
  // « Battement » est le terme de gestion ; le client ne le comprend pas (décision du 24 septembre 2026).
  turnaround: "Bientôt de retour",
  repair: "En réparation",
  retired: "Retiré",
} as const;

const dateLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

const weekdayOnly = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "Europe/Paris" });

const dateFull = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

/** « lun. 12 octobre 2026 » à partir d'une date ISO (aaaa-mm-jj). */
export function formatDate(iso: string) {
  return dateFull.format(new Date(`${iso}T12:00:00Z`));
}

/** « 17/09/2026 » à partir d'une date ISO, pour les listes de gestion. */
export function formatDateShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** « 10:30 » à partir d'une heure Postgres (« 10:30:00 »). */
export function formatTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : null;
}

/** « 12 octobre » à partir d'une date ISO (aaaa-mm-jj). */
export function formatDay(iso: string) {
  return dateLong.format(new Date(`${iso}T12:00:00Z`));
}

/** « mercredi » à partir d'une date ISO (aaaa-mm-jj). */
export function formatWeekday(iso: string) {
  return weekdayOnly.format(new Date(`${iso}T12:00:00Z`));
}

/** L'année d'une date ISO (aaaa-mm-jj), en texte. */
export function formatYear(iso: string) {
  return iso.slice(0, 4);
}

export const instructionTypeLabels = {
  paper: "Papier",
  digital: "Numérique",
} as const;

/** « 75192 » ou « 71741 + 71742 » pour l'affichage. */
export function formatSetNumbers(numbers: string[]) {
  return numbers.join(" + ");
}

export const bookingStatusLabels = {
  pending_review: "Demande en attente",
  date_proposed: "Autre date proposée",
  pending_payment: "Acceptée, paiement à venir",
  confirmed: "Confirmée",
  picked_up: "En cours de location",
  returned: "Rendue",
  cancelled: "Annulée",
} as const;

/** `expired` n'est pas stocké en base : il se déduit de `status` + `expiresAt`. */
export const giftVoucherStatusLabels = {
  valid: "Valide",
  used: "Utilisé",
  cancelled: "Annulé",
  expired: "Expiré",
} as const;

export const giftVoucherOriginLabels = {
  purchase: "Acheté en ligne",
  admin: "Émis par Set et Brique",
} as const;
