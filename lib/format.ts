const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

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
