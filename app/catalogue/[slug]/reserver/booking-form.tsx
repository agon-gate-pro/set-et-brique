"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton, inputClass, type ActionState } from "@/components/admin/form";
import { addDays } from "@/lib/dates";
import { centsToInput, formatCents, formatDate } from "@/lib/format";
import type { Customer, PickupPoint } from "@/lib/db/schema";
import { submitBookingRequest } from "./actions";

type Props = {
  set: { id: string; slug: string; name: string; depositCents: number };
  pricePerDay: number;
  minDays: number;
  minStartDate: string;
  pickupPoints: Pick<PickupPoint, "id" | "name" | "address">[];
  customer: Pick<Customer, "firstName" | "lastName" | "phone" | "addressLine" | "postalCode" | "city"> | null;
  defaults: { firstName: string; lastName: string };
};

export function BookingForm({ set, pricePerDay, minDays, minStartDate, pickupPoints, customer, defaults }: Props) {
  const [state, action] = useActionState(submitBookingRequest, null as ActionState);
  const [startDate, setStartDate] = useState(minStartDate);
  const [days, setDays] = useState(Math.max(minDays, 7));
  const validDays = Number.isInteger(days) && days >= minDays;
  const endDate = validDays && startDate ? addDays(startDate, days - 1) : null;

  return (
    <form action={action} className="grid gap-8">
      <input type="hidden" name="setId" value={set.id} />
      <input type="hidden" name="slug" value={set.slug} />

      <section className="brick-card p-6 grid gap-5 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-2xl font-semibold">Vos dates</h2>
        <Field label="Date de remise" hint="L'heure exacte se convient ensuite avec nous">
          <input
            name="startDate"
            type="date"
            required
            min={minStartDate}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Nombre de jours" hint={`Durée libre, ${minDays} jour${minDays > 1 ? "s" : ""} minimum, comptée en jours calendaires`}>
          <input
            name="days"
            type="number"
            required
            min={minDays}
            value={Number.isNaN(days) ? "" : days}
            onChange={(e) => setDays(e.target.valueAsNumber)}
            className={inputClass}
          />
        </Field>
        <Field label="Lieu de remise">
          <select name="pickupPointId" required className={inputClass} defaultValue={pickupPoints[0]?.id ?? ""}>
            {pickupPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.address ? ` · ${p.address}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <div className="rounded-xl bg-sky border border-slate-ink/15 p-4 self-end">
          <p className="text-sm text-slate-ink">Retour prévu</p>
          <p className="font-bold text-ink-deep">{endDate ? formatDate(endDate) : "—"}</p>
          <p className="mt-2 text-sm text-slate-ink">Location</p>
          <p className="display text-2xl font-bold text-brick">
            {validDays ? formatCents(days * pricePerDay) : "—"}
            <span className="text-sm font-semibold text-slate-ink"> ({centsToInput(pricePerDay)} € × {validDays ? days : "…"} jours)</span>
          </p>
          <p className="mt-1 text-sm text-slate-ink">Caution {formatCents(set.depositCents)}, bloquée à la remise, jamais débitée sauf casse ou perte.</p>
        </div>
        <div className="sm:col-span-2">
          <Field label="Un message pour nous ?" hint="Facultatif : créneau souhaité, question, précision">
            <textarea name="customerNote" rows={2} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="brick-card p-6 grid gap-5 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-2xl font-semibold">Vos coordonnées</h2>
        <p className="sm:col-span-2 -mt-3 text-slate-ink">Nécessaires pour le contrat de location et la facture.</p>
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
      </section>

      <section className="grid gap-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="terms" required className="mt-1 h-5 w-5 accent-brick" />
          <span>
            J&apos;ai lu et j&apos;accepte les{" "}
            <Link href="/cgu" target="_blank" className="font-bold underline underline-offset-4">
              conditions générales de location
            </Link>
            .
          </span>
        </label>
        <p className="text-sm text-slate-ink">
          Votre demande est examinée par nos soins avant confirmation. Rien n&apos;est à payer
          maintenant : nous revenons vers vous rapidement pour convenir de l&apos;heure de remise.
        </p>
        <div>
          <SubmitButton>Envoyer ma demande</SubmitButton>
        </div>
        <FormMessage state={state} />
      </section>
    </form>
  );
}
