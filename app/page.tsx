import Link from "next/link";
import { press, reviews, site } from "@/lib/site";

const steps = [
  {
    title: "Choisissez un set",
    text: "Parcourez le catalogue, choisissez vos dates et la durée qui vous convient. Plus vous louez longtemps, moins la journée coûte cher.",
  },
  {
    title: "Récupérez-le en main propre",
    text: `On se retrouve à un lieu de rendez-vous convenu ensemble, jusqu'à ${site.radiusKm} km autour de Lorient. Le set est complet, trié et vérifié.`,
  },
  {
    title: "Construisez, puis rapportez",
    text: "Prenez le temps de monter, d'admirer, de jouer. Une fois terminé, démontez et rapportez le set pour qu'une autre famille en profite.",
  },
];

const audiences = [
  ["Familles", "Un grand set pour les vacances ou un anniversaire, sans l'acheter ni le stocker."],
  ["Grands-parents", "De quoi occuper les petits-enfants qui débarquent pour une semaine."],
  ["Écoles et associations", "Un atelier construction pour un groupe, avec devis sur mesure."],
  ["Hôpitaux et maisons de retraite", "Une activité calme, valorisante, à partager en chambre ou en salle commune."],
];

export default function HomePage() {
  return (
    <>
      <section className="studs border-b border-slate-ink/10">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24 grid gap-12 md:grid-cols-[1.1fr_1fr] items-center [&>*]:min-w-0">
          <h1 className="flex flex-col items-start gap-3 text-4xl leading-none sm:text-5xl md:text-7xl font-bold">
            <span className="block bg-brick text-white px-4 py-2 rounded-2xl shadow-brick">
              Louez.
            </span>
            <span className="block bg-paper text-ink-deep px-4 py-2 rounded-2xl shadow-brick ml-3 md:ml-10">
              Construisez.
            </span>
            <span className="block bg-ink text-sun px-4 py-2 rounded-2xl shadow-brick ml-6 md:ml-20">
              Rapportez.
            </span>
          </h1>

          <div className="brick-card p-7 md:p-9">
            <p className="text-xl md:text-2xl leading-snug font-semibold text-ink-deep">
              Les plus grands sets de briques de construction, loués à la
              semaine autour de Lorient. Sans les acheter, sans les stocker.
            </p>
            <p className="mt-4 text-slate-ink leading-relaxed">
              Une entreprise familiale, des sets complets et vérifiés, une
              remise en main propre. Pour les familles, les grands-parents,
              les écoles et les hôpitaux du pays de Lorient.
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <Link href="/catalogue" className="btn btn-brick">
                Voir le catalogue
              </Link>
              <Link href="#concept" className="btn btn-paper">
                Comment ça marche
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="concept" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <h2 className="text-3xl md:text-5xl font-bold">
            Simple comme un jeu d&apos;enfant
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="brick-card p-7 flex flex-col">
                <span className="display text-5xl font-bold text-brick leading-none">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-2xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-slate-ink leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="studs-sky border-y border-slate-ink/10">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24 grid gap-10 md:grid-cols-[1fr_1.3fr] items-start">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold">
              Pour qui ?
            </h2>
            <p className="mt-4 text-lg text-slate-ink leading-relaxed">
              Un grand set coûte cher et prend de la place une fois monté. La
              location rend ces moments accessibles à tous, pour le temps
              qu&apos;il faut.
            </p>
            <a
              href={`mailto:${site.email}`}
              className="btn btn-sun mt-7"
            >
              Demander un devis
            </a>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {audiences.map(([who, why]) => (
              <li key={who} className="brick-card p-6">
                <h3 className="text-xl font-semibold">{who}</h3>
                <p className="mt-2 text-slate-ink leading-relaxed">{why}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl md:text-5xl font-bold">
              Ce que disent les familles
            </h2>
            <a
              href={site.links.googleReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-brick-deep underline underline-offset-4"
            >
              Tous les avis sur Google
            </a>
          </div>
          <ul className="mt-10 columns-1 md:columns-2 lg:columns-3 gap-6 [&>li]:break-inside-avoid">
            {reviews.map((r) => (
              <li key={r.name} className="brick-card p-6 mb-6">
                <p className="text-slate-ink leading-relaxed">« {r.text} »</p>
                <p className="mt-4 display font-semibold text-ink-deep">{r.name}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <h2 className="text-3xl md:text-5xl font-bold">
            La presse en parle
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {press.map((p) => (
              <li key={p.outlet}>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-full flex-col bg-ink-deep rounded-2xl border border-white/15 p-6 transition-colors hover:border-sun"
                >
                  <span className="display text-sun font-semibold">{p.outlet}</span>
                  <span className="mt-2 text-xl font-semibold leading-snug">
                    {p.title}
                  </span>
                  <span className="mt-3 text-white/70 leading-relaxed">
                    « {p.quote} »
                  </span>
                  <span className="mt-auto pt-5 font-bold underline underline-offset-4">
                    Lire l&apos;article
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24 grid gap-10 md:grid-cols-2 items-start">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold">Nous contacter</h2>
            <p className="mt-4 text-lg text-slate-ink leading-relaxed">
              Une question, un besoin particulier ? Particulier, association,
              entreprise ou collectivité, nous répondons vite et faisons des
              devis sur mesure.
            </p>
          </div>
          <div className="brick-card p-7">
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
