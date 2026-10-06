"use client";

import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}

const nowInSeconds = () => Math.floor(Date.now() / 1000);
// Rien côté serveur : l'heure du rendu n'est pas celle du navigateur, le compteur n'apparaît qu'une fois la page chargée.
const noServerClock = () => null;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Temps pendant lequel le set reste réservé au client en attendant son paiement (`payment_due_at`),
 * décompté à la seconde.
 */
export function PaymentCountdown({ dueAt, className = "" }: { dueAt: Date; className?: string }) {
  const now = useSyncExternalStore(subscribe, nowInSeconds, noServerClock);
  if (now == null) return null;

  const left = Math.floor(dueAt.getTime() / 1000) - now;
  if (left <= 0) {
    return (
      <p className={`font-semibold text-brick-deep ${className}`} role="status">
        Le délai de paiement est dépassé. Contactez-nous pour savoir si votre set est encore disponible.
      </p>
    );
  }

  const hours = Math.floor(left / 3600);
  const minutes = Math.floor((left % 3600) / 60);
  const seconds = left % 60;
  return (
    <p className={`text-slate-ink ${className}`}>
      Votre set vous reste réservé encore{" "}
      <strong className="whitespace-nowrap tabular-nums text-ink-deep" role="timer">
        {hours > 0 ? `${hours} h ` : ""}
        {pad(minutes)} min {pad(seconds)} s
      </strong>
      . Passé ce délai, la réservation est annulée.
    </p>
  );
}
