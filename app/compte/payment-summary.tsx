"use client";

import { useState, useTransition, type FormEvent } from "react";
import { X } from "lucide-react";
import { inputClass } from "@/components/admin/form";
import { formatCents, formatDate, formatTime } from "@/lib/format";
import type { CustomerBooking } from "@/lib/bookings";
import { checkGiftVoucher } from "./actions";
import { PaymentCountdown } from "./payment-countdown";

type Props = {
  booking: CustomerBooking;
  setName: string;
  pickupPoint: string | null;
  /** Vrai quand le client arrive par le lien de l'e-mail d'acceptation (`/compte?payer=<référence>`). */
  initiallyOpen: boolean;
};

/**
 * Demande acceptée, loyer à régler avant la remise : bouton « Payer ma location » et fenêtre de
 * récapitulatif, dernière étape avant la fenêtre de paiement.
 */
export function PaymentSummary({ booking, setName, pickupPoint, initiallyOpen }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const [notice, setNotice] = useState(false);
  const total = booking.rentalCents + (booking.disassemblyCents ?? 0);
  // Bon vérifié mais pas consommé : il ne passe à « utilisé » qu'au paiement (voir `checkGiftVoucher`).
  const [voucher, setVoucher] = useState<{ code: string; amountCents: number } | null>(null);
  const [code, setCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  // Usage unique, sans report : le bon ne déduit jamais plus que le prix, la caution reste due à part.
  const deducted = voucher ? Math.min(voucher.amountCents, total) : 0;

  function handleVoucher(e: FormEvent) {
    e.preventDefault();
    startChecking(async () => {
      const result = await checkGiftVoucher(booking.id, code);
      if ("error" in result) {
        setVoucherError(result.error);
        return;
      }
      setVoucher(result);
      setCode("");
      setVoucherError(null);
    });
  }

  function handleClose() {
    setOpen(false);
    setNotice(false);
    setVoucherError(null);
    // Sans ça, recharger la page rouvrirait le récapitulatif.
    window.history.replaceState(null, "", window.location.pathname);
  }

  function handlePay() {
    // Paiement en ligne (module 4) : c'est ici que partira la redirection vers la fenêtre de paiement,
    // avec `voucher?.code` à revérifier et à consommer côté serveur.
    setNotice(true);
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/20 bg-sky p-4">
        <div>
          <p className="font-semibold text-ink-deep">
            Votre demande est acceptée. Il reste {formatCents(total)} à régler avant la remise.
          </p>
          {booking.paymentDueAt ? <PaymentCountdown dueAt={booking.paymentDueAt} className="mt-1 text-sm" /> : null}
        </div>
        <button type="button" onClick={() => setOpen(true)} className="btn btn-brick text-sm py-2 px-4 shrink-0">
          Payer ma location
        </button>
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          <div className="brick-card bg-paper p-4 sm:p-6 max-w-md w-full max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-ink-deep">Votre location</h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fermer"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-ink cursor-pointer transition-colors hover:bg-sky hover:text-brick-deep"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {booking.paymentDueAt ? (
              <PaymentCountdown dueAt={booking.paymentDueAt} className="mt-3 rounded-xl border border-sun-deep/40 bg-sun/25 p-3 text-sm" />
            ) : null}

            <div className="mt-4 rounded-xl bg-sky border border-slate-ink/15 p-4">
              <p className="font-bold text-ink-deep">{setName}</p>
              <p className="text-sm text-slate-ink">Référence {booking.reference}</p>
              <dl className="mt-3 space-y-1 text-sm text-slate-ink">
                <div className="flex justify-between gap-4">
                  <dt>Remise</dt>
                  <dd className="text-right font-semibold text-ink-deep">
                    {formatDate(booking.startDate)}
                    {booking.pickupTime ? ` à ${formatTime(booking.pickupTime)}` : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Retour</dt>
                  <dd className="text-right font-semibold text-ink-deep">{formatDate(booking.endDate)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Lieu</dt>
                  <dd className="text-right font-semibold text-ink-deep">{pickupPoint ?? "à convenir"}</dd>
                </div>
              </dl>
            </div>

            <dl className="mt-4 space-y-1.5 text-slate-ink">
              <div className="flex justify-between gap-4">
                <dt>
                  Location, {booking.days} jour{booking.days > 1 ? "s" : ""}
                </dt>
                <dd className="font-semibold text-ink-deep">{formatCents(booking.rentalCents)}</dd>
              </div>
              {booking.disassemblyCents != null ? (
                <div className="flex justify-between gap-4">
                  <dt>Set rendu monté</dt>
                  <dd className="font-semibold text-ink-deep">{formatCents(booking.disassemblyCents)}</dd>
                </div>
              ) : null}
              {voucher ? (
                <div className="flex justify-between gap-4">
                  <dt>
                    Bon cadeau {voucher.code}{" "}
                    <button type="button" onClick={() => setVoucher(null)} className="text-sm font-bold underline underline-offset-4 cursor-pointer">
                      Retirer
                    </button>
                  </dt>
                  <dd className="font-semibold text-ink-deep">− {formatCents(deducted)}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-4 border-t border-slate-ink/15 pt-2">
                <dt>Total à payer</dt>
                <dd className="display text-2xl font-bold text-leaf-deep">{formatCents(total - deducted)}</dd>
              </div>
            </dl>

            {voucher ? (
              voucher.amountCents > total ? (
                <p className="mt-2 text-sm text-slate-ink">
                  Ce bon vaut {formatCents(voucher.amountCents)} : les {formatCents(voucher.amountCents - total)} restants
                  ne sont pas reportés sur une autre location.
                </p>
              ) : null
            ) : (
              <form onSubmit={handleVoucher} className="mt-4">
                <label htmlFor={`voucher-${booking.id}`} className="text-sm font-semibold text-ink-deep">
                  Vous avez un bon cadeau ?
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id={`voucher-${booking.id}`}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="SB-XXXXXXXX"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className={`${inputClass} uppercase placeholder:normal-case`}
                  />
                  <button type="submit" disabled={checking || !code.trim()} className="btn btn-paper text-sm py-2 px-4 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                    {checking ? "Vérification…" : "Appliquer"}
                  </button>
                </div>
                {voucherError ? (
                  <p className="mt-1.5 text-sm font-semibold text-brick-deep" role="alert">
                    {voucherError}
                  </p>
                ) : null}
              </form>
            )}

            <p className="mt-3 text-sm text-slate-ink">
              Caution {formatCents(booking.depositCents)}, bloquée à la remise, jamais débitée sauf casse ou perte.
            </p>

            {notice ? (
              <p className="mt-3 text-sm text-slate-ink" role="status">
                Le paiement en ligne arrive très bientôt.
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-4">
              <button type="button" onClick={handleClose} className="font-bold underline underline-offset-4 cursor-pointer">
                Annuler
              </button>
              <button type="button" onClick={handlePay} className="btn btn-brick">
                Payer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
