"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import {
  ConfirmButton,
  Field,
  FormMessage,
  SubmitButton,
  inputClass,
} from "@/components/admin/form";
import { createGiftVouchers, cancelGiftVoucher, markGiftVoucherUsed } from "./actions";

export function GiftVoucherCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createGiftVouchers, null);
  const [amountEuros, setAmountEuros] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) {
      setOpen(false);
      setAmountEuros("");
      setQuantity("1");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-leaf">
        Créer des bons cadeaux
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="brick-card bg-paper p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-semibold">Nouveau bon cadeau</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="cursor-pointer text-xl leading-none text-slate-ink transition-colors hover:text-ink-deep"
              >
                ×
              </button>
            </div>
            <form action={action} className="mt-4 grid gap-4">
              <Field label="Montant (€)" hint="Par bon" required>
                <input
                  name="amountEuros"
                  required
                  inputMode="decimal"
                  value={amountEuros}
                  onChange={(e) => setAmountEuros(e.target.value)}
                  className={inputClass}
                  placeholder="20,00"
                />
              </Field>
              <Field label="Quantité" hint="1 = un seul bon" required>
                <input
                  name="quantity"
                  required
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Étiquette de lot" hint="Optionnel, pour retrouver les codes d'un même événement">
                <input name="batchLabel" className={inputClass} placeholder="Salon de Noël 2026" />
              </Field>
              <Field label="Note interne" hint="Optionnel, non visible du client">
                <input name="note" className={inputClass} placeholder="Avoir – retard retour réservation SB-123" />
              </Field>
              <FormMessage state={state} />
              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer font-bold underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Annuler
                </button>
                <SubmitButton variant="leaf" disabled={amountEuros.trim() === "" || quantity.trim() === ""}>
                  Générer
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Icône à droite, avec les autres actions (Imprimer…) de la ligne. */
export function GiftVoucherMarkUsedButton({ id }: { id: string }) {
  const [state, action] = useActionState(markGiftVoucherUsed, null);
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton
          variant="leaf"
          title="Marquer ce bon utilisé"
          className="!inline-flex h-9 w-9 items-center justify-center !border !border-leaf/30 !bg-leaf/10 !p-0 !text-leaf-deep !shadow-none hover:!bg-leaf/20"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Marquer ce bon utilisé</span>
        </SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}

/**
 * Bouton à part, sous le code du bon, à gauche de la ligne — pas dans la colonne
 * Actions : même logique que « Supprimer cet exemplaire » sous le formulaire
 * d'édition (`app/admin/sets/[id]/sections.tsx`), séparé des actions positives.
 */
export function GiftVoucherCancelButton({ id }: { id: string }) {
  const [state, action] = useActionState(cancelGiftVoucher, null);
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <ConfirmButton confirmLabel="Confirmer l'annulation" className="text-xs">
          Annuler ce bon
        </ConfirmButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}
