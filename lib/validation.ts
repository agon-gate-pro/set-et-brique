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
  featured: z
    .string()
    .optional()
    .transform((v) => v === "on"),
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
