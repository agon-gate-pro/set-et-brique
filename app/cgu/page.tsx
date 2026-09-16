import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  robots: { index: false },
};

function Article({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center text-xl md:text-2xl font-bold tracking-tight text-ink-deep">
        <span className="mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brick text-sm font-bold text-white">
          {number}
        </span>
        {title}
      </h2>
      <div className="space-y-3 pl-12 leading-relaxed text-slate-ink">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <article className="studs-sky py-14 md:py-20">
      <div className="mx-auto max-w-4xl px-5 md:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-brick/20 bg-brick/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-brick-deep">
          <FileText className="h-4 w-4" />
          Document légal
        </span>
        <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-tight tracking-tight">
          Conditions générales
          <br className="hidden sm:block" /> d&apos;utilisation
        </h1>
        <p className="mt-4 text-lg text-slate-ink">
          Dernière mise à jour : <strong className="text-ink-deep">septembre 2026</strong>
        </p>
        <div className="mt-6 flex items-center gap-3">
          <span className="block h-1 w-12 rounded-full bg-brick" />
          <span className="block h-1 w-4 rounded-full bg-sun-deep" />
          <span className="block h-1 w-2 rounded-full bg-ink-deep/30" />
        </div>

        <div className="mt-10 md:mt-14 bg-paper rounded-[2.5rem] border border-slate-ink/10 shadow-brick-sm overflow-hidden">
          <div className="bg-gradient-to-r from-ink-deep to-ink px-8 md:px-14 py-8 md:py-10">
            <p className="text-white/90 leading-relaxed">
              Les présentes conditions générales d&apos;utilisation (CGU)
              régissent l&apos;accès et l&apos;utilisation du site
              set-et-brique.com (« le Site »), édité par{" "}
              <strong className="text-white">SET ET BRIQUE</strong>. En
              consultant ce site, vous acceptez les présentes CGU dans leur
              intégralité.
            </p>
          </div>

          <div className="p-8 md:p-14 space-y-10 md:space-y-12">
            <Article number={1} title="Objet du site">
              <p>
                Le Site présente l&apos;activité de SET ET BRIQUE,
                spécialisée dans la location de sets de jeux de construction
                et la vente de pièces et sets d&apos;occasion. Il permet de
                consulter le catalogue et, lorsque cette fonctionnalité est
                ouverte, de réserver un set en ligne. La vente d&apos;occasion
                se fait sur la boutique Vinted de l&apos;entreprise, soumise
                aux conditions de Vinted.
              </p>
            </Article>

            <hr className="border-slate-ink/10" />

            <Article number={2} title="Accès au site">
              <p>
                Le Site est accessible gratuitement à tout utilisateur
                disposant d&apos;un accès à Internet. Les coûts liés à cet
                accès (matériel, logiciels, connexion) sont à la charge de
                l&apos;utilisateur. SET ET BRIQUE peut suspendre ou limiter
                l&apos;accès à tout ou partie du Site, notamment pour
                maintenance, sans que cela n&apos;ouvre droit à une
                indemnité.
              </p>
            </Article>

            <hr className="border-slate-ink/10" />

            <Article number={3} title="Propriété intellectuelle">
              <p>
                L&apos;ensemble des éléments composant le Site (textes,
                photographies, images, logo, charte graphique, structure et
                code source) est la propriété exclusive de SET ET BRIQUE ou
                de leurs auteurs respectifs. Toute reproduction,
                représentation, adaptation ou transmission, totale ou
                partielle, est interdite sans autorisation écrite préalable.
              </p>
              <p className="rounded-xl border border-slate-ink/10 bg-sky p-3 text-sm">
                Les marques LEGO® et toute image de produit LEGO®
                appartiennent à The LEGO Group. SET ET BRIQUE est une
                entreprise indépendante, ni affiliée, ni partenaire, ni
                sponsorisée par The LEGO Group.
              </p>
            </Article>

            <hr className="border-slate-ink/10" />

            <Article number={4} title="Responsabilité de l'utilisateur">
              <p>L&apos;utilisateur s&apos;engage à :</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>utiliser le Site à des fins licites et conformes aux présentes CGU ;</li>
                <li>
                  ne pas porter atteinte à son fonctionnement (attaques,
                  virus, extraction automatisée abusive) ;
                </li>
                <li>ne pas diffuser d&apos;informations fausses ou trompeuses concernant SET ET BRIQUE ;</li>
                <li>respecter les droits de propriété intellectuelle mentionnés à l&apos;article 3.</li>
              </ul>
            </Article>

            <hr className="border-slate-ink/10" />

            <Article number={5} title="Limitation de responsabilité de l'éditeur">
              <p>
                SET ET BRIQUE s&apos;efforce de maintenir les informations du
                Site exactes et à jour, sans garantir leur exhaustivité.
                L&apos;éditeur décline toute responsabilité pour les erreurs
                ou omissions, les interruptions du Site, les dommages
                résultant de son utilisation et le contenu des sites tiers
                accessibles par lien.
              </p>
            </Article>

            <hr className="border-slate-ink/10" />

            <Article number={6} title="Liens vers des sites tiers">
              <p>
                Le Site contient des liens vers Vinted, Facebook, Instagram
                et des articles de presse. SET ET BRIQUE n&apos;exerce aucun
                contrôle sur ces plateformes et n&apos;est pas responsable de
                leur contenu ni de leurs pratiques en matière de données
                personnelles.
              </p>
            </Article>

            <hr className="border-slate-ink/10" />

            <Article number={7} title="Données personnelles et cookies">
              <p>
                Les données personnelles traitées sont celles nécessaires à
                la gestion des réservations et aux réponses à vos demandes.
                Elles ne sont jamais transmises à des tiers à des fins
                commerciales. Conformément au RGPD et à la loi Informatique
                et Libertés, vous disposez de droits d&apos;accès, de
                rectification, d&apos;effacement, d&apos;opposition, de
                portabilité et de limitation. Pour les exercer, écrivez à{" "}
                <a href={`mailto:${site.email}`} className="font-semibold text-brick-deep hover:underline">
                  {site.email}
                </a>
                . Vous pouvez saisir la CNIL en cas de litige non résolu.
              </p>
              <p>
                Le Site n&apos;utilise pas de cookies publicitaires ou de
                traçage. Des cookies techniques strictement nécessaires
                peuvent être déposés sans consentement préalable.
              </p>
            </Article>

            <hr className="border-slate-ink/10" />

            <Article number={8} title="Modification des CGU">
              <p>
                SET ET BRIQUE peut modifier les présentes CGU à tout moment.
                Les modifications prennent effet dès leur publication sur le
                Site.
              </p>
            </Article>

            <hr className="border-slate-ink/10" />

            <Article number={9} title="Droit applicable">
              <p>
                Les présentes CGU sont soumises au droit français. En cas de
                litige, et après tentative de résolution amiable, compétence
                est attribuée aux tribunaux du ressort de Lorient.
              </p>
            </Article>

            <hr className="border-slate-ink/10" />

            <Article number={10} title="Contact">
              <p>
                <a href={`mailto:${site.email}`} className="font-semibold text-brick-deep hover:underline">
                  {site.email}
                </a>{" "}
                ·{" "}
                <a href={site.phoneHref} className="font-semibold text-brick-deep hover:underline">
                  {site.phone}
                </a>{" "}
                · {site.address}
              </p>
            </Article>
          </div>
        </div>
      </div>
    </article>
  );
}
