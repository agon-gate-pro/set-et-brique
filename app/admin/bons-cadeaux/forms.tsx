"use client";

import { useActionState } from "react";
import {
  ConfirmButton,
  Field,
  FormMessage,
  SubmitButton,
  inputClass,
} from "@/components/admin/form";
import { createGiftVouchers, cancelGiftVoucher, markGiftVoucherUsed } from "./actions";

export function GiftVoucherCreateForm() {
  const [state, action] = useActionState(createGiftVouchers, null);
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[10rem_8rem_1fr_auto]">
      <Field label="Montant (€)" hint="Par bon">
        <input name="amountEuros" required inputMode="decimal" className={inputClass} placeholder="20,00" />
      </Field>
      <Field label="Quantité" hint="1 = un seul bon">
        <input name="quantity" defaultValue="1" required inputMode="numeric" className={inputClass} />
      </Field>
      <Field label="Étiquette de lot" hint="Optionnel, pour retrouver les codes d'un même événement">
        <input name="batchLabel" className={inputClass} placeholder="Salon de Noël 2026" />
      </Field>
      <div className="self-end">
        <SubmitButton>Générer</SubmitButton>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Field label="Note interne" hint="Optionnel, non visible du client">
          <input name="note" className={inputClass} placeholder="Avoir – retard retour réservation SB-123" />
        </Field>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function GiftVoucherActions({
  id,
  canMarkUsed,
  canCancel,
}: {
  id: string;
  canMarkUsed: boolean;
  canCancel: boolean;
}) {
  const [usedState, usedAction] = useActionState(markGiftVoucherUsed, null);
  const [cancelState, cancelAction] = useActionState(cancelGiftVoucher, null);

  if (!canMarkUsed && !canCancel) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-4">
      {canMarkUsed ? (
        <form action={usedAction}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton variant="paper">Marquer utilisé</SubmitButton>
        </form>
      ) : null}
      {canCancel ? (
        <form action={cancelAction}>
          <input type="hidden" name="id" value={id} />
          <ConfirmButton confirmLabel="Confirmer l'annulation">Annuler ce bon</ConfirmButton>
        </form>
      ) : null}
      <FormMessage state={usedState ?? cancelState} />
    </div>
  );
}
