import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false },
};

export default function LegalPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 md:px-8 py-14 md:py-20 prose-legal">
      <h1 className="text-4xl md:text-5xl font-bold">Mentions légales</h1>
      <p className="mt-3 text-slate-ink">Dernière mise à jour : septembre 2026</p>

      <h2>1. Propriétaire du site et responsable de la publication</h2>
      <dl>
        <dt>Raison sociale</dt>
        <dd>
          {site.legal.owner}, exploitant sous le nom commercial{" "}
          {site.legal.tradeName}
        </dd>
        <dt>Forme juridique</dt>
        <dd>{site.legal.form}</dd>
        <dt>Siège social</dt>
        <dd>{site.address}</dd>
        <dt>Immatriculation</dt>
        <dd>{site.legal.rcs}</dd>
        <dt>Activité</dt>
        <dd>
          Location de sets de jeux de construction et achat-revente de
          produits d&apos;occasion.
        </dd>
        <dt>Téléphone</dt>
        <dd>
          <a href={site.phoneHref}>{site.phone}</a>
        </dd>
        <dt>E-mail</dt>
        <dd>
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </dd>
        <dt>Responsable de la publication</dt>
        <dd>{site.legal.owner}</dd>
      </dl>

      <h2>2. Conception et réalisation du site</h2>
      <dl>
        <dt>Société</dt>
        <dd>
          <a href={site.legal.builderSite} target="_blank" rel="noopener noreferrer">
            {site.legal.builder}
          </a>
        </dd>
        <dt>Contact</dt>
        <dd>
          <a href={`mailto:${site.legal.builderEmail}`}>{site.legal.builderEmail}</a>
        </dd>
      </dl>

      <h2>3. Hébergement</h2>
      <dl>
        <dt>Hébergeur</dt>
        <dd>Vercel Inc.</dd>
        <dt>Adresse</dt>
        <dd>440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis</dd>
        <dt>Site web</dt>
        <dd>
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
        </dd>
      </dl>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble du contenu de ce site (textes, images, logo, charte
        graphique, structure, code source) est la propriété exclusive de SET ET
        BRIQUE ou de leurs auteurs respectifs, et est protégé par le Code de la
        propriété intellectuelle. Toute reproduction, représentation,
        modification, publication ou adaptation de tout ou partie des éléments
        du site, quel que soit le moyen ou le procédé utilisé, est interdite
        sans autorisation écrite préalable.
      </p>
      <p>
        LEGO® et les marques associées appartiennent à The LEGO Group. SET ET
        BRIQUE est une entreprise indépendante, non affiliée à The LEGO Group,
        qui ne sponsorise ni n&apos;approuve ce site.
      </p>

      <h2>5. Protection des données personnelles</h2>
      <p>
        Les données personnelles collectées sur ce site (création de compte,
        réservation, prise de contact) sont utilisées uniquement pour gérer
        les locations et répondre à vos demandes. Elles ne sont jamais cédées à
        des tiers à des fins commerciales.
      </p>
      <p>
        Conformément au Règlement général sur la protection des données (RGPD,
        UE 2016/679) et à la loi Informatique et Libertés, vous disposez
        d&apos;un droit d&apos;accès, de rectification, de suppression,
        d&apos;opposition et de portabilité de vos données. Pour l&apos;exercer,
        écrivez à <a href={`mailto:${site.email}`}>{site.email}</a>. En cas de
        litige non résolu, vous pouvez saisir la CNIL (www.cnil.fr).
      </p>

      <h2>6. Cookies</h2>
      <p>
        Ce site ne dépose aucun cookie publicitaire ou de traçage. Des cookies
        techniques strictement nécessaires à son fonctionnement (session,
        connexion à votre compte) peuvent être utilisés sans consentement
        préalable.
      </p>

      <h2>7. Liens hypertextes</h2>
      <p>
        Ce site contient des liens vers des sites tiers (Poppins, Vinted,
        Facebook, Instagram, presse). SET ET BRIQUE n&apos;exerce aucun contrôle
        sur ces sites et décline toute responsabilité quant à leur contenu.
      </p>

      <h2>8. Limitation de responsabilité</h2>
      <p>
        SET ET BRIQUE s&apos;efforce d&apos;assurer l&apos;exactitude et la mise
        à jour des informations diffusées sur ce site. L&apos;éditeur ne saurait
        toutefois être tenu responsable des erreurs ou omissions, d&apos;une
        indisponibilité des informations ou de la présence de virus sur le site.
      </p>

      <h2>9. Droit applicable</h2>
      <p>
        Les présentes mentions légales sont régies par le droit français. En cas
        de litige, et après tentative de résolution amiable, compétence est
        attribuée aux tribunaux du ressort de Lorient.
      </p>
    </article>
  );
}
