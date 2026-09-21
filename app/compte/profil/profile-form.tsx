"use client";

import { useActionState, useEffect, useState } from "react";
import { Field, FormMessage, SubmitButton, inputClass, type ActionState } from "@/components/admin/form";
import { PhoneInput } from "@/components/phone-input";
import type { Customer, PickupPoint } from "@/lib/db/schema";
import { useFormDirty } from "@/lib/use-form-dirty";
import { saveCustomerProfile } from "./actions";
import { PostalCityFields } from "./postal-city-fields";

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
  const { ref: formRef, dirty, markClean } = useFormDirty();

  useEffect(() => {
    if (state?.ok) window.dispatchEvent(new Event("customer-profile-updated"));
  }, [state]);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) markClean();
  }

  return (
    <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2">
      {returnTo ? <input type="hidden" name="retour" value={returnTo} /> : null}
      <p className="sm:col-span-2 text-sm text-slate-ink">
        Pour le contrat de location et la facture. Pré-remplies à chaque réservation, modifiables à ce moment-là.
        Champs marqués d&apos;un <span className="text-brick">*</span> obligatoires.
      </p>
      <Field label="Prénom" required>
        <input name="firstName" required defaultValue={customer?.firstName ?? defaults.firstName} className={inputClass} />
      </Field>
      <Field label="Nom" required>
        <input name="lastName" required defaultValue={customer?.lastName ?? defaults.lastName} className={inputClass} />
      </Field>
      <Field label="Téléphone" required>
        <PhoneInput name="phone" defaultValue={customer?.phone ?? ""} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Adresse" required>
          <input name="addressLine" required defaultValue={customer?.addressLine ?? ""} className={inputClass} />
        </Field>
      </div>
      <PostalCityFields defaultPostalCode={customer?.postalCode ?? ""} defaultCity={customer?.city ?? ""} />
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
      <div className="sm:col-span-2 flex justify-end">
        <SubmitButton variant="leaf" disabled={!dirty}>{returnTo ? "Enregistrer et reprendre ma réservation" : "Enregistrer"}</SubmitButton>
      </div>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
