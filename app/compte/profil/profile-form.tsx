"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, inputClass, type ActionState } from "@/components/admin/form";
import type { Customer, PickupPoint } from "@/lib/db/schema";
import { saveCustomerProfile } from "./actions";

type Props = {
  customer: Pick<
    Customer,
    "firstName" | "lastName" | "phone" | "addressLine" | "postalCode" | "city" | "preferredPickupPointId"
  > | null;
  defaults: { firstName: string; lastName: string };
  pickupPoints: Pick<PickupPoint, "id" | "name" | "address">[];
};

export function ProfileForm({ customer, defaults, pickupPoints }: Props) {
  const [state, action] = useActionState(saveCustomerProfile, null as ActionState);

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <p className="sm:col-span-2 text-slate-ink">
        Ces coordonnées figurent sur le contrat de location et la facture. Elles sont
        pré-remplies à chaque demande de réservation, où vous pouvez encore les corriger.
      </p>
      <Field label="Prénom">
        <input name="firstName" required defaultValue={customer?.firstName ?? defaults.firstName} className={inputClass} />
      </Field>
      <Field label="Nom">
        <input name="lastName" required defaultValue={customer?.lastName ?? defaults.lastName} className={inputClass} />
      </Field>
      <Field label="Téléphone">
        <input name="phone" type="tel" required defaultValue={customer?.phone ?? ""} className={inputClass} placeholder="06 12 34 56 78" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Adresse">
          <input name="addressLine" required defaultValue={customer?.addressLine ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Code postal">
        <input name="postalCode" required inputMode="numeric" defaultValue={customer?.postalCode ?? ""} className={inputClass} />
      </Field>
      <Field label="Ville">
        <input name="city" required defaultValue={customer?.city ?? ""} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Lieu de remise préféré" hint="Pré-sélectionné à chaque réservation, modifiable à chaque fois">
          <select name="preferredPickupPointId" className={inputClass} defaultValue={customer?.preferredPickupPointId ?? ""}>
            <option value="">Aucun, je choisis à chaque fois</option>
            {pickupPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.address ? ` · ${p.address}` : ""}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <SubmitButton>Enregistrer</SubmitButton>
      </div>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
