"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { daysLate } from "@/lib/dates";
import { bookingStatusLabels, formatCents, formatDate, formatPhone, formatTime, phoneHref } from "@/lib/format";
import { ListActions } from "./list-actions";
import { neutralBadge, statusTone } from "./status-tone";
import type { BookingRow } from "./bookings-table";

/**
 * Aperçu d'une réservation au clic sur une ligne du tableau : état en couleur (mêmes couleurs que le
 * tableau et la fiche), puis quatre blocs titrés (client, montant, remise, retour) plutôt qu'une
 * suite de phrases, pour lire d'un coup d'œil qui, combien, quand et où.
 */
export function BookingDialog({ row, today, onClose }: { row: BookingRow; today: string; onClose: () => void }) {
  const late = row.status === "picked_up" ? daysLate(row.endDate, today) : 0;
  const pricePerDay = Math.round(row.rentalCents / row.days);
  const total = row.rentalCents + (row.disassemblyCents ?? 0);
  const name = [row.customerFirstName, row.customerLastName].filter(Boolean).join(" ") || "Client sans nom";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-dialog-title"
      onClick={onClose}
    >
      <div
        className="brick-card bg-paper p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-ink">{row.reference}</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                  late > 0 ? "border-brick bg-brick text-paper" : (statusTone(row.status)?.badge ?? neutralBadge)
                }`}
              >
                {late > 0 ? `Retard de ${late} jour${late > 1 ? "s" : ""}` : bookingStatusLabels[row.status]}
              </span>
              {row.extension ? (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${statusTone(row.extension)?.badge ?? neutralBadge}`}>
                  {row.extension === "pending_review" ? "Prolongation demandée" : "Prolongation à payer"}
                </span>
              ) : null}
            </div>
            <h2 id="booking-dialog-title" className="display mt-1 text-xl font-semibold break-words">
              {row.setName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="cursor-pointer text-xl leading-none text-slate-ink transition-colors hover:text-ink-deep"
          >
            ×
          </button>
        </div>

        <dl className="mt-5 grid gap-x-8 gap-y-5 border-t border-slate-ink/10 pt-5 sm:grid-cols-2">
          <Block label="Client">
            <span className="block font-semibold text-ink-deep">{name}</span>
            {row.customerPhone ? (
              <a href={phoneHref(row.customerPhone)} className="block text-slate-ink underline underline-offset-4">
                {formatPhone(row.customerPhone)}
              </a>
            ) : null}
            {row.customerBlocked ? <span className="block text-sm font-bold text-brick-deep">Compte bloqué</span> : null}
          </Block>
          <Block label="Montant">
            <span className="display block text-2xl font-bold leading-tight text-leaf-deep">{formatCents(total)}</span>
            <span className="block text-sm text-slate-ink">
              {row.days} jour{row.days > 1 ? "s" : ""} × {formatCents(pricePerDay)}
            </span>
            {row.disassemblyCents != null ? (
              <span className="block text-sm text-slate-ink">+ {formatCents(row.disassemblyCents)} rendu monté</span>
            ) : null}
          </Block>
          <Block label="Remise">
            <span className="block font-semibold text-ink-deep">
              {formatDate(row.startDate)}
              {row.pickupTime ? ` · ${formatTime(row.pickupTime)}` : ""}
            </span>
            {row.pickupTime ? null : <span className="block text-sm text-slate-ink">Heure à convenir</span>}
            <span className="block text-sm text-slate-ink">{row.pickupPointName ?? "Lieu à convenir"}</span>
          </Block>
          <Block label="Retour">
            <span className={`block font-semibold ${late > 0 ? "text-brick-deep" : "text-ink-deep"}`}>
              {formatDate(row.endDate)}
            </span>
            <span className="block text-sm text-slate-ink">
              {row.days} jour{row.days > 1 ? "s" : ""} de location
            </span>
          </Block>
        </dl>

        <div className="mt-6 border-t border-slate-ink/10">
          {row.status === "pending_review" ? (
            <div className="flex justify-end">
              <ListActions bookingId={row.id} onSuccess={onClose} />
            </div>
          ) : (
            <div className="mt-4 flex justify-end">
              <Link href={`/admin/reservations/${row.id}`} className="btn btn-leaf">
                Voir la fiche complète
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-ink">{label}</dt>
      <dd className="mt-1 break-words">{children}</dd>
    </div>
  );
}
