"use client";

import Link from "next/link";
import { daysLate } from "@/lib/dates";
import { formatCents, formatDateShort, formatPhone, formatTime } from "@/lib/format";
import { ListActions } from "./list-actions";
import type { BookingRow } from "./bookings-table";

export function BookingDialog({ row, today, onClose }: { row: BookingRow; today: string; onClose: () => void }) {
  const late = row.status === "picked_up" ? daysLate(row.endDate, today) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="brick-card bg-paper p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-ink">{row.reference}</p>
            <h2 className="display text-xl font-semibold">{row.setName}</h2>
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

        <p className="mt-2 text-slate-ink">
          {row.customerFirstName} {row.customerLastName}
          {row.customerPhone ? ` · ${formatPhone(row.customerPhone)}` : ""}
          {row.customerBlocked ? " · compte bloqué" : ""}
        </p>

        <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 text-slate-ink">
          <div className="sm:col-span-2">
            <dt className="inline text-sm">Période de location : </dt>
            <dd className="inline font-semibold text-ink-deep">
              du {formatDateShort(row.startDate)} au {formatDateShort(row.endDate)}
              <span className="font-normal text-slate-ink">
                {" "}
                · {row.days} jour{row.days > 1 ? "s" : ""} · {formatCents(row.rentalCents)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="inline text-sm">Lieu de remise : </dt>
            <dd className="inline font-semibold text-ink-deep">{row.pickupPointName ?? "à convenir"}</dd>
          </div>
          <div>
            <dt className="inline text-sm">Heure de remise : </dt>
            <dd className="inline font-semibold text-ink-deep">{formatTime(row.pickupTime) ?? "à convenir"}</dd>
          </div>
        </dl>

        {late > 0 ? (
          <p className="mt-3 text-sm font-bold text-brick-deep">
            Retard de {late} jour{late > 1 ? "s" : ""}.
          </p>
        ) : null}

        {row.status === "pending_review" ? (
          <ListActions bookingId={row.id} onSuccess={onClose} />
        ) : (
          <div className="mt-4 flex justify-end">
            <Link href={`/admin/reservations/${row.id}`} className="btn btn-leaf">
              Voir la fiche complète
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
