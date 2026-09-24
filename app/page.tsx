import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Gift,
  MapPin,
  PackageOpen,
  RotateCcw,
  Search,
  ShoppingBag,
  Star,
  type LucideIcon,
} from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { GoogleLogo } from "@/components/google-logo";
import { ReviewsCarousel } from "@/components/reviews-carousel";
import { FacebookIcon, InstagramIcon } from "@/components/social-icons";
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { slugify } from "@/lib/format";
import { giftVoucherAmounts, press, reviews, site } from "@/lib/site";

const steps: { title: string; text: string; icon: LucideIcon; border: string }[] = [
  {
    title: "Choisissez un set",
    text: "Parcourez le catalogue et choisissez vos dates. La durée est libre : vous ne payez que les jours où vous gardez le set.",
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

// Page statique, régénérée à chaque modification d'un set (`revalidateSet()`,
// `app/admin/sets/actions.ts`) ; l'heure est un filet de sécurité.
export const revalidate = 3600;

/**
 * Une tuile par gamme du catalogue : photo du premier set de la gamme (coups de cœur d'abord,
 * puis ordre du catalogue) et nombre de sets. Les sets sans gamme n'ont pas de tuile.
 */
async function loadThemeTiles() {
  const rows = await db
    .select({
      theme: schema.sets.theme,
      cover: sql<string | null>`(select url from ${schema.setImages} i where i.set_id = ${schema.sets}.id order by i.sort_order asc, i.created_at asc limit 1)`,
    })
    .from(schema.sets)
    .where(and(eq(schema.sets.status, "published"), isNotNull(schema.sets.theme)))
    .orderBy(desc(schema.sets.featured), asc(schema.sets.sortOrder), asc(schema.sets.name));

  const tiles = new Map<string, { slug: string; label: string; cover: string | null; count: number }>();
  for (const r of rows) {
    const slug = slugify(r.theme!);
    const tile = tiles.get(slug) ?? { slug, label: r.theme!, cover: null, count: 0 };
    tile.count += 1;
    tile.cover ??= r.cover;
    tiles.set(slug, tile);
  }
  return [...tiles.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export default async function HomePage() {
  const themeTiles = await loadThemeTiles();

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
            className="mx-auto mb-6 block max-w-sm md:max-w-lg lg:max-w-xl overflow-hidden rounded-[2rem] border-4 border-paper shadow-brick transition-transform hover:scale-[1.02]"
          >
            <Image
              src="/images/bandeau.png"
              alt="Trois personnages en briques de construction, entourés de pièces colorées"
              width={670}
              height={316}
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
            Les plus grands sets de briques de construction, loués pour la
            durée de votre choix autour de Lorient.
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
              Comment ça marche
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

      {themeTiles.length > 0 ? (
        <section id="gammes" className="scroll-mt-24 pb-16 md:pb-24">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <div className="text-center mb-10 md:mb-14">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-ink">Le catalogue</p>
              <h2 className="mt-3 text-3xl md:text-5xl font-bold">Nos gammes</h2>
            </div>
            <ul className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {themeTiles.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/catalogue?gamme=${t.slug}`}
                    className={`group brick-card relative block aspect-[4/3] overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun ${
                      t.cover ? "bg-sky" : "studs-ink"
                    }`}
                  >
                    {t.cover ? (
                      <Image
                        src={t.cover}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 270px, (min-width: 768px) 33vw, 50vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : null}
                    {/* Dégradé sombre en bas pour que le nom reste lisible sur n'importe quelle photo. */}
                    <span className="absolute inset-0 bg-gradient-to-t from-ink-deeper/85 via-ink-deeper/25 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-3 md:p-4">
                      <span className="block display text-lg md:text-2xl font-bold leading-tight text-paper">
                        {t.label}
                      </span>
                      <span className="mt-0.5 block text-xs md:text-sm font-semibold text-paper/85">
                        {t.count} set{t.count > 1 ? "s" : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-10 md:mt-12 text-center">
              <Link href="/catalogue" className="btn btn-brick justify-center">
                <BookOpen className="h-5 w-5" />
                Voir le catalogue
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="pb-16 md:pb-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          {/* Bandeau en forme de ticket : talon à gauche, ligne de découpe pointillée, encoches. */}
          <div className="studs relative overflow-hidden rounded-3xl border border-sun-deep/40 shadow-brick-sun flex flex-col md:flex-row">
            <div className="flex items-center justify-center px-8 pt-7 pb-5 md:py-8 md:w-40 shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-ink-deep/25">
              <Gift className="h-12 w-12 md:h-14 md:w-14 text-ink-deep -rotate-6" strokeWidth={1.75} aria-hidden />
            </div>
            <span aria-hidden className="hidden md:block absolute left-40 -top-3 h-6 w-6 -translate-x-1/2 rounded-full bg-sky border border-sun-deep/40" />
            <span aria-hidden className="hidden md:block absolute left-40 -bottom-3 h-6 w-6 -translate-x-1/2 rounded-full bg-sky border border-sun-deep/40" />
            <div className="flex-1 flex flex-col lg:flex-row items-center md:items-start lg:items-center gap-5 lg:gap-8 px-5 pt-5 pb-7 md:px-10 md:py-8 text-center md:text-left">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-ink-deep/70">Idée cadeau</p>
                <h2 className="mt-1 text-2xl md:text-3xl font-bold">Offrez un bon cadeau</h2>
                <p className="mt-2 font-semibold text-ink-deep">
                  {giftVoucherAmounts.map((a) => `${a} €`).join(", ").replace(/, ([^,]*)$/, " ou $1")}, à utiliser
                  sur le set de son choix.
                  <br />
                  Valable un an.
                </p>
              </div>
              <Link href="/bons-cadeaux" className="btn bg-ink-deep text-paper justify-center shrink-0 px-6 text-base md:px-7 md:text-[1.0625rem]">
                Découvrir les bons cadeaux
              </Link>
            </div>
          </div>
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

      <section id="vinted" className="scroll-mt-24 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-5 md:px-8 text-center">
          <span className="inline-flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl md:rounded-3xl bg-paper border-x border-b border-slate-ink/10 border-t-4 border-t-brick shadow-brick-sm mb-8">
            <ShoppingBag className="h-8 w-8 md:h-9 md:w-9 text-[#09B1BA]" />
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            L&apos;aventure continue en Seconde Main
          </h2>
          <p className="mt-6 text-lg md:text-xl leading-relaxed text-slate-ink">
            Les briques ont cette capacité unique de capturer
            l&apos;imagination et de transformer n&apos;importe quel moment
            en une aventure créative. Que vous soyez collectionneurs
            passionné ou simplement à la recherche de vracs, figurines,
            plaques etc... pour compléter votre ensemble, notre boutique
            Vinted officielle est l&apos;endroit idéal pour dénicher des
            trésors cachés.
          </p>
          <a
            href={site.links.vinted}
            target="_blank"
            rel="noopener noreferrer"
            className="btn mt-8 justify-center bg-[#09B1BA] text-white"
          >
            <ShoppingBag className="h-5 w-5" />
            Acheter sur Vinted
          </a>
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
              className="flex items-center gap-2 font-bold text-[#1877F2] hover:opacity-80 transition-opacity"
            >
              <FacebookIcon className="h-6 w-6" />
              Facebook
            </a>
            <a
              href={site.links.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity"
            >
              <InstagramIcon className="h-6 w-6" />
              <span className="bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] bg-clip-text text-transparent">
                Instagram
              </span>
            </a>
          </div>

          <div className="bg-paper rounded-[2rem] md:rounded-[2.5rem] border border-slate-ink/10 shadow-brick-sm mt-8 p-8 md:p-12 text-left">
            <ContactForm />
          </div>

          <p className="mt-6 text-slate-ink">
            Vous préférez appeler ou écrire directement ?
            <br />
            <a href={site.phoneHref} className="font-bold text-ink-deep hover:text-brick">
              {site.phone}
            </a>{" "}
            ·{" "}
            <a href={`mailto:${site.email}`} className="font-bold text-ink-deep hover:text-brick">
              {site.email}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
