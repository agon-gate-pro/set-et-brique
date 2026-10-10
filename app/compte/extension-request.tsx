"use client";

import { useActionState, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { ConfirmButton, FormMessage, SubmitButton } from "@/components/admin/form";
import { isExtensionEndAllowed, type ExtensionWindow } from "@/lib/availability-core";
import { addDays, daysBetween } from "@/lib/dates";
import type { CustomerExtension, ExtensionOptions } from "@/lib/extensions";
import { formatCents, formatDate } from "@/lib/format";
import { cancelExtension, requestExtension } from "./actions";
import { ExtensionPayment } from "./extension-payment";

type Props = {
  bookingId: string;
  /** Pour le récapitulatif de paiement d'une prolongation acceptée. */
  setName: string;
  reference: string;
  /** Date de retour actuelle de la location. */
  endDate: string;
  window: ExtensionWindow;
  /** Chargé seulement quand la demande est ouverte (`window === "open"`). */
  options: ExtensionOptions | null;
  /** Demande déjà en cours sur cette location, s'il y en a une. */
  extension: CustomerExtension | null;
  /** Dernière demande refusée ou expirée pour la date de retour actuelle. */
  last: CustomerExtension | null;
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

const dueFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" });

const plural = (n: number) => `${n} jour${n > 1 ? "s" : ""}`;

/**
 * Prolongation d'une location depuis « Mes locations ». Le bouton est montré dès la réservation
 * pour que le client sache que c'est possible : grisé tant que le set n'est pas chez lui, actif
 * de la remise à la veille du retour. Une demande envoyée remplace le bouton par son état.
 */
export function ExtensionRequest({ bookingId, setName, reference, endDate, window, options, extension, last }: Props) {
  const [open, setOpen] = useState(false);
  const [cancelState, cancelAction] = useActionState(cancelExtension, null);
  // Demande envoyée ou retirée : la fenêtre repart fermée, la carte montre l'état de la demande.
  const [prevExtensionId, setPrevExtensionId] = useState(extension?.id ?? null);
  if ((extension?.id ?? null) !== prevExtensionId) {
    setPrevExtensionId(extension?.id ?? null);
    setOpen(false);
  }

  if (extension) {
    const summary = `${plural(extension.extraDays)} de plus, ${formatCents(extension.extraRentalCents)}`;
    return (
      <div role="status" className="mt-4 rounded-xl border border-ink/20 bg-sky p-4">
        {extension.status === "pending_review" ? (
          <>
            <p className="font-semibold text-ink-deep">
              Prolongation demandée jusqu&apos;au {formatDate(extension.newEndDate)} ({summary}).
            </p>
            <p className="mt-1 text-slate-ink">
              Nous examinons votre demande. En attendant notre réponse, le retour reste prévu le {formatDate(endDate)}.
            </p>
            <form action={cancelAction} className="mt-3">
              <input type="hidden" name="extensionId" value={extension.id} />
              <ConfirmButton confirmLabel="Oui, annuler ma demande" dismissLabel="Non" className="text-sm">
                Annuler ma demande de prolongation
              </ConfirmButton>
              <FormMessage state={cancelState} />
            </form>
          </>
        ) : (
          <>
            <p className="font-semibold text-ink-deep">
              Prolongation acceptée jusqu&apos;au {formatDate(extension.newEndDate)} ({summary}).
            </p>
            <p className="mt-1 text-slate-ink">
              Il reste <strong className="text-leaf-deep">{formatCents(extension.extraRentalCents)}</strong> à régler
              {extension.paymentDueAt ? (
                <>
                  {" "}
                  avant le <strong className="text-ink-deep">{dueFormatter.format(extension.paymentDueAt)}</strong>
                </>
              ) : null}
              . La prolongation devient définitive une fois ce supplément réglé ; sans paiement, le retour reste prévu le{" "}
              {formatDate(endDate)}.
            </p>
            <div className="mt-3 flex justify-end">
              <ExtensionPayment
                extension={extension}
                setName={setName}
                reference={reference}
                endDate={endDate}
                dueLabel={extension.paymentDueAt ? dueFormatter.format(extension.paymentDueAt) : null}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // Réponse négative à la dernière demande : à dire au client, qui peut en refaire une si le délai le permet.
  const notice = last ? (
    <p role="status" className="mt-4 rounded-xl border border-slate-ink/15 bg-sky p-4 text-slate-ink">
      <strong className="text-ink-deep">
        {last.status === "refused"
          ? `Votre demande de prolongation jusqu'au ${formatDate(last.newEndDate)} n'a pas pu être acceptée.`
          : `Votre demande de prolongation jusqu'au ${formatDate(last.newEndDate)} a expiré.`}
      </strong>{" "}
      {last.status === "refused" && last.reason ? `${last.reason} ` : ""}
      Le retour reste prévu le {formatDate(endDate)}.
    </p>
  ) : null;

  if (window === "closed") return notice;

  const latest = options?.latestEndDate ?? null;
  const available = window === "open" && options !== null && latest !== null;
  const hint =
    window === "not_yet"
      ? "Disponible dès que le set est chez vous."
      : available
        ? `Envie de garder le set plus longtemps ? C'est possible jusqu'au ${formatDate(latest)}.`
        : "Ce set est réservé juste après votre location : il ne peut pas être prolongé.";

  return (
    <>
      {notice}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          disabled={!available}
          onClick={() => setOpen(true)}
          className={`btn ${available ? "btn-sun cursor-pointer" : "bg-slate-200 text-slate-ink/50 shadow-none cursor-not-allowed"}`}
        >
          <CalendarPlus aria-hidden="true" className="h-5 w-5" />
          Prolonger ma location
        </button>
        <p className="text-sm text-slate-ink">{hint}</p>
        {open && available ? (
          <ExtensionDialog bookingId={bookingId} endDate={endDate} latest={latest} options={options} onClose={() => setOpen(false)} />
        ) : null}
      </div>
    </>
  );
}

function ExtensionDialog({
  bookingId,
  endDate,
  latest,
  options,
  onClose,
}: {
  bookingId: string;
  endDate: string;
  latest: string;
  options: ExtensionOptions;
  onClose: () => void;
}) {
  const [state, action] = useActionState(requestExtension, null);
  const [picked, setPicked] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const firstDay = addDays(endDate, 1);
  const baseYear = Number(firstDay.slice(0, 4));
  const baseMonth0 = Number(firstDay.slice(5, 7)) - 1;
  const maxOffset = (Number(latest.slice(0, 4)) - baseYear) * 12 + (Number(latest.slice(5, 7)) - 1 - baseMonth0);
  const monthDate = new Date(Date.UTC(baseYear, baseMonth0 + monthOffset, 1));
  const year = monthDate.getUTCFullYear();
  const month0 = monthDate.getUTCMonth();
  const leading = (monthDate.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month0 + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`),
  ];

  const selectable = (iso: string) => isExtensionEndAllowed(iso, endDate, latest, options.blackouts);
  const extraDays = picked ? daysBetween(endDate, picked) : 0;
  const navButton =
    "flex h-8 w-8 items-center justify-center rounded-full border border-slate-ink/15 text-ink-deep cursor-pointer transition-colors hover:bg-sky disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-2 sm:p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <form action={action} className="brick-card bg-paper p-3 sm:p-6 max-w-sm w-full max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <input type="hidden" name="id" value={bookingId} />
        <input type="hidden" name="newEndDate" value={picked ?? ""} />
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-ink-deep">Prolonger ma location</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-ink cursor-pointer transition-colors hover:bg-sky hover:text-brick-deep"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-ink">
          Retour prévu le {formatDate(endDate)}. Choisissez votre nouvelle date de retour, jusqu&apos;au {formatDate(latest)} au
          plus tard.
        </p>

        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={() => setMonthOffset((m) => m - 1)} disabled={monthOffset <= 0} aria-label="Mois précédent" className={navButton}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="font-bold text-ink-deep capitalize">{monthLabel.format(monthDate)}</p>
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m + 1)}
            disabled={monthOffset >= maxOffset}
            aria-label="Mois suivant"
            className={navButton}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-ink">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`empty-${i}`} />;
            const free = selectable(iso);
            const added = picked !== null && iso > endDate && iso < picked;
            return (
              <button
                key={iso}
                type="button"
                disabled={!free}
                aria-pressed={iso === picked}
                onClick={() => setPicked(iso)}
                className={`aspect-square rounded-lg text-sm font-semibold transition-colors ${
                  iso === picked
                    ? "bg-sun text-ink-deep"
                    : added
                      ? "bg-sun/40 text-ink-deep cursor-pointer"
                      : iso === endDate
                        ? "border border-ink/40 text-ink-deep cursor-not-allowed"
                        : free
                          ? "bg-leaf/10 text-ink-deep cursor-pointer hover:bg-leaf/25"
                          : "text-slate-ink/30 cursor-not-allowed"
                }`}
              >
                {Number(iso.slice(8, 10))}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-ink">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-ink/40" /> Retour actuel
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-leaf/40" /> Possible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-ink/20" /> Indisponible
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-sky border border-slate-ink/15 p-4 text-sm">
          {picked ? (
            <>
              <p className="text-ink-deep">
                Nouveau retour le <strong className="font-bold">{formatDate(picked)}</strong>
              </p>
              <p className="mt-1.5 text-slate-ink">
                {plural(extraDays)} de plus · <strong className="text-leaf-deep">{formatCents(extraDays * options.pricePerDayCents)}</strong>
              </p>
            </>
          ) : (
            <p className="text-slate-ink">{formatCents(options.pricePerDayCents)} par jour ajouté, comme pour votre location.</p>
          )}
        </div>
        <p className="mt-3 text-sm text-slate-ink">
          Set et Brique valide chaque demande. Le supplément se règle une fois la prolongation acceptée ; sans accord, le
          retour reste à la date prévue.
        </p>

        <FormMessage state={state?.error ? state : null} />
        <div className="mt-4 flex items-center justify-end gap-4">
          <button type="button" onClick={onClose} className="font-bold underline underline-offset-4 cursor-pointer">
            Annuler
          </button>
          <SubmitButton variant="leaf" disabled={!picked}>
            Envoyer ma demande
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
