import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Qui sommes-nous",
  description:
    "Marion et Gaëtan, une famille de Lorient passionnée de briques de construction, à l'origine de Set et Brique.",
};

export default function AboutPage() {
  return (
    <article>
      <section className="studs border-b-[3px] border-ink">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <h1 className="text-4xl md:text-6xl font-bold">
            Une famille de Lorient, des bacs de briques plein le salon
          </h1>
          <p className="mt-5 text-xl leading-relaxed max-w-2xl">
            Nous sommes Marion et Gaëtan, passionnés de briques de
            construction depuis l&apos;enfance. Cette passion, nous l&apos;avons
            redécouverte il y a quelques années et vite partagée avec nos deux
            enfants.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24 grid gap-8 md:grid-cols-3">
        <section className="brick-card p-7">
          <h2 className="text-2xl font-semibold">Notre histoire</h2>
          <p className="mt-3 text-slate-ink leading-relaxed">
            En replongeant dans les briques, deux choses sont devenues
            évidentes : nos constructions prenaient beaucoup de place, et
            acheter de nouveaux sets revenait vite cher. Nous avons pensé
            revendre nos sets une fois montés, mais il fallait garder les
            boîtes intactes et éviter que les enfants ne les démontent ou
            perdent des pièces.
          </p>
          <p className="mt-3 text-slate-ink leading-relaxed">
            Le plaisir, c&apos;était de construire, pas d&apos;exposer.
            L&apos;idée de la location est venue de là. Aucun service local ne
            le proposait, alors nous l&apos;avons créé.
          </p>
        </section>

        <section className="brick-card p-7">
          <h2 className="text-2xl font-semibold">Notre mission</h2>
          <p className="mt-3 text-slate-ink leading-relaxed">
            Les grands sets ne sont pas accessibles à toutes les familles, à
            cause de leur prix et de la place qu&apos;ils prennent. Et beaucoup
            n&apos;en ont besoin que de temps en temps : des patients
            d&apos;hôpitaux, des résidents de centres de rééducation ou de
            maisons de retraite, des grands-parents qui accueillent les
            petits-enfants pendant les vacances.
          </p>
        </section>

        <section className="brick-card p-7">
          <h2 className="text-2xl font-semibold">Notre engagement</h2>
          <p className="mt-3 text-slate-ink leading-relaxed">
            À la maison, nous privilégions la seconde main, le fait maison et
            la réutilisation. Louer un set plutôt que l&apos;acheter, c&apos;est
            la même logique : des moments de créativité accessibles à tous, et
            une consommation plus raisonnée.
          </p>
          <p className="mt-3 text-slate-ink leading-relaxed">
            La remise en main propre garde à tout cela un esprit de partage et
            de convivialité, celui qu&apos;apportent les briques.
          </p>
        </section>
      </div>

      <div className="mx-auto max-w-6xl px-5 md:px-8 pb-16 md:pb-24">
        <Link href="/catalogue" className="btn btn-brick">
          Voir le catalogue
        </Link>
      </div>
    </article>
  );
}
