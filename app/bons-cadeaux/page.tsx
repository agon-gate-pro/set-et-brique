import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { BookOpen, Gift, Mail, Phone, Puzzle, Send } from "lucide-react";
import { ScrollToTop } from "@/components/scroll-to-top";
import { db, schema } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { giftVoucherAmounts, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Bons cadeaux",
  description:
    "Offrez la location d'un grand set de briques de construction autour de Lorient : bons cadeaux Set et Brique de 10 €, 20 € ou 30 €, valables un an sur tout le catalogue.",
};

// Statique ; régénérée quand le forfait par défaut change (`app/admin/forfaits/actions.ts`).
export const revalidate = 3600;

/**
 * Tant que l'achat en ligne n'existe pas (paiement Stripe, module 4), on commande par e-mail :
 * Marion crée le bon dans l'espace de gestion et le remet imprimé ou par e-mail.
 */
function orderHref(amount?: number) {
  const subject = amount ? `Commande d'un bon cadeau de ${amount} €` : "Commande de bons cadeaux";
  const body = [
    "Bonjour,",
    "",
    amount ? `Je souhaite commander un bon cadeau de ${amount} €.` : "Je souhaite commander des bons cadeaux.",
    "Nombre de bons : 1",
    "Bon imprimé ou envoyé par e-mail : ",
    "Mon nom et mon téléphone : ",
    "",
    "Merci !",
  ].join("\n");
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const steps = [
  {
    icon: Send,
    title: "Commandez",
    border: "border-t-brick",
    text: "Choisissez un montant et envoyez-nous votre commande. On vous répond rapidement pour le règlement.",
  },
  {
    icon: Gift,
    title: "Offrez",
    border: "border-t-ink",
    text: "Le bon vous est remis imprimé, prêt à glisser dans une carte, ou envoyé par e-mail avec son code.",
  },
  {
    icon: Puzzle,
    title: "Place à la construction",
    border: "border-t-sun-deep",
    text: "La personne choisit le set qui lui plaît, réserve ses dates et saisit son code au moment de régler.",
  },
];

export default async function GiftVouchersPage() {
  const [defaultPlan] = await db
    .select({ price: schema.ratePlans.priceCentsPerDay })
    .from(schema.ratePlans)
    .where(eq(schema.ratePlans.isDefault, true))
    .limit(1);
  const pricePerDay = defaultPlan?.price ?? null;

  return (
    <>
      <ScrollToTop />
      <section className="relative overflow-hidden bg-sun/10 border-b border-slate-ink/10">
        <div className="relative mx-auto max-w-4xl px-5 md:px-8 py-8 md:py-10 text-center">
          {/* Même icône que le ticket de l'accueil : posée sans pastille, légèrement inclinée. */}
          <Gift className="mx-auto mb-4 h-12 w-12 md:h-14 md:w-14 text-ink-deep -rotate-6" strokeWidth={1.75} aria-hidden />
          <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight">
            Offrez des heures de <span className="text-brick">construction</span>
          </h1>
          <p className="mt-5 text-lg md:text-xl leading-relaxed text-slate-ink max-w-2xl mx-auto">
            Un bon cadeau Set et Brique, c&apos;est la location du set de son choix parmi tout le
            catalogue, remis en main propre autour de Lorient. Une idée pour un anniversaire, Noël,
            ou simplement pour faire plaisir.
          </p>
        </div>
      </section>

      {/* Resserré pour que la ligne « Sur la base de … par jour » soit visible dès l'arrivée. */}
      <section className="pt-8 md:pt-10 pb-14 md:pb-20">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <h2 className="text-center text-3xl md:text-4xl font-bold">Choisissez votre bon cadeau</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-3">
            {giftVoucherAmounts.map((amount) => {
              const days = pricePerDay ? Math.floor((amount * 100) / pricePerDay) : null;
              return (
                <li
                  key={amount}
                  className="bg-paper rounded-2xl shadow-brick-sm border-x border-b border-slate-ink/10 border-t-4 border-t-sun-deep px-4 lg:px-6 py-6 flex flex-col items-center text-center"
                >
                  <p className="display text-5xl md:text-6xl font-bold text-ink-deep mb-5">{amount} €</p>
                  {days ? (
                    <p className="-mt-3 mb-5 font-semibold text-slate-ink">
                      soit {days} jours de location
                    </p>
                  ) : null}
                  <a
                    href={orderHref(amount)}
                    aria-label={`Commander un bon cadeau de ${amount} €`}
                    className="btn btn-sun justify-center mt-auto w-full px-4 text-base lg:text-[1.0625rem]"
                  >
                    {/* Trois colonnes étroites sur tablette : libellé court pour tenir sur une ligne. */}
                    <span className="sm:hidden lg:inline">Commander ce bon</span>
                    <span className="hidden sm:inline lg:hidden">Commander</span>
                  </a>
                </li>
              );
            })}
          </ul>
          {pricePerDay ? (
            <p className="mt-5 text-center text-sm text-slate-ink">
              Sur la base de {formatCents(pricePerDay)} par jour. Le bon est un crédit en euros : il
              s&apos;applique au prix de la location choisie, quelle que soit sa durée.
            </p>
          ) : null}
        </div>
      </section>

      <section className="py-14 md:py-20 bg-sky border-y border-slate-ink/10">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <h2 className="text-center text-3xl md:text-4xl font-bold">Comment ça marche</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className={`bg-paper rounded-2xl shadow-brick-sm border-x border-b border-slate-ink/10 border-t-4 ${step.border} p-8 flex flex-col`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky">
                  <step.icon className="h-7 w-7 text-ink-deep" aria-hidden />
                </span>
                <h3 className="mt-6 text-xl font-semibold">
                  {i + 1}. {step.title}
                </h3>
                <p className="mt-3 text-slate-ink leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-5xl px-5 md:px-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="brick-card min-w-0 p-6 md:p-8">
            <h2 className="text-2xl font-semibold">Bon à savoir</h2>
            <ul className="mt-4 space-y-2.5 text-slate-ink leading-relaxed list-disc pl-5 marker:text-sun-deep">
              <li>Valable <strong className="text-ink-deep">un an</strong> à partir de sa date d&apos;émission.</li>
              <li>Utilisable sur <strong className="text-ink-deep">n&apos;importe quel set</strong> du catalogue, avec un complément par carte si la location coûte plus que le bon.</li>
              <li>Utilisable en une seule fois : si la location coûte moins que le bon, la différence n&apos;est pas reportée.</li>
              <li>La <strong className="text-ink-deep">caution</strong> n&apos;est pas comprise : elle reste demandée à la remise du set, comme pour toute location.</li>
              <li>Non nominatif : toute personne qui a le code peut l&apos;utiliser.</li>
              <li>Ni remboursable ni échangeable une fois acheté.</li>
            </ul>
          </div>

          <div className="brick-card min-w-0 p-6 md:p-8 flex flex-col">
            <h2 className="text-2xl font-semibold">Une question, plusieurs bons ?</h2>
            <p className="mt-4 text-slate-ink leading-relaxed">
              Pour un comité d&apos;entreprise, une école ou une commande de plusieurs bons, écrivez-nous
              ou appelez-nous, on s&apos;organise ensemble.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a href={orderHref()} className="btn btn-paper justify-center px-4 text-base">
                <Mail className="h-5 w-5" aria-hidden />
                {site.email}
              </a>
              <a href={site.phoneHref} className="btn btn-paper justify-center px-4 text-base">
                <Phone className="h-5 w-5" aria-hidden />
                {site.phone}
              </a>
            </div>
            <Link
              href="/catalogue"
              className="mt-auto pt-6 inline-flex items-center gap-2 font-semibold text-ink-deep underline underline-offset-4"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              Voir les sets à offrir
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
