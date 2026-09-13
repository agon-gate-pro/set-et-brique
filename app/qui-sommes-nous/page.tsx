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
            Qui sommes-nous ?
          </h1>

          <div className="mt-8 space-y-4 text-lg leading-relaxed text-slate-ink">
            <p>
              Bienvenue chez Set et Brique, une entreprise familiale
              chaleureuse et innovante basée à Lorient. Nous sommes Marion et
              Gaëtan, deux passionnés de briques de construction depuis notre
              plus tendre enfance. Cette passion, nous l&apos;avons
              redécouverte il y a quelques années et n&apos;avons pas tardé à
              la partager avec nos deux enfants.
            </p>

            <h2 className="!mt-10 text-2xl font-semibold text-ink-deep">
              Notre histoire
            </h2>
            <p>
              En replongeant dans l&apos;univers fascinant des briques de
              construction, nous avons réalisé que nos constructions
              prenaient beaucoup de place et que le coût d&apos;achat de
              nouveaux sets pouvait rapidement revenir onéreux. Pour continuer
              à assouvir notre passion sans nous ruiner, nous avons pensé à
              vendre nos sets une fois construits pour en acheter de
              nouveaux. Toutefois, cela nécessitait de conserver les boîtes
              intactes et d&apos;éviter que les sets ne soient détruits ou
              perdus par nos enfants.
            </p>
            <p>
              Le plaisir de construire était là, mais l&apos;idée
              d&apos;exposer nos créations ne nous séduisait pas
              particulièrement. C&apos;est alors que l&apos;idée de la
              location a émergé. Malheureusement, nous n&apos;avons trouvé
              aucun service local qui permettait cela.
            </p>

            <h2 className="!mt-10 text-2xl font-semibold text-ink-deep">
              Notre mission
            </h2>
            <p>
              En réfléchissant davantage, il nous est apparu que les sets de
              construction ne sont pas accessibles à toutes les familles en
              raison de leur coût et que bien qu&apos;extraordinaires, ils
              prennent énormément de place. Nous avons imaginé que
              d&apos;autres personnes pourraient également ressentir ce
              besoin de façon occasionnelle : que ce soit des patients
              d&apos;hôpitaux, des résidents de centres de rééducation, des
              maisons de retraite, ou encore des grands-parents accueillant
              leurs petits-enfants pendant les vacances.
            </p>

            <h2 className="!mt-10 text-2xl font-semibold text-ink-deep">
              Notre engagement
            </h2>
            <p>
              À la maison, nous adoptons un mode de consommation raisonné.
              Nous privilégions le seconde main, le fait maison et la
              réutilisation. C&apos;est dans cet esprit que la réutilisation
              des sets de construction prend tout son sens. En proposant un
              service de location à moindre coût, nous souhaitons rendre ces
              moments de créativité accessibles à tous, tout en favorisant
              une consommation responsable.
            </p>
            <p className="font-bold text-xl text-ink-deep">
              Rejoignez-nous dans cette aventure et redécouvrez le plaisir de
              construire ensemble, sans les contraintes financières ou
              d&apos;espace.
            </p>
            <p>
              Chez Set et Brique, la remise en main propre et le service
              local nous permettent de maintenir cet esprit de partage, de
              convivialité et du vivre ensemble qu&apos;apporte les briques de
              constructions.
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
