"use client";

import { useState, useTransition, type FormEvent } from "react";
import { X } from "lucide-react";
import { inputClass } from "@/components/admin/form";
import type { CustomerExtension } from "@/lib/extensions";
import { formatCents, formatDate } from "@/lib/format";
import { checkExtensionGiftVoucher } from "./actions";

type Props = {
  extension: CustomerExtension;
  setName: string;
  reference: string;
  /** Date de retour actuelle, qui reste due tant que le supplément n'est pas réglé. */
  endDate: string;
  /** Échéance déjà mise en forme (fuseau de Paris), pour la rappeler dans la fenêtre. */
  dueLabel: string | null;
};

/**
 * Prolongation acceptée, supplément à régler : bouton « Payer la prolongation » et fenêtre de
 * récapitulatif, sur le modèle de `PaymentSummary` pour une location. Dernière étape avant la
 * fenêtre de paiement en ligne (module 4).
 */
export function ExtensionPayment({ extension, setName, reference, endDate, dueLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const total = extension.extraRentalCents;
  // Bon vérifié mais pas consommé : il ne passe à « utilisé » qu'au paiement (voir `checkExtensionGiftVoucher`).
  const [voucher, setVoucher] = useState<{ code: string; amountCents: number } | null>(null);
  const [code, setCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  const deducted = voucher ? Math.min(voucher.amountCents, total) : 0;

  function handleVoucher(e: FormEvent) {
    e.preventDefault();
    startChecking(async () => {
      const result = await checkExtensionGiftVoucher(extension.id, code);
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
  }

  function handlePay() {
    // Paiement en ligne (module 4) : c'est ici que partira la redirection vers la fenêtre de paiement,
    // avec `voucher?.code` à revérifier et à consommer côté serveur, et la nouvelle empreinte de caution.
    setNotice(true);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-brick text-sm py-2 px-4 shrink-0">
        Payer la prolongation
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          <div className="brick-card bg-paper p-4 sm:p-6 max-w-md w-full max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-ink-deep">Votre prolongation</h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fermer"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-ink cursor-pointer transition-colors hover:bg-sky hover:text-brick-deep"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {dueLabel ? (
              <p className="mt-3 rounded-xl border border-sun-deep/40 bg-sun/25 p-3 text-sm text-slate-ink">
                À régler avant le <strong className="text-ink-deep">{dueLabel}</strong>. Passé ce délai, la prolongation est
                annulée et le retour reste prévu le {formatDate(endDate)}.
              </p>
            ) : null}

            <div className="mt-4 rounded-xl bg-sky border border-slate-ink/15 p-4">
              <p className="font-bold text-ink-deep">{setName}</p>
              <p className="text-sm text-slate-ink">Référence {reference}</p>
              <dl className="mt-3 space-y-1 text-sm text-slate-ink">
                <div className="flex justify-between gap-4">
                  <dt>Retour actuel</dt>
                  <dd className="text-right font-semibold text-ink-deep">{formatDate(endDate)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Nouveau retour</dt>
                  <dd className="text-right font-semibold text-ink-deep">{formatDate(extension.newEndDate)}</dd>
                </div>
              </dl>
            </div>

            <dl className="mt-4 space-y-1.5 text-slate-ink">
              <div className="flex justify-between gap-4">
                <dt>
                  Prolongation, {extension.extraDays} jour{extension.extraDays > 1 ? "s" : ""}
                </dt>
                <dd className="font-semibold text-ink-deep">{formatCents(total)}</dd>
              </div>
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
                <label htmlFor={`voucher-${extension.id}`} className="text-sm font-semibold text-ink-deep">
                  Vous avez un bon cadeau ?
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id={`voucher-${extension.id}`}
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

            <p className="mt-3 text-sm text-slate-ink">La caution de votre location reste la même.</p>

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
