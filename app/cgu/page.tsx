import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 md:px-8 py-14 md:py-20 prose-legal">
      <h1 className="text-4xl md:text-5xl font-bold">
        Conditions générales d&apos;utilisation
      </h1>
      <p className="mt-3 text-slate-ink">Dernière mise à jour : septembre 2026</p>
      <p>
        Les présentes conditions générales d&apos;utilisation (CGU) régissent
        l&apos;accès et l&apos;utilisation du site set-et-brique.com (« le
        Site »), édité par SET ET BRIQUE. En consultant ce site, vous acceptez
        les présentes CGU dans leur intégralité.
      </p>

      <h2>1. Objet du site</h2>
      <p>
        Le Site présente l&apos;activité de SET ET BRIQUE, spécialisée dans la
        location de sets de jeux de construction et la vente de pièces et sets
        d&apos;occasion. Il permet de consulter le catalogue et, lorsque cette
        fonctionnalité est ouverte, de réserver un set en ligne. La vente
        d&apos;occasion se fait sur la boutique Vinted de l&apos;entreprise,
        soumise aux conditions de Vinted.
      </p>

      <h2>2. Accès au site</h2>
      <p>
        Le Site est accessible gratuitement à tout utilisateur disposant
        d&apos;un accès à Internet. Les coûts liés à cet accès (matériel,
        logiciels, connexion) sont à la charge de l&apos;utilisateur. SET ET
        BRIQUE peut suspendre ou limiter l&apos;accès à tout ou partie du Site,
        notamment pour maintenance, sans que cela n&apos;ouvre droit à une
        indemnité.
      </p>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments composant le Site (textes, photographies,
        images, logo, charte graphique, structure et code source) est la
        propriété exclusive de SET ET BRIQUE ou de leurs auteurs respectifs.
        Toute reproduction, représentation, adaptation ou transmission, totale
        ou partielle, est interdite sans autorisation écrite préalable.
      </p>
      <p>
        Les marques LEGO® et toute image de produit LEGO® appartiennent à The
        LEGO Group. SET ET BRIQUE est une entreprise indépendante, ni affiliée,
        ni partenaire, ni sponsorisée par The LEGO Group.
      </p>

      <h2>4. Responsabilité de l&apos;utilisateur</h2>
      <p>L&apos;utilisateur s&apos;engage à :</p>
      <ul>
        <li>utiliser le Site à des fins licites et conformes aux présentes CGU ;</li>
        <li>
          ne pas porter atteinte à son fonctionnement (attaques, virus,
          extraction automatisée abusive) ;
        </li>
        <li>ne pas diffuser d&apos;informations fausses ou trompeuses concernant SET ET BRIQUE ;</li>
        <li>respecter les droits de propriété intellectuelle mentionnés à l&apos;article 3.</li>
      </ul>

      <h2>5. Limitation de responsabilité de l&apos;éditeur</h2>
      <p>
        SET ET BRIQUE s&apos;efforce de maintenir les informations du Site
        exactes et à jour, sans garantir leur exhaustivité. L&apos;éditeur
        décline toute responsabilité pour les erreurs ou omissions, les
        interruptions du Site, les dommages résultant de son utilisation et le
        contenu des sites tiers accessibles par lien.
      </p>

      <h2>6. Liens vers des sites tiers</h2>
      <p>
        Le Site contient des liens vers Poppins, Vinted, Facebook, Instagram et
        des articles de presse. SET ET BRIQUE n&apos;exerce aucun contrôle sur
        ces plateformes et n&apos;est pas responsable de leur contenu ni de
        leurs pratiques en matière de données personnelles.
      </p>

      <h2>7. Données personnelles et cookies</h2>
      <p>
        Les données personnelles traitées sont celles nécessaires à la gestion
        des réservations et aux réponses à vos demandes. Elles ne sont jamais
        transmises à des tiers à des fins commerciales. Conformément au RGPD et
        à la loi Informatique et Libertés, vous disposez de droits
        d&apos;accès, de rectification, d&apos;effacement, d&apos;opposition,
        de portabilité et de limitation. Pour les exercer, écrivez à{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a>. Vous pouvez saisir la
        CNIL en cas de litige non résolu.
      </p>
      <p>
        Le Site n&apos;utilise pas de cookies publicitaires ou de traçage. Des
        cookies techniques strictement nécessaires peuvent être déposés sans
        consentement préalable.
      </p>

      <h2>8. Modification des CGU</h2>
      <p>
        SET ET BRIQUE peut modifier les présentes CGU à tout moment. Les
        modifications prennent effet dès leur publication sur le Site.
      </p>

      <h2>9. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. En cas de litige, et
        après tentative de résolution amiable, compétence est attribuée aux
        tribunaux du ressort de Lorient.
      </p>

      <h2>10. Contact</h2>
      <p>
        <a href={`mailto:${site.email}`}>{site.email}</a> ·{" "}
        <a href={site.phoneHref}>{site.phone}</a> · {site.address}
      </p>
    </article>
  );
}
