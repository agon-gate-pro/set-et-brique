const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export function formatDate(date: Date | string) {
  return dateFormatter.format(typeof date === "string" ? new Date(date) : date);
}

export function formatCents(cents: number) {
  return euro.format(cents / 100);
}

/** Centimes vers texte de saisie ("12,50"). */
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
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
  maintenance: "En maintenance",
  retired: "Retiré",
} as const;

export const bookingStatusLabels = {
  pending_payment: "En attente de paiement",
  confirmed: "Confirmée",
  picked_up: "En cours",
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
