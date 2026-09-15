import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Scale } from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false },
};

function Section({
  dotClassName,
  title,
  children,
}: {
  dotClassName: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center text-lg md:text-xl font-bold tracking-tight text-ink-deep">
        <span className={`mr-3 h-2.5 w-2.5 rounded-full ${dotClassName}`} />
        {title}
      </h2>
      <div className="space-y-2 pl-5 md:pl-6 leading-relaxed text-slate-ink">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <span className="shrink-0 font-bold text-ink-deep sm:w-48">{label} :</span>
      <span>{children}</span>
    </li>
  );
}

export default function LegalPage() {
  return (
    <article className="studs-sky py-14 md:py-20">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <div className="bg-paper rounded-[2rem] md:rounded-[2.5rem] border border-slate-ink/10 shadow-brick-sm p-8 md:p-12">
          <h1 className="flex items-center gap-3 text-3xl md:text-4xl font-bold tracking-tight">
            <Scale className="h-7 w-7 text-brick" />
            Mentions légales
          </h1>
          <p className="mt-2 text-slate-ink">Dernière mise à jour : septembre 2026</p>

          <div className="mt-8 space-y-8">
            <Section dotClassName="bg-brick" title="1. Propriétaire du site et responsable de la publication">
              <p>
                Le site internet <strong className="text-ink-deep">Set et Brique</strong> est la propriété de :
              </p>
              <ul className="space-y-2">
                <Field label="Raison sociale">
                  {site.legal.owner}, exploitant sous le nom commercial {site.legal.tradeName}
                </Field>
                <Field label="Forme juridique">{site.legal.form}</Field>
                <Field label="Siège social">{site.address}</Field>
                <Field label="Immatriculation">{site.legal.rcs}</Field>
                <Field label="Activité">
                  Location de sets de jeux de construction et achat-revente de
                  produits d&apos;occasion.
                </Field>
                <Field label="Téléphone">
                  <a href={site.phoneHref} className="font-semibold text-brick-deep hover:underline">
                    {site.phone}
                  </a>
                </Field>
                <Field label="E-mail">
                  <a href={`mailto:${site.email}`} className="font-semibold text-brick-deep hover:underline">
                    {site.email}
                  </a>
                </Field>
                <Field label="Responsable de la publication">{site.legal.owner}</Field>
              </ul>
            </Section>

            <hr className="border-slate-ink/10" />

            <Section dotClassName="bg-emerald-500" title="2. Conception et réalisation du site">
              <ul className="space-y-2">
                <Field label="Société">
                  <a
                    href={site.legal.builderSite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brick-deep hover:underline"
                  >
                    {site.legal.builder}
                  </a>
                </Field>
                <Field label="Contact">
                  <a href={`mailto:${site.legal.builderEmail}`} className="font-semibold text-brick-deep hover:underline">
                    {site.legal.builderEmail}
                  </a>
                </Field>
              </ul>
            </Section>

            <hr className="border-slate-ink/10" />

            <Section dotClassName="bg-ink" title="3. Hébergement">
              <ul className="space-y-2">
                <Field label="Hébergeur">Vercel Inc.</Field>
                <Field label="Adresse">440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis</Field>
                <Field label="Site web">
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brick-deep hover:underline"
                  >
                    vercel.com
                  </a>
                </Field>
              </ul>
            </Section>

            <hr className="border-slate-ink/10" />

            <Section dotClassName="bg-sun-deep" title="4. Propriété intellectuelle">
              <p>
                L&apos;ensemble du contenu de ce site (textes, images, logo,
                charte graphique, structure, code source) est la propriété
                exclusive de SET ET BRIQUE ou de leurs auteurs respectifs, et
                est protégé par le Code de la propriété intellectuelle. Toute
                reproduction, représentation, modification, publication ou
                adaptation de tout ou partie des éléments du site, quel que
                soit le moyen ou le procédé utilisé, est interdite sans
                autorisation écrite préalable.
              </p>
              <p>
                LEGO® et les marques associées appartiennent à The LEGO
                Group. SET ET BRIQUE est une entreprise indépendante, non
                affiliée à The LEGO Group, qui ne sponsorise ni
                n&apos;approuve ce site.
              </p>
            </Section>

            <hr className="border-slate-ink/10" />

            <Section dotClassName="bg-purple-500" title="5. Protection des données personnelles">
              <p>
                Les données personnelles collectées sur ce site (création de
                compte, réservation, prise de contact) sont utilisées
                uniquement pour gérer les locations et répondre à vos
                demandes. Elles ne sont jamais cédées à des tiers à des fins
                commerciales.
              </p>
              <p>
                Conformément au Règlement général sur la protection des
                données (RGPD, UE 2016/679) et à la loi Informatique et
                Libertés, vous disposez d&apos;un droit d&apos;accès, de
                rectification, de suppression, d&apos;opposition et de
                portabilité de vos données. Pour l&apos;exercer, écrivez à{" "}
                <a href={`mailto:${site.email}`} className="font-semibold text-brick-deep hover:underline">
                  {site.email}
                </a>
                . En cas de litige non résolu, vous pouvez saisir la CNIL
                (www.cnil.fr).
              </p>
            </Section>

            <hr className="border-slate-ink/10" />

            <Section dotClassName="bg-orange-400" title="6. Cookies">
              <p>
                Ce site ne dépose aucun cookie publicitaire ou de traçage.
                Des cookies techniques strictement nécessaires à son
                fonctionnement (session, connexion à votre compte) peuvent
                être utilisés sans consentement préalable.
              </p>
            </Section>

            <hr className="border-slate-ink/10" />

            <Section dotClassName="bg-slate-400" title="7. Liens hypertextes">
              <p>
                Ce site contient des liens vers des sites tiers (Vinted,
                Facebook, Instagram, presse). SET ET BRIQUE n&apos;exerce
                aucun contrôle sur ces sites et décline toute responsabilité
                quant à leur contenu.
              </p>
            </Section>

            <hr className="border-slate-ink/10" />

            <Section dotClassName="bg-brick/60" title="8. Limitation de responsabilité">
              <p>
                SET ET BRIQUE s&apos;efforce d&apos;assurer l&apos;exactitude
                et la mise à jour des informations diffusées sur ce site.
                L&apos;éditeur ne saurait toutefois être tenu responsable des
                erreurs ou omissions, d&apos;une indisponibilité des
                informations ou de la présence de virus sur le site.
              </p>
            </Section>

            <hr className="border-slate-ink/10" />

            <Section dotClassName="bg-ink-deep" title="9. Droit applicable">
              <p>
                Les présentes mentions légales sont régies par le droit
                français. En cas de litige, et après tentative de résolution
                amiable, compétence est attribuée aux tribunaux du ressort de
                Lorient.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </article>
  );
}
