import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  MapPin,
  PackageOpen,
  RotateCcw,
  Search,
  Star,
  type LucideIcon,
} from "lucide-react";
import { GoogleLogo } from "@/components/google-logo";
import { ReviewsCarousel } from "@/components/reviews-carousel";
import { press, reviews, site } from "@/lib/site";

const steps: { title: string; text: string; icon: LucideIcon; border: string }[] = [
  {
    title: "Choisissez un set",
    text: "Parcourez le catalogue, choisissez vos dates et la durée qui vous convient. Plus vous louez longtemps, moins la journée coûte cher.",
    icon: Search,
    border: "border-t-brick",
  },
  {
    title: "Récupérez-le en main propre",
    text: `On se retrouve à un lieu de rendez-vous convenu ensemble, jusqu'à ${site.radiusKm} km autour de Lorient. Le set est complet, trié et vérifié.`,
    icon: PackageOpen,
    border: "border-t-ink",
  },
  {
    title: "Construisez, puis rapportez",
    text: "Prenez le temps de monter, d'admirer, de jouer. Une fois terminé, démontez et rapportez le set pour qu'une autre famille en profite.",
    icon: RotateCcw,
    border: "border-t-sun-deep",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-sun/10 border-b border-slate-ink/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-sun/40 blur-3xl animate-blob" />
          <div className="absolute top-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-brick/10 blur-3xl animate-blob [animation-delay:2s]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-5 md:px-8 py-20 md:py-28 text-center">
          <Link
            href="/qui-sommes-nous"
            className="mx-auto mb-6 block max-w-xs md:max-w-md overflow-hidden rounded-[2rem] border-4 border-paper shadow-brick transition-transform hover:scale-[1.02]"
          >
            <Image
              src="/images/bandeau.png"
              alt="Trois personnages en briques de construction, entourés de pièces colorées"
              width={640}
              height={360}
              className="h-auto w-full object-cover"
              priority
            />
          </Link>

          <a
            href={site.links.googleReviews}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-ink/15 bg-paper px-4 py-2 text-sm font-semibold text-ink-deep shadow-brick-sm mb-5 transition-colors hover:text-brick"
          >
            <MapPin className="h-4 w-4 text-brick" />
            Basé à {site.city}
          </a>

          <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight">
            Louez. <span className="text-brick">Construisez.</span>
            <br className="hidden md:block" /> Rapportez.
          </h1>

          <p className="mt-5 text-lg md:text-xl leading-relaxed text-slate-ink">
            Les plus grands sets de briques de construction, loués à la
            semaine autour de Lorient. Sans les acheter, sans les stocker.
          </p>
          <p className="mt-2 text-lg md:text-xl font-semibold text-ink-deep">
            Une entreprise familiale, des sets complets et vérifiés, une
            remise en main propre. Pour les familles, les grands-parents,
            les écoles et les hôpitaux du pays de Lorient.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/catalogue" className="btn btn-brick justify-center">
              <BookOpen className="h-5 w-5" />
              Voir le catalogue
            </Link>
            <Link href="#concept" className="btn btn-paper justify-center">
              Comment ça marche
            </Link>
          </div>
        </div>
      </section>

      <section id="concept" className="scroll-mt-24 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="text-center mb-14 md:mb-20">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-ink">
              Notre concept
            </p>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold">
              Simple comme un jeu d&apos;enfant
            </h2>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className={`bg-paper rounded-2xl shadow-brick-sm border-x border-b border-slate-ink/10 border-t-4 ${step.border} p-8 flex flex-col`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky">
                  <step.icon className="h-7 w-7 text-ink-deep" />
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

      <section className="py-16 md:py-24 bg-sky">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="text-center mb-14 md:mb-16">
            <div className="flex justify-center gap-1 mb-5">
              {Array.from({ length: 5 }).map((_, star) => (
                <Star key={star} className="h-6 w-6 fill-sun-deep text-sun-deep" />
              ))}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold">
              Ce que disent nos clients
            </h2>
            <a
              href={site.links.googleReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-ink hover:text-brick transition-colors"
            >
              <GoogleLogo className="h-5 w-5" />
              Avis vérifiés sur Google
            </a>
          </div>

          <ReviewsCarousel reviews={reviews} />

          <div className="mt-10 md:mt-14 text-center">
            <a
              href={site.links.googleReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-paper"
            >
              <GoogleLogo className="h-5 w-5" />
              Voir plus d&apos;avis sur Google
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <h2 className="text-center text-3xl md:text-5xl font-bold">
            La presse en parle
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {press.map((p, i) => (
              <li key={p.outlet}>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-full flex-col bg-paper rounded-2xl border border-slate-ink/10 shadow-brick-sm p-7 transition-shadow hover:shadow-brick"
                >
                  <span className="inline-flex items-center gap-2 self-start rounded-full bg-sun/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-deep mb-5">
                    Presse locale
                  </span>
                  <span className="flex items-center gap-2 display font-bold text-ink-deep">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${["bg-brick", "bg-ink", "bg-sun-deep"][i % 3]}`}
                    />
                    {p.outlet}
                  </span>
                  <span className="mt-3 text-xl font-semibold leading-snug">
                    {p.title}
                  </span>
                  <span className="mt-3 text-slate-ink leading-relaxed flex-1">
                    « {p.quote} »
                  </span>
                  <span className="mt-6 inline-flex items-center justify-center rounded-full bg-sky py-3 font-bold text-ink-deep">
                    Lire l&apos;article
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 bg-sun/10 border-y border-slate-ink/10">
        <div className="mx-auto max-w-4xl px-5 md:px-8 py-16 md:py-24 text-center">
          <h2 className="text-3xl md:text-5xl font-bold">Nous contacter</h2>
          <p className="mt-4 text-lg text-slate-ink leading-relaxed max-w-2xl mx-auto">
            Une question, un besoin particulier ? Particulier, association,
            entreprise ou collectivité, nous répondons vite et faisons des
            devis sur mesure.
          </p>

          <div className="mt-7 flex justify-center gap-8">
            <a
              href={site.links.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ink-deep hover:text-brick transition-colors"
            >
              Facebook
            </a>
            <a
              href={site.links.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ink-deep hover:text-brick transition-colors"
            >
              Instagram
            </a>
          </div>

          <div className="brick-card mt-8 p-8 md:p-10 text-left mx-auto max-w-lg">
            <dl className="space-y-5">
              <div>
                <dt className="display font-semibold text-brick-deep">Téléphone</dt>
                <dd>
                  <a href={site.phoneHref} className="text-2xl font-bold">
                    {site.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="display font-semibold text-brick-deep">Email</dt>
                <dd>
                  <a href={`mailto:${site.email}`} className="text-2xl font-bold break-all">
                    {site.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="display font-semibold text-brick-deep">Où</dt>
                <dd className="text-lg">
                  {site.city}, remise en main propre jusqu&apos;à {site.radiusKm} km
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
