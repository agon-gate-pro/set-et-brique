"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, inputClass, type ActionState } from "@/components/admin/form";
import { PhoneInput } from "@/components/phone-input";
import type { Customer, PickupPoint } from "@/lib/db/schema";
import { saveCustomerProfile } from "./actions";

type Props = {
  customer: Pick<
    Customer,
    "firstName" | "lastName" | "phone" | "addressLine" | "postalCode" | "city" | "preferredPickupPointId"
  > | null;
  defaults: { firstName: string; lastName: string };
  pickupPoints: Pick<PickupPoint, "id" | "name" | "address">[];
  /** Page vers laquelle revenir après l'enregistrement (réservation en cours). */
  returnTo?: string | null;
};

export function ProfileForm({ customer, defaults, pickupPoints, returnTo = null }: Props) {
  const [state, action] = useActionState(saveCustomerProfile, null as ActionState);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {returnTo ? <input type="hidden" name="retour" value={returnTo} /> : null}
      <p className="sm:col-span-2 text-sm text-slate-ink">
        Pour le contrat de location et la facture. Pré-remplies à chaque réservation, modifiables à ce moment-là.
      </p>
      <Field label="Prénom">
        <input name="firstName" required defaultValue={customer?.firstName ?? defaults.firstName} className={inputClass} />
      </Field>
      <Field label="Nom">
        <input name="lastName" required defaultValue={customer?.lastName ?? defaults.lastName} className={inputClass} />
      </Field>
      <Field label="Téléphone">
        <PhoneInput name="phone" defaultValue={customer?.phone ?? ""} />
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
        <SubmitButton>{returnTo ? "Enregistrer et reprendre ma réservation" : "Enregistrer"}</SubmitButton>
      </div>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
