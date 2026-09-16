const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

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
  if (/^0\d{9}$/.test(digits)) return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  return raw.replace(/\s+/g, " ");
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
  turnaround: "En battement",
  repair: "En réparation",
  retired: "Retiré",
} as const;

const dateLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

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

/** « 12 octobre » à partir d'une date ISO (aaaa-mm-jj). */
export function formatDay(iso: string) {
  return dateLong.format(new Date(`${iso}T12:00:00Z`));
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
