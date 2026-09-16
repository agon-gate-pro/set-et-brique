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

export const setSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire"),
  setNumber: optionalText,
  theme: optionalText,
  description: optionalText,
  pieces: optionalInt,
  ageMin: optionalInt,
  depositEuros: eurosToCents,
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
