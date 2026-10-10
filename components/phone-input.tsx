"use client";

import { useState } from "react";
import { inputClass } from "@/components/admin/form";
import { PHONE_HINT, PHONE_PATTERN, formatPhone } from "@/lib/format";

/** Ne garde que les chiffres (et un « + » en tête, pour +33), dix chiffres au plus. */
function sanitize(input: string) {
  const cleaned = input.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  const max = cleaned.startsWith("+33") ? 12 : cleaned.startsWith("0033") ? 13 : 10;
  return formatPhone(cleaned.slice(0, max));
}

/** Champ téléphone mis en forme pendant la frappe : « 06 12 34 56 78 ». Lettres et symboles refusés. */
export function PhoneInput({ name, defaultValue = "" }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(() => (defaultValue ? formatPhone(defaultValue) : ""));
  return (
    <input
      name={name}
      type="tel"
      inputMode="tel"
      required
      autoComplete="tel"
      pattern={PHONE_PATTERN}
      title={`Téléphone : ${PHONE_HINT}`}
      value={value}
      onChange={(e) => setValue(sanitize(e.target.value))}
      className={inputClass}
      placeholder="06 12 34 56 78"
    />
  );
}
