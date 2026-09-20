"use client";

import { useEffect, useId, useState } from "react";
import { Field, inputClass } from "@/components/admin/form";

type Props = { defaultPostalCode: string; defaultCity: string };

/**
 * Code postal + ville, avec suggestion de la ville depuis l'API officielle
 * (geo.api.gouv.fr, sans clé). Remplit la ville seule quand elle est encore
 * vide et qu'un seul code correspond ; sinon propose les communes possibles
 * dans la liste native du champ, sans écraser une saisie déjà faite.
 */
export function PostalCityFields({ defaultPostalCode, defaultCity }: Props) {
  const [postalCode, setPostalCode] = useState(defaultPostalCode);
  const [city, setCity] = useState(defaultCity);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const listId = useId();
  const postalCodeValid = /^\d{5}$/.test(postalCode);

  useEffect(() => {
    if (!postalCodeValid) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom&format=json`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((communes: { nom: string }[]) => {
          const names = communes.map((c) => c.nom);
          setCityOptions(names);
          setCity((prev) => (prev.trim() === "" && names.length > 0 ? names[0] : prev));
        })
        .catch(() => {});
    }, 400);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [postalCode, postalCodeValid]);

  const visibleOptions = postalCodeValid ? cityOptions : [];

  return (
    <>
      <Field label="Code postal" required>
        <input
          name="postalCode"
          required
          inputMode="numeric"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Ville" required>
        <input
          name="city"
          required
          list={listId}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={inputClass}
        />
        <datalist id={listId}>
          {visibleOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </Field>
    </>
  );
}
