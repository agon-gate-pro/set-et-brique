"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionState = { error?: string; ok?: string } | null;

export function SubmitButton({
  children,
  variant = "brick",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  variant?: "brick" | "sun" | "leaf" | "sea" | "paper";
  className?: string;
  /** Désactivé en plus de l'état d'envoi, ex. tant qu'un champ obligatoire géré à part n'est pas rempli. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`btn btn-${variant} disabled:opacity-60 disabled:cursor-wait ${className}`}
    >
      {pending ? "Enregistrement…" : children}
    </button>
  );
}

/** Bouton de suppression en deux temps, sans boîte de dialogue navigateur : le bouton se transforme sur place. */
export function ConfirmButton({
  children,
  confirmLabel = "Confirmer la suppression",
  className = "",
  form,
  asDialog = false,
  state = null,
}: {
  children: ReactNode;
  confirmLabel?: string;
  className?: string;
  /** Id d'un formulaire hors de l'arbre, pour placer le bouton dans un autre formulaire. */
  form?: string;
  /** Fenêtre centrée à l'écran plutôt que le bouton qui se transforme sur place, pour les suppressions plus lourdes de conséquence (un exemplaire, un set). */
  asDialog?: boolean;
  /**
   * État renvoyé par l'action (`useActionState` du formulaire parent), pour `asDialog` : affiche
   * une erreur bloquante dans la fenêtre au lieu de la laisser masquée derrière, et referme la
   * fenêtre toute seule une fois l'action terminée sans erreur. Sans ça, on ne peut pas fermer le
   * bouton « Confirmer » lui-même au clic sans annuler l'envoi du formulaire en cours (le bouton
   * disparaîtrait du DOM avant que le navigateur ait fini de le soumettre).
   */
  state?: ActionState;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (!state?.error) setArmed(false);
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setArmed(true)}
      className={`font-bold text-brick-deep underline underline-offset-4 cursor-pointer transition-colors hover:text-brick ${className}`}
    >
      {children}
    </button>
  );

  if (asDialog) {
    return (
      <>
        {trigger}
        {armed ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-4"
            role="alertdialog"
            aria-modal="true"
            onClick={() => setArmed(false)}
          >
            <div className="brick-card bg-paper p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
              <p className="font-bold text-lg text-ink-deep">{children} ?</p>
              <p className="mt-2 text-slate-ink">Cette action est définitive.</p>
              {state?.error ? <p className="mt-3 text-sm font-semibold text-brick-deep">{state.error}</p> : null}
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="submit"
                  form={form}
                  disabled={pending}
                  className="btn btn-brick text-sm py-2 px-3 disabled:opacity-60 disabled:cursor-wait"
                >
                  {pending ? "Suppression…" : confirmLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setArmed(false)}
                  className="font-bold underline underline-offset-4 cursor-pointer transition-opacity hover:opacity-70"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (!armed) return trigger;
  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="submit"
        form={form}
        disabled={pending}
        className="btn btn-brick text-sm py-2 px-3"
      >
        {pending ? "Suppression…" : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="font-bold underline underline-offset-4 cursor-pointer transition-opacity hover:opacity-70"
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
      className={`mt-4 rounded-xl border px-4 py-3 font-semibold ${
        state.error
          ? "border-brick/30 bg-red-50 text-brick-deep"
          : "border-slate-ink/15 bg-sky text-ink-deep"
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
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="flex h-full flex-col">
      <span className="block font-bold text-ink-deep">
        {label}
        {required ? (
          <span className="text-brick" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </span>
      {hint ? <span className="block text-sm text-slate-ink">{hint}</span> : null}
      <span className="block mt-auto pt-1">{children}</span>
    </label>
  );
}

export const inputClass =
  "focus-outline-none w-full rounded-xl border border-slate-ink/20 bg-paper px-3 py-2 text-ink-deep";
