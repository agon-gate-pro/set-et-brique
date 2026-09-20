import { z } from "zod";
import { formatPhone } from "@/lib/format";

/** Euros saisis en texte ("12,50") vers centimes entiers. */
export const eurosToCents = z
  .string()
  .trim()
  .transform((s, ctx) => {
    const n = Number(s.replace(",", "."));
    if (s === "" || Number.isNaN(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Montant invalide" });
      return z.NEVER;
    }
    return Math.round(n * 100);
  });

const optionalText = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable();

const optionalInt = z
  .string()
  .trim()
  .transform((s, ctx) => {
    if (s === "") return null;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Nombre entier attendu" });
      return z.NEVER;
    }
    return n;
  });

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

export const ratePlanSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire"),
  priceEuros: eurosToCents,
});

/** « 75192, 75193 » ou une référence par ligne vers une liste sans doublon. */
const setNumberList = z
  .string()
  .trim()
  .transform((s) =>
    Array.from(
      new Set(
        s
          .split(/[\s,;\/]+/)
          .map((n) => n.trim())
          .filter(Boolean),
      ),
    ),
  );

export const setSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire"),
  brand: z
    .string()
    .trim()
    .transform((s) => s || "LEGO"),
  setNumbers: setNumberList,
  theme: optionalText,
  description: optionalText,
  publicNote: optionalText,
  pieces: optionalInt,
  minifigCount: optionalInt,
  instructionCount: optionalInt,
  instructionType: z.enum(["paper", "digital"]),
  dimensions: optionalText,
  buildTime: optionalText,
  ageMin: optionalInt,
  weightGrams: optionalInt,
  depositEuros: eurosToCents,
  turnaroundDays: optionalInt,
  ratePlanId: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : s))
    .nullable(),
  status: z.enum(["draft", "published", "archived"]),
  featured: checkbox,
});

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue (aaaa-mm-jj)");

const optionalIsoDate = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable()
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date attendue (aaaa-mm-jj)");

const clockTime = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure attendue (hh:mm)");
const optionalClockTime = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable()
  .refine((v) => v === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Heure attendue (hh:mm)");

export const pickupPointSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom est obligatoire"),
    address: optionalText,
    instructions: optionalText,
    openFrom: optionalClockTime,
    openUntil: optionalClockTime,
    active: checkbox,
  })
  .refine((p) => (p.openFrom === null) === (p.openUntil === null), {
    message: "Renseignez les deux heures de la plage, ou aucune",
    path: ["openUntil"],
  })
  .refine((p) => p.openFrom === null || p.openUntil === null || p.openFrom < p.openUntil, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ["openUntil"],
  });

export const blackoutSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    reason: optionalText,
  })
  .refine((d) => d.endDate >= d.startDate, {
    path: ["endDate"],
    message: "La fin doit être après le début",
  });

const positiveInt = (label: string) =>
  z
    .string()
    .trim()
    .transform((s, ctx) => {
      const n = Number(s);
      if (!Number.isInteger(n) || n < 1) {
        ctx.addIssue({ code: "custom", message: `${label} : nombre entier attendu` });
        return z.NEVER;
      }
      return n;
    });

const required = (label: string) => z.string().trim().min(1, `${label} : obligatoire`);

/** Demande de réservation faite par le client (spécification, modules 3, 5 et 7). */
/** Coordonnées du client, nécessaires au contrat et à la facture. */
const customerFields = {
  firstName: required("Prénom"),
  lastName: required("Nom"),
  phone: required("Téléphone").transform(formatPhone),
  addressLine: required("Adresse"),
  postalCode: required("Code postal"),
  city: required("Ville"),
};

/** Onglet « Coordonnées » de la gestion du compte. */
export const customerProfileSchema = z.object({
  ...customerFields,
  preferredPickupPointId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
});

export const bookingRequestSchema = z.object({
  startDate: isoDate,
  days: positiveInt("Nombre de jours"),
  pickupTime: clockTime,
  pickupPointId: required("Lieu de remise"),
  customerNote: optionalText,
  ...customerFields,
  terms: z
    .string()
    .optional()
    .refine((v) => v === "on", "Vous devez accepter les conditions générales"),
});

/** Modification de la remise par les gérants : lieu et heure seulement, les jours sont ceux du client. */
export const handoverSchema = z.object({
  pickupPointId: required("Lieu de remise"),
  pickupTime: clockTime,
});

export const refuseBookingSchema = z.object({
  reason: optionalText,
});

/** Remise en main propre constatée par les gérants. */
export const pickupSchema = z.object({
  date: isoDate,
  note: optionalText,
});

/** Retour du set, avec l'état des lieux en commentaire libre (module 9). */
export const returnSchema = z.object({
  date: isoDate,
  returnNote: optionalText,
});

const giftVoucherQuantity = z
  .string()
  .trim()
  .transform((s, ctx) => {
    const n = s === "" ? 1 : Number(s);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      ctx.addIssue({ code: "custom", message: "Quantité invalide (entre 1 et 200)" });
      return z.NEVER;
    }
    return n;
  });

export const giftVoucherCreateSchema = z.object({
  amountEuros: eurosToCents.refine((n) => n > 0, "Le montant doit être supérieur à 0"),
  quantity: giftVoucherQuantity,
  batchLabel: optionalText,
  note: optionalText,
});

export const copySchema = z.object({
  label: z.string().trim().min(1, "Le libellé est obligatoire"),
  condition: z.enum(["new", "very_good", "good", "worn"]),
  status: z.enum(["available", "maintenance", "retired"]),
  stockEntryDate: optionalIsoDate,
  note: optionalText,
});

export function formToObject(formData: FormData) {
  const obj: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") obj[k] = v;
  }
  return obj;
}

/** Premier message d'erreur lisible d'une validation zod. */
export function firstError(error: z.ZodError) {
  const issue = error.issues[0];
  return issue ? `${issue.path.join(".") || "champ"} : ${issue.message}` : "Saisie invalide";
}
