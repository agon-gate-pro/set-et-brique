import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, CalendarCheck, CreditCard, Gift, Package, PackageCheck, Users, type LucideIcon } from "lucide-react";
import { formatCents } from "@/lib/format";
import { TONE_BADGE, type Tone } from "@/components/admin/sections";

export type DashboardFigures = {
  sets: number;
  customers: number;
  validVouchers: number;
  inRental: number;
  pending: number;
  late: number;
  toHandOver: number;
  pendingPayment: number;
  caDayCents: number;
  caWeekCents: number;
  caMonthCents: number;
};

/** Titre d'un groupe de chiffres, souligné de la couleur du groupe. */
function GroupTitle({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <h2 className="mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-ink">
      <span className={`h-2.5 w-2.5 rounded-full ${tone}`} aria-hidden="true" />
      {children}
    </h2>
  );
}

/** Carte d'un chiffre : icône dans une pastille de couleur, chiffre en grand, libellé ; lien si `href`. */
function StatCard({
  href,
  icon: Icon,
  tone,
  value,
  label,
}: {
  href?: string;
  icon: LucideIcon;
  tone: Tone;
  value: ReactNode;
  label: string;
}) {
  const body = (
    <>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_BADGE[tone]}`} aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3 block display text-3xl sm:text-4xl font-bold text-ink-deep">{value}</span>
      <span className="mt-0.5 block font-semibold leading-snug text-slate-ink">{label}</span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="block h-full brick-card p-4 sm:p-5 hover:bg-sea/10 transition-colors">
          {body}
        </Link>
      ) : (
        <div className="h-full brick-card p-4 sm:p-5">{body}</div>
      )}
    </li>
  );
}

/** Carte de chiffre d'affaires, plus petite pour tenir à trois par ligne sur téléphone. */
function RevenueCard({ value, label }: { value: number; label: string }) {
  return (
    <li className="brick-card bg-leaf/5 border-leaf/25 p-3 sm:p-5">
      <span className="block display text-base min-[400px]:text-lg sm:text-3xl font-bold text-leaf-deep whitespace-nowrap">
        {formatCents(value)}
      </span>
      <span className="mt-0.5 block text-sm sm:text-base font-semibold text-slate-ink">{label}</span>
    </li>
  );
}

/**
 * Tableau de bord de l'espace de gestion : bandeaux d'alerte, puis les chiffres regroupés par
 * thème, chacun dans sa couleur (À faire en bleu comme les réservations, chiffre d'affaires en
 * vert, catalogue et clients aux couleurs de leur rubrique). Deux cartes par ligne sur téléphone,
 * trois sur grand écran. Les cartes « À faire » ouvrent les réservations déjà filtrées.
 */
export function DashboardView({ f }: { f: DashboardFigures }) {
  return (
    <>
      {f.pending > 0 ? (
        <Link
          href="/admin/reservations?statut=pending_review"
          className="mt-6 flex items-center gap-3 brick-card bg-sun p-4 sm:p-5 font-semibold text-ink-deep hover:bg-sun-deep transition-colors"
        >
          <CalendarClock className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            {f.pending} demande{f.pending > 1 ? "s" : ""} à traiter
          </span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}
      {f.late > 0 ? (
        <Link
          href="/admin/reservations?statut=ongoing"
          className="mt-4 flex items-center gap-3 brick-card bg-brick/10 border-brick p-4 sm:p-5 font-semibold text-brick-deep hover:bg-brick/25 transition-colors"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            {f.late} set{f.late > 1 ? "s" : ""} en retard de retour
          </span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}

      <GroupTitle tone="bg-sea">À faire</GroupTitle>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          href="/admin/reservations?statut=pending_review"
          icon={CalendarClock}
          tone="sea"
          value={f.pending}
          label="Demandes à traiter"
        />
        <StatCard
          href="/admin/reservations?statut=pending_payment"
          icon={CreditCard}
          tone="sea"
          value={f.pendingPayment}
          label="Paiements en attente"
        />
        <StatCard
          href="/admin/reservations?statut=to_handover"
          icon={PackageCheck}
          tone="sea"
          value={f.toHandOver}
          label="Sets à remettre"
        />
        <StatCard
          href="/admin/reservations?statut=ongoing"
          icon={CalendarCheck}
          tone="sea"
          value={f.inRental}
          label="Sets en location"
        />
      </ul>

      <GroupTitle tone="bg-leaf">Chiffre d&apos;affaires</GroupTitle>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
        <RevenueCard value={f.caDayCents} label="Aujourd'hui" />
        <RevenueCard value={f.caWeekCents} label="Semaine" />
        <RevenueCard value={f.caMonthCents} label="Mois" />
      </ul>

      <GroupTitle tone="bg-sun-deep">Catalogue et clients</GroupTitle>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard href="/admin/sets" icon={Package} tone="sun" value={f.sets} label="Sets au catalogue" />
        <StatCard icon={Users} tone="ink" value={f.customers} label="Clients" />
        <StatCard href="/admin/bons-cadeaux" icon={Gift} tone="brick" value={f.validVouchers} label="Bons cadeaux valides" />
      </ul>
    </>
  );
}
