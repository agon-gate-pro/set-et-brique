"use client";

import { useState } from "react";
import { inputClass } from "@/components/admin/form";
import { formatPhone } from "@/lib/format";

/** Champ téléphone mis en forme pendant la frappe : « 06 12 34 56 78 ». */
export function PhoneInput({ name, defaultValue = "" }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(() => (defaultValue ? formatPhone(defaultValue) : ""));
  return (
    <input
      name={name}
      type="tel"
      required
      autoComplete="tel"
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
      className={inputClass}
      placeholder="06 12 34 56 78"
    />
  );
}
