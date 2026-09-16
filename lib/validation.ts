import { z } from "zod";

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

export const pickupPointSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire"),
  address: optionalText,
  instructions: optionalText,
  active: checkbox,
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
  phone: required("Téléphone"),
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
  pickupPointId: required("Lieu de remise"),
  customerNote: optionalText,
  ...customerFields,
  terms: z
    .string()
    .optional()
    .refine((v) => v === "on", "Vous devez accepter les conditions générales"),
});

/** Proposition d'une autre date par les gérants. */
export const proposeDateSchema = z.object({
  startDate: isoDate,
  days: positiveInt("Nombre de jours"),
  message: optionalText,
});

export const refuseBookingSchema = z.object({
  reason: optionalText,
});

export const copySchema = z.object({
  label: z.string().trim().min(1, "Le libellé est obligatoire"),
  condition: z.enum(["new", "very_good", "good", "worn"]),
  status: z.enum(["available", "maintenance", "retired"]),
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
