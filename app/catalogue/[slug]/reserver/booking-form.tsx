"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton, inputClass, type ActionState } from "@/components/admin/form";
import { addDays } from "@/lib/dates";
import type { CopyInput, RangeBooking } from "@/lib/availability-core";
import { centsToInput, formatCents } from "@/lib/format";
import { DateReadable } from "./date-readable";
import { PhoneInput } from "@/components/phone-input";
import type { Customer, PickupPoint } from "@/lib/db/schema";
import { submitBookingRequest } from "./actions";
import { BookingCalendar } from "./booking-calendar";

type Props = {
  set: { id: string; slug: string; name: string; depositCents: number };
  pricePerDay: number;
  minDays: number;
  minStartDate: string;
  pickupPoints: Pick<PickupPoint, "id" | "name" | "address" | "slots">[];
  customer: Pick<
    Customer,
    "firstName" | "lastName" | "phone" | "addressLine" | "postalCode" | "city" | "preferredPickupPointId"
  > | null;
  defaults: { firstName: string; lastName: string };
  calendar: {
    copies: CopyInput[];
    bookings: RangeBooking[];
    blackouts: { startDate: string; endDate: string }[];
    turnaroundDays: number;
  };
  /** Faux pour un visiteur non connecté : le planning reste visible, la connexion n'est demandée qu'à la validation des dates. */
  authenticated: boolean;
  /** Dates choisies avant un aller-retour par la connexion, à reprendre telles quelles (voir `readPreselection` de `page.tsx`). */
  preselected: { startDate: string; days: number } | null;
};

export function BookingForm({
  set,
  pricePerDay,
  minDays,
  minStartDate,
  pickupPoints,
  customer,
  defaults,
  calendar,
  authenticated,
  preselected,
}: Props) {
  const router = useRouter();
  const [state, action] = useActionState(submitBookingRequest, null as ActionState);
  const [startDate, setStartDate] = useState<string | null>(preselected?.startDate ?? null);
  const [days, setDays] = useState<number | null>(preselected?.days ?? null);
  // La période se choisit d'abord, sur le calendrier : ouvert dès l'arrivée sur la page, sauf si
  // elle a déjà été choisie avant un aller-retour par la connexion (`preselected`).
  const [calendarOpen, setCalendarOpen] = useState(!preselected);
  const [pickupPointId, setPickupPointId] = useState(
    () => pickupPoints.find((p) => p.id === customer?.preferredPickupPointId)?.id ?? pickupPoints[0]?.id ?? "",
  );
  const point = pickupPoints.find((p) => p.id === pickupPointId);
  const slots = point?.slots ?? [];
  const [pickupTime, setPickupTime] = useState("10:00");
  // Heure ramenée au premier créneau du lieu choisi si elle ne tombe dans aucun.
  const withinASlot = slots.length === 0 || slots.some((s) => s.from <= pickupTime && pickupTime <= s.until);
  const clampedTime = withinASlot ? pickupTime : slots[0].from;
  const validDays = days != null && days >= minDays;
  const endDate = validDays && startDate && days != null ? addDays(startDate, days - 1) : null;

  return (
    <form action={action} className="grid gap-8">
      <input type="hidden" name="setId" value={set.id} />
      <input type="hidden" name="slug" value={set.slug} />
      <input type="hidden" name="startDate" value={startDate ?? ""} />
      <input type="hidden" name="days" value={days ?? ""} />

      <section className="brick-card p-6 grid gap-5 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-2xl font-semibold">Vos dates</h2>
        <div className="sm:col-span-2 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-ink/15 bg-sky p-4">
          <div>
            {startDate && endDate ? (
              <>
                <p className="text-ink-deep leading-snug">
                  Du <DateReadable iso={startDate} /> au <DateReadable iso={endDate} />
                </p>
                <p className="mt-1 text-sm text-slate-ink">
                  {days} jour{days && days > 1 ? "s" : ""} de location
                </p>
              </>
            ) : (
              <p className="font-semibold text-ink-deep">Choisissez votre période sur le calendrier</p>
            )}
          </div>
          <button type="button" onClick={() => setCalendarOpen(true)} className="btn btn-paper text-sm py-2 px-4 shrink-0">
            {startDate ? "Modifier les dates" : "Choisir mes dates"}
          </button>
        </div>
        <Field label="Lieu de remise">
          <select
            name="pickupPointId"
            required
            className={inputClass}
            value={pickupPointId}
            onChange={(e) => setPickupPointId(e.target.value)}
          >
            {pickupPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.address ? ` · ${p.address}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Heure de remise souhaitée"
          hint={
            slots.length > 0
              ? `Entre ${slots.map((s) => `${s.from} et ${s.until}`).join(", ou entre ")} à ce lieu. Nous la confirmons ou vous proposons un autre créneau`
              : "Nous la confirmons ou vous proposons un autre créneau"
          }
        >
          <input
            name="pickupTime"
            type="time"
            required
            step={900}
            value={clampedTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="rounded-xl bg-sky border border-slate-ink/15 p-4 self-end">
          <p className="text-sm text-slate-ink">Retour prévu</p>
          <p className="font-bold text-ink-deep">{endDate ? <DateReadable iso={endDate} /> : "—"}</p>
          <p className="mt-2 text-sm text-slate-ink">Location</p>
          <p className="display text-2xl font-bold text-leaf-deep">
            {validDays && days != null ? formatCents(days * pricePerDay) : "—"}
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

      {authenticated ? (
        <>
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
              <SubmitButton disabled={!validDays || !startDate}>Envoyer ma demande</SubmitButton>
            </div>
            <FormMessage state={state} />
          </section>
        </>
      ) : (
        <p className="text-sm text-slate-ink">
          Vos coordonnées et l&apos;envoi de la demande se font à l&apos;étape suivante, une fois vos dates validées.
        </p>
      )}

      {calendarOpen ? (
        <BookingCalendar
          copies={calendar.copies}
          bookings={calendar.bookings}
          blackouts={calendar.blackouts}
          turnaroundDays={calendar.turnaroundDays}
          minStartDate={minStartDate}
          minDays={minDays}
          pricePerDay={pricePerDay}
          initialStartDate={startDate}
          initialDays={days}
          onConfirm={(range) => {
            if (!authenticated) {
              const target = `/catalogue/${set.slug}/reserver?start=${range.startDate}&days=${range.days}`;
              router.push(`/connexion?redirect_url=${encodeURIComponent(target)}`);
              return;
            }
            setStartDate(range.startDate);
            setDays(range.days);
            setCalendarOpen(false);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      ) : null}
    </form>
  );
}
