export const site = {
  name: "Set et Brique",
  tagline: "Location de sets de briques à Lorient",
  /**
   * Adresse publique du site : liens des e-mails, QR code des bons cadeaux imprimés, retours de
   * Stripe quand l'origine de la requête manque. `NEXT_PUBLIC_SITE_URL` la fixe par environnement
   * (`https://set-et-brique.com` en production une fois le domaine basculé, voir la check-list de
   * mise en production dans `docs/AVANCEMENT.md`) ; à défaut, l'alias Vercel de la démo.
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://set-et-brique.vercel.app").replace(/\/$/, ""),
  description:
    "Louez, construisez, rapportez. Set et Brique loue de grands sets de briques de construction aux familles, écoles et structures du pays de Lorient.",
  phone: "07 83 73 70 20",
  phoneHref: "tel:+33783737020",
  email: "setetbrique@gmail.com",
  address: "73 Boulevard René Laennec, 56100 Lorient",
  city: "Lorient, Bretagne",
  radiusKm: 30,
  links: {
    facebook: "https://www.facebook.com/people/Set-et-brique/61587641073898/",
    instagram: "https://www.instagram.com/explore/tags/setetbrique/",
    vinted: "https://www.vinted.fr/member/3128472152",
    googleReviews:
      "https://www.google.com/maps/place/Set+et+Brique/@47.7584758,-3.3585911,17z/data=!3m1!4b1!4m6!3m5!1s0x48105f19957d68b1:0xa6cbb999b704cc5c!8m2!3d47.7584758!4d-3.3585911!16s%2Fg%2F11z17thrtk",
    poppinsWeb: "https://www.wearepoppins.com/fr",
    poppinsApp:
      "https://poppins.go.link/21DxY?userId=2d6ae82f-e457-4d85-94ea-43983bb7b3f2",
  },
  legal: {
    owner: "Marion KERBRAT (LANGE-BERTEAUX)",
    tradeName: "SET ET BRIQUE",
    form: "Entreprise individuelle",
    rcs: "RCS Lorient 535 372 221",
    builder: "AGON-GATE (SAS)",
    builderSite: "https://agon-gate.com",
    builderEmail: "contact@agon-gate.com",
  },
};

/**
 * Liens masqués dans la barre desktop quand la place manque (toujours présents dans le menu mobile) :
 * `wideOnly` sous `xl` (toujours pour un gérant, dont la barre porte en plus « Espace de gestion »),
 * `adminWideOnly` sous `xl` pour un gérant seulement.
 */
export const nav: { href: string; label: string; wideOnly?: boolean; adminWideOnly?: boolean }[] = [
  { href: "/#concept", label: "Comment ça marche" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/bons-cadeaux", label: "Bons cadeaux" },
  { href: "/qui-sommes-nous", label: "Qui sommes-nous", adminWideOnly: true },
  { href: "/#vinted", label: "Vinted", wideOnly: true },
  { href: "/#contact", label: "Contact" },
];

/** Montants des bons cadeaux proposés à l'achat (spécification, module 6), en euros. */
export const giftVoucherAmounts = [10, 20, 30];

export const reviews = [
  {
    name: "Kira Bzh",
    avisCount: 18,
    text: "Première expérience avec Set et Brique. Je recommande. La prise de rendez-vous est rapide et ils sont très arrangeants. Les sets sont top. (On a pris le bateau) Le prix est abordable. Les explications pour le retour sont simples et précises. Quel plaisir de construire avec toute la famille des sets Legos que nous ne pourrions pas nous acheter. On a déjà hâte à la prochaine fois. Aurélie 41 ans, Alicia 11 ans et Kelian 8 ans",
  },
  {
    name: "Julie Le Bihan",
    avisCount: 9,
    text: "Nous avons eu la chance de découvrir ce principe de location de légos en gagnant à un concours sur internet et nous en revenons ravis. Mes enfants de 4 et 7 ans sont fans de légos. Nous avons emprunté pour une semaine 2 robots Ninjago. L'aîné, préposé au montage, a passé 2 jours pleins en construction du lever au coucher du soleil. Il fallait le forcer à faire des pauses y compris pour manger. J'appréhendais la perte de pièces ou le mélange avec des légos de la maison mais en dédiant une pièce de la maison à cela et en mettant en garde les enfants, il n'y a eu aucun problème. Ils ont pu y jouer en y prenant extrêmement soin. Gaëtan est très sympathique et arrangeant pour la passation et reste disponible sur le temps de la location si besoin. Merci encore d'avoir illuminé la semaine de mes enfants… même si un peu stressant tout de même pour moi de rendre le kit complet et de ne pas les mélanger aux leurs. Nous réitèrerons l'expérience avec plaisir lors de prochaines vacances chez les grands-parents. Bon à savoir : ils livrent d'Auray à Quimperlé. Bravo à vous pour ce concept innovant qui rend accessibles des sets, super activité qui plus est dans les collectivités ! Je veux bien l'exporter de Vannes à Nantes si un jour vous cherchez quelqu'un…",
  },
  {
    name: "Aurore Fsd",
    avisCount: 7,
    text: "J'adore !! Une super activité sur plusieurs jours partagée avec mon fils. Et parfois un moment calme pour lui seul. Il était fier de finir un si grand Lego ! Je reprendrai sur une période de vacances aussi, ce qui fait une bonne activité complémentaire. Très bon contact avec les gérants. Je recommande à tout le monde autour de moi maintenant !",
  },
  {
    name: "Nathalie Guillevic-Le Dantec",
    avisCount: 2,
    text: "L'idée de location de Lego était pile ce que je recherchais. J'admire l'organisation de la famille « Set et Briques », leur gentillesse, et leur disponibilité tant dans les échanges que pour la remise et la restitution des sets. Je louerai de nouveau sans hésitation, et en ai déjà parlé autour de moi tellement je trouve l'idée au top ! Merci et à bientôt pour la location de nouvelles heures de plaisir de montage !",
  },
  {
    name: "Virginie Le Guen",
    avisCount: 6,
    text: "Très bonne expérience. Première location de lego et sûrement pas la dernière. Tout est parfait et très bien organisé. Mon fils a été ravi.",
  },
  {
    name: "Xavier Carré",
    avisCount: 3,
    text: "Lego très agréable à monter, location et retour faciles 🙂 et très bonne communication. Merci !",
  },
  {
    name: "Marine Chauvel",
    avisCount: 3,
    text: "Une superbe expérience que nous allons renouveler avec plaisir !! L'idée de location est géniale. Tout est très bien organisé, échange simple et réactif. Gentillesse, sourire et bienveillance sont au rendez-vous lors des échanges. Je recommande + + +",
  },
];

export const press = [
  {
    outlet: "Ouest-France",
    title: "Ce couple loue des sets de Lego à Lorient",
    quote:
      "On s'est rendu compte que ça coûtait cher… une solution économique pour les passionnés.",
    href: "https://www.ouest-france.fr/bretagne/lorient-56100/on-sest-rendu-compte-que-ca-coutait-cher-ce-couple-loue-des-sets-de-lego-a-lorient-ae4b9c34-13ca-11f1-8725-6cea811c3c37",
  },
  {
    outlet: "Le Télégramme",
    title: "Elle propose ses Lego à la location aux familles, entreprises ou hôpitaux",
    quote:
      "Une initiative solidaire et ludique qui séduit déjà tout le pays de Lorient.",
    href: "https://www.letelegramme.fr/morbihan/lorient-56100/a-lorient-elle-propose-ses-lego-a-la-location-aux-familles-entreprises-ou-hopitaux-6990908.php",
  },
  {
    outlet: "Maville.com",
    title: "Location de Lego : une idée géniale pour petits et grands",
    quote: "Redécouvrez le plaisir de construire sans vous encombrer.",
    href: "https://lorient.maville.com/actu/actudet_--on-s-est-rendu-compte-que-ca-coutait-cher-ce-couple-loue-des-sets-de-lego-a-lorient-_loc-7211039_actu.Htm",
  },
];
