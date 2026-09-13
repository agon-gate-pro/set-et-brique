import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Qui sommes-nous",
  description:
    "Marion et Gaëtan, une famille de Lorient passionnée de briques de construction, à l'origine de Set et Brique.",
};

export default function AboutPage() {
  return (
    <article className="studs-sky py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-5 md:px-8">
        <div className="bg-paper rounded-[2rem] md:rounded-[2.5rem] border border-slate-ink/10 shadow-brick-sm p-8 md:p-14">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Une famille de Lorient, des bacs de briques plein le salon
          </h1>

          <div className="mt-8 space-y-4 text-lg leading-relaxed text-slate-ink">
            <p>
              Nous sommes Marion et Gaëtan, passionnés de briques de
              construction depuis l&apos;enfance. Cette passion, nous
              l&apos;avons redécouverte il y a quelques années et vite
              partagée avec nos deux enfants.
            </p>

            <h2 className="!mt-10 text-2xl font-semibold text-ink-deep">
              Notre histoire
            </h2>
            <p>
              En replongeant dans les briques, deux choses sont devenues
              évidentes : nos constructions prenaient beaucoup de place, et
              acheter de nouveaux sets revenait vite cher. Nous avons pensé
              revendre nos sets une fois montés, mais il fallait garder les
              boîtes intactes et éviter que les enfants ne les démontent ou
              perdent des pièces.
            </p>
            <p>
              Le plaisir, c&apos;était de construire, pas d&apos;exposer.
              L&apos;idée de la location est venue de là. Aucun service local
              ne le proposait, alors nous l&apos;avons créé.
            </p>

            <h2 className="!mt-10 text-2xl font-semibold text-ink-deep">
              Notre mission
            </h2>
            <p>
              Les grands sets ne sont pas accessibles à toutes les familles, à
              cause de leur prix et de la place qu&apos;ils prennent. Et
              beaucoup n&apos;en ont besoin que de temps en temps : des
              patients d&apos;hôpitaux, des résidents de centres de
              rééducation ou de maisons de retraite, des grands-parents qui
              accueillent les petits-enfants pendant les vacances.
            </p>

            <h2 className="!mt-10 text-2xl font-semibold text-ink-deep">
              Notre engagement
            </h2>
            <p>
              À la maison, nous privilégions la seconde main, le fait maison
              et la réutilisation. Louer un set plutôt que l&apos;acheter,
              c&apos;est la même logique : des moments de créativité
              accessibles à tous, et une consommation plus raisonnée.
            </p>
            <p>
              La remise en main propre garde à tout cela un esprit de partage
              et de convivialité, celui qu&apos;apportent les briques.
            </p>
          </div>

          <div className="mt-12 flex justify-center">
            <Link href="/catalogue" className="btn btn-brick">
              <BookOpen className="h-5 w-5" />
              Voir le catalogue
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
