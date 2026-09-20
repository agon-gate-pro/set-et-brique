"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function snapshot(form: HTMLFormElement) {
  const data = new FormData(form);
  const parts: string[] = [];
  data.forEach((value, key) => parts.push(`${key}=${typeof value === "string" ? value : value.name}`));
  return parts.join("&");
}

/**
 * Un bouton « Enregistrer » ne redevient actif que si le formulaire diffère de
 * son état initial. `markClean` est à appeler quand l'enregistrement a réussi,
 * pour reprendre l'état courant comme nouvelle référence.
 */
export function useFormDirty() {
  const ref = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const initial = useRef("");

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    initial.current = snapshot(form);
    const handleChange = () => setDirty(snapshot(form) !== initial.current);
    form.addEventListener("input", handleChange);
    form.addEventListener("change", handleChange);
    return () => {
      form.removeEventListener("input", handleChange);
      form.removeEventListener("change", handleChange);
    };
  }, []);

  const markClean = useCallback(() => {
    if (ref.current) initial.current = snapshot(ref.current);
    setDirty(false);
  }, []);

  return { ref, dirty, markClean };
}
