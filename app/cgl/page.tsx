import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions générales de location",
  robots: { index: false },
};

/**
 * Texte validé par la cliente (version du 7 octobre 2026), repris tel quel : c'est un document
 * contractuel, ses chiffres et ses coordonnées sont donc écrits en dur, pas tirés de `lib/site.ts`
 * ni de la base. Toute modification du texte vient d'elle.
 */

const linkClass = "font-semibold text-brick-deep hover:underline";

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
    <section id={`article-${number}`} className="space-y-4 scroll-mt-24">
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

function Scale({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-ink/15">
      <table className="w-full text-left text-sm">
        <thead className="bg-sky text-ink-deep">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-bold">{head[0]}</th>
            <th scope="col" className="px-4 py-2.5 font-bold">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-t border-slate-ink/10">
              <td className="px-4 py-2.5">{label}</td>
              <td className="px-4 py-2.5 font-semibold text-ink-deep">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Separator = () => <hr className="border-slate-ink/10" />;

export default function RentalTermsPage() {
  return (
    <article className="studs-sky py-14 md:py-20">
      <div className="mx-auto max-w-4xl px-5 md:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-brick/20 bg-brick/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-brick-deep">
          <FileText className="h-4 w-4" />
          Document contractuel
        </span>
        <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-tight tracking-tight">
          Conditions générales
          <br className="hidden sm:block" /> de location
        </h1>
        <p className="mt-4 text-lg text-slate-ink">
          Version du <strong className="text-ink-deep">7 octobre 2026</strong>
        </p>
        <div className="mt-6 flex items-center gap-3">
          <span className="block h-1 w-12 rounded-full bg-brick" />
          <span className="block h-1 w-4 rounded-full bg-sun-deep" />
          <span className="block h-1 w-2 rounded-full bg-ink-deep/30" />
        </div>

        <div className="mt-10 md:mt-14 bg-paper rounded-[2.5rem] border border-slate-ink/10 shadow-brick-sm overflow-hidden">
          <div className="bg-gradient-to-r from-ink-deep to-ink px-8 md:px-14 py-8 md:py-10">
            <p className="text-white/90 leading-relaxed">
              Les présentes conditions encadrent les locations de sets de briques de construction
              commandées sur le site de <strong className="text-white">Set et Brique</strong>. Elles
              précisent les étapes de réservation, les modalités de remise et de retour, le prix, la
              garantie bancaire et les sommes dues en cas d’incident.
            </p>
          </div>

          <div className="p-8 md:p-14 space-y-10 md:space-y-12">
            <Article number={1} title="Identité du loueur">
              <p>
                Marion Kerbrat, nom d’usage Lange-Berteaux, exerce sous le nom commercial Set et
                Brique en qualité d’entrepreneuse individuelle. Son établissement se situe au 73
                boulevard René Laënnec, 56100 Lorient.
              </p>
              <ul className="rounded-xl border border-slate-ink/10 bg-sky p-3 text-sm space-y-0.5">
                <li>SIREN : 535 372 221</li>
                <li>SIRET : 535 372 221 00064</li>
                <li>RCS Lorient : 535 372 221</li>
              </ul>
              <p>
                Contact :{" "}
                <a href="tel:+33984371846" className={linkClass}>
                  09 84 37 18 46
                </a>{" "}
                ;{" "}
                <a href="mailto:setetbrique@gmail.com" className={linkClass}>
                  setetbrique@gmail.com
                </a>
              </p>
            </Article>

            <Separator />

            <Article number={2} title="Objet et personnes concernées">
              <p>
                Ces conditions s’appliquent aux locations conclues avec les particuliers,
                entreprises, associations, collectivités et autres personnes qui commandent sur le
                site. Seule une personne majeure peut commander. Une personne qui commande pour une
                organisation déclare être habilitée à l’engager.
              </p>
              <p>
                Chaque contrat porte sur un set. Pour louer plusieurs sets en même temps, le client
                effectue une réservation distincte pour chacun.
              </p>
            </Article>

            <Separator />

            <Article number={3} title="Description et propriété des sets">
              <p>
                La fiche de chaque set présente ses caractéristiques, son prix journalier et le
                montant de sa garantie. Set et Brique remet un set vérifié et complet, dans un
                contenant à son nom, avec la notice et les figurines prévues. L’inventaire de la
                notice sert de référence au comptage des pièces.
              </p>
              <p>
                La location donne au client un droit temporaire d’utilisation. Set et Brique
                conserve la propriété du set, de ses pièces et de ses accessoires.
              </p>
            </Article>

            <Separator />

            <Article number={4} title="Demande et confirmation de réservation">
              <p>
                Le client choisit le set, les dates souhaitées et un point de remise parmi ceux
                proposés sur le site. Cette démarche constitue une demande de réservation et ne
                garantit pas la disponibilité du set.
              </p>
              <p>
                Set et Brique vérifie manuellement chaque demande. Elle confirme la disponibilité,
                refuse la demande ou propose d’autres dates. Après une réponse favorable, le client
                paie le prix de location et autorise la garantie bancaire indiquée pour le set. La
                réservation devient définitive après validation du paiement et envoi de la
                confirmation par Set et Brique.
              </p>
              <p>
                Le client peut vérifier et corriger sa commande avant de payer. Set et Brique lui
                transmet une confirmation par e-mail, avec les informations contractuelles qu’il
                peut conserver.
              </p>
            </Article>

            <Separator />

            <Article number={5} title="Durée et prix">
              <p>
                La durée minimale est d’un jour. Aucune durée maximale n’est fixée. Le client
                indique les dates qu’il souhaite et Set et Brique confirme la période de location.
              </p>
              <p>
                Le prix est de 2 € par jour et par set. Le site affiche le montant total à payer
                avant la validation de la commande. La location commence lors de la remise en main
                propre et se termine à la date et à l’heure de restitution convenues avec le client.
              </p>
            </Article>

            <Separator />

            <Article number={6} title="Paiement et garantie bancaire">
              <p>
                Le client paie la totalité du prix de location sur le site après acceptation de sa
                demande. Chaque set comporte un montant de garantie propre, affiché avant le
                paiement. Set et Brique demande cette garantie par empreinte bancaire gérée par
                Stripe. Cette empreinte est distincte du paiement du prix de location.
              </p>
              <p>
                La garantie sert à couvrir les sommes dues en application des présentes conditions.
                Set et Brique indique au client le motif et le calcul de toute somme qu’elle
                prélève. Elle contrôle le set dans les 48 heures suivant sa restitution et demande
                la libération de la partie non utilisée de la garantie dans ce délai. L’affichage
                effectif des fonds dépend ensuite de la banque du client.
              </p>
            </Article>

            <Separator />

            <Article number={7} title="Remise et restitution">
              <p>
                La remise et la restitution ont lieu en main propre. Le client choisit parmi les
                cinq points proposés sur le site dans les secteurs de Lanester, Guidel, Brec’h,
                Lorient et Plouay. Set et Brique et le client fixent le point exact, la date et
                l’heure du rendez-vous par e-mail ou par téléphone.
              </p>
              <p>
                Le client rend le set au même point que celui où il l’a reçu, à la date et à l’heure
                convenues. S’il constate une pièce manquante pendant la location, il en informe Set
                et Brique dès qu’il s’en aperçoit, par téléphone ou par e-mail. Set et Brique
                examine ce signalement avant toute retenue liée à cette pièce.
              </p>
            </Article>

            <Separator />

            <Article number={8} title="Utilisation et état au retour">
              <p>
                Le client utilise le set conformément à sa destination et à sa notice. Il respecte
                les indications d’âge et de sécurité et surveille les enfants qui l’utilisent. Il
                conserve les pièces, figurines, notices et accessoires remis. Il ne peut vendre,
                sous-louer ou céder le set à un tiers.
              </p>
              <p>
                Les sets comportent de petites pièces. Le client empêche leur mise à la bouche et
                les tient hors de portée des enfants auxquels le set n’est pas destiné. Il signale
                sans délai toute anomalie présentant un risque pour la santé ou la sécurité. Set et
                Brique ne répond pas des dommages, notamment en cas d’ingestion, d’étouffement ou de
                maladie, causés exclusivement par une utilisation contraire aux consignes ou un
                défaut de surveillance imputable au client, sous réserve des responsabilités que la
                loi interdit d’exclure.
              </p>
              <p>
                Le client restitue le set démonté, trié et nettoyé, avec son contenant, sa notice,
                ses figurines et les autres éléments reçus. Si Set et Brique doit effectuer le
                démontage, le tri ou le nettoyage à sa place, elle retient un forfait de 15 € sur la
                garantie.
              </p>
            </Article>

            <Separator />

            <Article number={9} title="Prolongation">
              <p>
                Le client peut demander une prolongation pendant sa location. Set et Brique examine
                manuellement sa demande selon la disponibilité du set. Sans son accord, la date et
                l’heure de restitution initiales restent applicables.
              </p>
              <p>
                Si Set et Brique accepte la prolongation, le client paie 2 € par jour supplémentaire
                sur le site et autorise, si nécessaire, la garantie liée à cette prolongation. Aucun
                nouveau rendez-vous de remise n’est nécessaire.
              </p>
            </Article>

            <Separator />

            <Article number={10} title="Retard et absence de restitution">
              <p>
                Si le client prévoit un retard, il contacte Set et Brique sans attendre. Set et
                Brique peut accepter une prolongation ou tenir compte des circonstances expliquées
                par le client. Cette décision dépend notamment de la disponibilité du set.
              </p>
              <p>
                Si le set n’est pas rendu, Set et Brique adresse des rappels à J−1, J, J+1 et J+2, J
                désignant la date de restitution convenue. Le barème de Set et Brique prévoit un
                forfait de 30 € à J+1 pour le jour de retard.
              </p>
              <p>
                À J+2, si le client n’a ni rendu le set ni donné de nouvelles, Set et Brique prélève
                la totalité de la garantie encore disponible. Elle peut arrêter cette procédure si
                un échange avec le client permet de traiter le retard. Si le set est rendu ensuite,
                Set et Brique établit le décompte des sommes dues et rembourse le solde éventuel. Si
                le set n’est pas restitué, elle applique l’article 11.
              </p>
              <p>
                Si ce retard empêche une location ultérieure, Set et Brique avertit le client
                suivant par e-mail et par téléphone. Ce client choisit entre un avoir et le
                remboursement de sa location.
              </p>
            </Article>

            <Separator />

            <Article number={11} title="Pertes et accessoires manquants">
              <p>
                Après la restitution, Set et Brique compte les pièces par rapport à l’inventaire
                figurant dans la notice. Elle communique au client le résultat du contrôle et le
                détail des sommes retenues. Les figurines et la notice sont évaluées séparément des
                autres pièces.
              </p>
              <Scale
                head={["Part des pièces manquantes", "Retenue prévue"]}
                rows={[
                  ["Jusqu’à 5 % inclus", "0 €"],
                  ["Plus de 5 % et jusqu’à 10 % inclus", "10 €"],
                  ["Plus de 10 % et jusqu’à 15 % inclus", "30 €"],
                  ["Plus de 15 % et jusqu’à 20 % inclus", "50 €"],
                  ["Plus de 20 %", "Prix total du set sur BrickLink"],
                ]}
              />
              <p>
                Lorsque plus de 20 % des pièces manquent, Set et Brique retient le prix total d’un
                set dans un état au moins comparable, sur www.bricklink.com. Le prix d’une figurine
                ou d’une notice manquante est déterminé séparément à partir de ce même site, pour un
                élément dans un état au moins comparable.
              </p>
              <p>
                En cas de non-restitution du set, Set et Brique réclame sa valeur déterminée selon
                la même référence. Elle communique au client la référence consultée et le montant
                retenu.
              </p>
            </Article>

            <Separator />

            <Article number={12} title="Annulation par le client">
              <p>
                Sous réserve du droit légal de rétractation prévu à l’article 14, le client peut
                annuler une réservation confirmée selon le barème suivant. Le client adresse sa
                demande par e-mail ou par le moyen indiqué sur le site.
              </p>
              <Scale
                head={["Délai avant la remise prévue", "Part du prix de location conservée"]}
                rows={[
                  ["Au moins 7 jours", "0 %"],
                  ["Moins de 7 jours et plus de 48 heures", "50 %"],
                  ["48 heures ou moins", "100 %"],
                ]}
              />
              <p>Ce barème porte sur le prix de la location, hors garantie bancaire.</p>
            </Article>

            <Separator />

            <Article number={13} title="Indisponibilité du set">
              <p>
                Si Set et Brique ne peut pas fournir un set à la date confirmée, elle informe le
                client. Elle peut proposer une autre date, un autre set disponible ou un avoir. Le
                client peut demander le remboursement de la location non exécutée.
              </p>
            </Article>

            <Separator />

            <Article number={14} title="Droit de rétractation du consommateur">
              <p>
                Le client consommateur dispose en principe de 14 jours à compter de la conclusion du
                contrat en ligne pour se rétracter sans donner de motif. Il informe Set et Brique
                par une déclaration claire envoyée à l’adresse postale ou électronique indiquée à
                l’article 1, ou grâce à la fonctionnalité de rétractation disponible sur le site.
              </p>
              <p>
                Si le consommateur souhaite que sa location commence pendant ce délai, Set et Brique
                recueille auparavant sa demande expresse. S’il se rétracte après le début de la
                location, il paie la part du service déjà exécutée, dans les conditions prévues par
                la loi, puis organise le retour du set avec Set et Brique.
              </p>
              <p>
                Set et Brique rembourse les sommes dues dans les délais légaux, par le moyen de
                paiement initial, sauf accord exprès sur un autre moyen sans frais. Le barème
                d’annulation de l’article 12 ne supprime pas le droit légal de rétractation. Le seul
                fait de commander sur le site ne donne pas aux clients professionnels le droit de
                rétractation réservé aux consommateurs.
              </p>
            </Article>

            <Separator />

            <Article number={15} title="Bons cadeaux et avoirs">
              <p>
                Set et Brique propose des bons cadeaux de 10 €, 20 € et 30 €, valables un an. La
                personne qui détient le code peut l’utiliser pour une location. Elle saisit le code
                avant paiement ; sa valeur est déduite du prix. Si le prix est supérieur, elle règle
                le complément par carte. Le bon ne dispense pas de la garantie bancaire du set.
              </p>
              <p>
                Chaque bon cadeau ne peut être utilisé qu’une fois. Le solde non utilisé après cette
                utilisation est perdu. Un bon non utilisé n’est pas remboursé, sous réserve des
                droits légaux de son acheteur.
              </p>
              <p>
                Set et Brique peut également émettre un avoir. Elle communique ses modalités
                d’utilisation au client. L’avoir ne remplace pas un remboursement auquel le client a
                droit sans son accord.
              </p>
            </Article>

            <Separator />

            <Article number={16} title="Réclamations et médiation">
              <p>
                Le client adresse ses réclamations à{" "}
                <a href="mailto:setetbrique@gmail.com" className={linkClass}>
                  setetbrique@gmail.com
                </a>{" "}
                ou par courrier à Set et Brique, 73 boulevard René Laënnec, 56100 Lorient. Il
                indique son numéro de réservation et les faits concernés.
              </p>
              <p>
                Après une réclamation écrite restée sans solution, le client consommateur peut
                saisir gratuitement le médiateur de la consommation compétent : le Médiateur des
                entreprises, via le lien{" "}
                <a
                  href="https://demarche.numerique.gouv.fr/commencer/mediateur-des-entreprises-contacter-le-mediateur"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} break-all`}
                >
                  demarche.numerique.gouv.fr/commencer/mediateur-des-entreprises-contacter-le-mediateur
                </a>
                . Il conserve le droit de saisir une juridiction compétente.
              </p>
            </Article>

            <Separator />

            <Article number={17} title="Droit applicable et évolution des conditions">
              <p>
                Le droit français régit les présentes conditions. Les juridictions compétentes sont
                déterminées par les règles applicables au litige. Set et Brique peut modifier ces
                conditions pour les commandes futures. La version applicable à une location est
                celle que le client a acceptée lors de sa commande.
              </p>
            </Article>
          </div>
        </div>
      </div>
    </article>
  );
}
