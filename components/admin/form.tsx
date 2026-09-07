"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionState = { error?: string; ok?: string } | null;

export function SubmitButton({
  children,
  variant = "brick",
  className = "",
}: {
  children: ReactNode;
  variant?: "brick" | "sun" | "paper";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn btn-${variant} disabled:opacity-60 disabled:cursor-wait ${className}`}
    >
      {pending ? "Enregistrement…" : children}
    </button>
  );
}

/** Bouton de suppression en deux temps, sans boîte de dialogue navigateur. */
export function ConfirmButton({
  children,
  confirmLabel = "Confirmer la suppression",
  className = "",
}: {
  children: ReactNode;
  confirmLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={`font-bold text-brick-deep underline underline-offset-4 ${className}`}
      >
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-brick text-sm py-2 px-3"
      >
        {pending ? "Suppression…" : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="font-bold underline underline-offset-4"
      >
        Annuler
      </button>
    </span>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p
      role="status"
      className={`mt-4 border-[3px] px-4 py-3 font-semibold ${
        state.error
          ? "border-brick bg-red-50 text-brick-deep"
          : "border-ink bg-sky text-ink-deep"
      }`}
    >
      {state.error ?? state.ok}
    </p>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block font-bold text-ink-deep">{label}</span>
      {hint ? <span className="block text-sm text-slate-ink">{hint}</span> : null}
      <span className="block mt-1">{children}</span>
    </label>
  );
}

export const inputClass =
  "w-full border-[3px] border-ink bg-paper px-3 py-2 text-ink-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-sun";
