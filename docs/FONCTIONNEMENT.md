# Set et Brique, comment ça fonctionne

Ce document explique le fonctionnement de la plateforme au fur et à mesure de son développement. Il s'adresse aux développeurs qui reprennent le projet. Il est mis à jour à chaque étape.

## 1. Vue d'ensemble

Set et Brique loue de grands sets de briques de construction autour de Lorient. La plateforme remplace le site vitrine statique et l'application Poppins : catalogue, réservation en ligne, paiement, gestion des retours, et un espace d'administration pour les gérants (Marion et Gaëtan), qui ne codent pas.

| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, TypeScript) | Rendu serveur, routes API, déploiement natif sur Vercel |
| Style | Tailwind CSS 4 | Charte en variables dans `app/globals.css` |
| Base de données | Postgres sur Neon (via Vercel Marketplace) | Serverless, branches de base pour tester les migrations |
| ORM | Drizzle | Schéma en TypeScript, migrations SQL versionnées |
| Comptes | Clerk | Inscription, connexion, rôles admin |
| Paiement | Stripe | Paiement de la location et empreinte pour la caution |
| Fichiers | Vercel Blob | Photos des sets |
| Hébergement | Vercel, projet `set-et-brique` | Déploiement automatique à chaque push sur `main` |

Dépôt : `agon-gate-pro/set-et-brique`. Démo : https://set-et-brique.vercel.app.

## 2. Démarrer en local

```bash
pnpm install
vercel link --project set-et-brique --scope madus-wws-projects   # une seule fois
vercel env pull --yes                                             # crée .env.local
pnpm dev
```

`.env.local` contient les clés Neon, Clerk et Stripe. Il n'est jamais commité.

Scripts utiles :

| Commande | Rôle |
| --- | --- |
| `pnpm dev` | Serveur de développement |
| `pnpm build` puis `pnpm start` | Build de production, comme sur Vercel |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Génère une migration SQL à partir du schéma |
| `pnpm db:migrate` | Applique les migrations en attente |
| `pnpm db:studio` | Interface web pour parcourir la base |
| `pnpm db:seed` | Amorce la base (avis, presse, lieu de remise, réglages, forfait par défaut). Sans effet si déjà fait |

## 3. Organisation du code

```
app/              pages et layouts (App Router)
  page.tsx        accueil
  catalogue/      catalogue public depuis la base, fiche set `[slug]/`, tunnel `[slug]/reserver/`
  admin/          espace de gestion (rôles admin et superadmin)
    forfaits/, sets/, lieux/, fermetures/, reservations/   écrans + actions.ts (Server Actions)
  compte/         espace client : ses réservations, réponse aux dates proposées, annulation
  connexion/, inscription/   pages Clerk
  qui-sommes-nous/, mentions-legales/, cgu/
components/       en-tête, pied de page, composants réutilisables
  catalogue/      pastille de disponibilité
proxy.ts          protection des routes (Clerk)
lib/
  auth.ts         rôles et gardes d'accès
  validation.ts   schémas zod des formulaires
  format.ts       euros, slugs, libellés des statuts
  site.ts         constantes du site (contact, liens, textes de secours)
  settings.ts     lecture des réglages `site_settings` avec leurs valeurs par défaut
  dates.ts        dates ISO (jour à Paris, ajout de jours, fin de location), sans dépendance serveur
  availability.ts statut d'un set (disponible, en location, en battement…) et recherche d'un exemplaire libre sur une période
  bookings.ts     fiche client, référence, création d'une demande de réservation (verrou sur les exemplaires)
  db/schema.ts    schéma de la base (source de vérité)
  db/index.ts     connexion et client Drizzle
drizzle/          migrations SQL générées, à commiter
docs/             ce document
public/images/    logo et images statiques
```

## 4. Charte graphique

Les couleurs viennent du logo : rouge brique `#e63b2e`, jaune `#ffd23f`, bleu encre `#1d1a7c`. Deux polices : Fredoka pour les titres, Nunito Sans pour le texte. Deux signatures visuelles : le motif de tenons de brique (classes `studs`, `studs-sky`, `studs-ink`) et l'ombre portée dure en bleu encre (classe `brick-card`, boutons `btn`). Tout est défini dans `app/globals.css`.

## 5. Base de données

Le schéma est dans `lib/db/schema.ts`. Toute modification passe par ce fichier, puis `pnpm db:generate` (crée un fichier SQL dans `drizzle/`) et `pnpm db:migrate`. Ne jamais modifier la base à la main.

Deux chaînes de connexion : `DATABASE_URL` (avec pooler, utilisée par l'application) et `DATABASE_URL_UNPOOLED` (directe, utilisée par les migrations). C'est la recommandation de Neon. Les deux arrivent avec `sslmode=require`, que le code réécrit en `sslmode=verify-full` avant de se connecter (`lib/db/index.ts`, `drizzle.config.ts`) : c'est le même comportement pour `pg` 8, sans l'avertissement que Next affichait en dev comme une erreur sur la première page touchant la base.

### Tables

**Clients et comptes**

- `customers` : un client par compte Clerk (`clerk_user_id`). Coordonnées (nom, prénom, téléphone, adresse : obligatoires à la première demande, spécification module 3), note interne, et `blocked` : compte bloqué à la main par les gérants, plus aucune réservation possible. Le compte de connexion vit chez Clerk, la fiche client vit ici.

**Catalogue**

- `sets` : un article du catalogue, tel que le client le voit. Il regroupe parfois plusieurs boîtes officielles (`set_numbers`, une liste : le NINJAGO en combine 2, la gare et le train 3). Champs de la fiche, tous issus de la spécification (module 1) : nom, marque (`brand`, LEGO par défaut, PANTASY pour la mine de l'ouest), thème, description, commentaire public (`public_note`), pièces, figurines, nombre et type de notices (`instruction_type` : `paper` ou `digital`, et dans ce cas le client devra être prévenu qu'il faut un écran et internet), dimensions construit, temps de montage, âge conseillé, poids en grammes (`weight_grams`, **interne, jamais affiché** pour ne pas révéler le contenu des sachets pesés), caution, forfait, battement propre au set (`turnaround_days`, vide = réglage global) et statut de publication `draft` / `published` / `archived`. Seuls les sets `published` apparaissent sur le site.
- `set_images` : photos d'un set, ordonnées, 10 au maximum (décision de la cliente).
- `set_copies` : les exemplaires physiques d'un set. Un set peut exister en plusieurs exemplaires (un seul aujourd'hui, mais rien n'est codé en dur), chacun avec son état (`new`, `very_good`, `good`, `worn`) et son statut saisi par les gérants (`available`, `maintenance` = en réparation, `retired`). C'est l'exemplaire qui est réservé, pas le modèle. Les deux autres statuts de la spécification, « en location » et « en battement », ne sont pas stockés : ils se déduisent des réservations en cours et du délai de battement.
- `rate_plans` : les forfaits de location, chacun avec un nom et un prix par jour. Un forfait est marqué par défaut (`is_default`). Chaque set pointe vers un forfait via `sets.rate_plan_id` ; s'il est vide, le forfait par défaut s'applique.

**Logistique**

- `pickup_points` : lieux de remise en main propre proposés au client, dans l'ordre `sort_order`. Un lieu `active = false` n'est plus proposé mais reste dans l'historique des réservations. Le seed crée les cinq lieux confirmés par la cliente (Lanester, Guidel, Kerizan, Monistrol, Plouay).
- `blackout_periods` : périodes sans remise ni retour (vacances des gérants), bornes incluses. Un set déjà chez un client peut y rester pendant la période.

**Réservations**

- `bookings` : une réservation = un client, un set, des dates, un exemplaire attribué dès la demande, un lieu de remise, les montants (`rental_cents`, `deposit_cents`) et les identifiants Stripe. Les montants sont en centimes d'euro, en entiers, pour éviter les erreurs d'arrondi. Le champ `reference` est un code court (`SB-` + 5 caractères sans ambiguïté) communiqué au client. `proposed_start_date` / `proposed_end_date` portent une autre date proposée par les gérants, `cancel_reason` le motif visible du client, `terms_accepted_at` l'acceptation des conditions générales.
- `booking_events` : historique des changements de statut et des actions, avec l'auteur (`customer`, `admin`, `system`).

**Contenu éditable**

- `testimonials`, `press_articles` : avis clients et articles de presse affichés sur l'accueil.
- `site_settings` : réglages et textes modifiables en clé / valeur JSON (rayon de livraison, délai de remise en état, textes d'accueil).

### Cycle de vie d'une réservation

```
                    ┌── proposer une autre date ──▶ date_proposed ──client accepte──┐
                    │                                     │                          ▼
demande ──▶ pending_review ──accepter──────────────────────┼───────────────────▶ pending_payment ──paiement──▶ confirmed ──remise──▶ picked_up ──retour──▶ returned
                    │                                     │                          │
                    └── refuser / client annule ──────────┴──── client annule ───────┴──▶ cancelled
```

- `pending_review` : demande envoyée par le client depuis le tunnel. Toute demande est validée à la main par les gérants (spécification, module 5). L'exemplaire est attribué tout de suite pour bloquer les dates.
- `date_proposed` : les gérants proposent d'autres dates ; le client les accepte depuis son compte (elles remplacent les siennes, le prix est recalculé) ou annule.
- `pending_payment` : demande acceptée. Le moment du paiement (avant ou après validation) est encore en attente de la cliente, cette étape est donc un point d'arrêt pour l'instant.
- `confirmed` : paiement reçu, client prévenu.
- `picked_up` : remise faite, empreinte de caution posée.
- `returned` : set rendu et vérifié, empreinte libérée (ou capturée partiellement en cas de pièces manquantes).
- `cancelled` : refus des gérants, annulation par le client (possible tant que la demande n'est pas acceptée) ou par les gérants. `cancel_reason` est montré au client.

Chaque changement est tracé dans `booking_events` avec son auteur.

### Disponibilité

Un exemplaire est disponible sur une période si aucune réservation `pending_payment`, `confirmed` ou `picked_up` ne le chevauche, en ajoutant un délai de battement entre deux locations. Ce délai est `sets.turnaround_days` s'il est renseigné, sinon le réglage global `turnaround_days` de `site_settings` (4 jours par défaut, valeur de la spécification). Il ne s'applique pas quand le même client enchaîne deux réservations sur le même exemplaire sans le rendre (prolongation). Un set est disponible si au moins un de ses exemplaires `available` l'est. Les `blackout_periods` interdisent les dates de début et de fin qui tombent dedans.

Les réglages sont lus avec `getSetting()` de `lib/settings.ts`, qui renvoie la valeur par défaut si la ligne manque ; c'est aussi de là que le seed tire ses valeurs.

### Exemplaire libre sur une période

`findFreeCopy()` (`lib/availability.ts`, fonction pure) cherche le premier exemplaire `available` sans réservation qui chevauche la période demandée, élargie du battement avant et après. Les réservations prises en compte sont celles qui réservent des dates : `pending_review`, `date_proposed` (sur les dates proposées), `pending_payment`, `confirmed`, `picked_up`. Exception de la spécification (module 2) : le même client qui enchaîne sur le même set n'a pas de battement, seul le chevauchement strict compte. Les dates de remise et de retour ne doivent pas tomber dans une `blackout_period`. La création d'une demande verrouille les exemplaires du set (`SELECT … FOR UPDATE`) pour que deux demandes simultanées ne prennent pas le même.

### Statut affiché au client

Le catalogue affiche pour chaque set un des cinq statuts de la spécification. Il est calculé à chaque affichage par `computeSetAvailability()` (`lib/availability.ts`), fonction pure sans accès à la base, à partir des exemplaires et des réservations bloquantes (`pending_payment`, `confirmed`, `picked_up`) :

| Statut | Quand |
| --- | --- |
| Disponible | au moins un exemplaire `available` sans réservation qui le couvre aujourd'hui |
| En battement | un exemplaire a fini une location il y a moins de N jours (N = battement du set, sinon global) |
| En location | une réservation couvre aujourd'hui ; les réservations sans exemplaire attribué occupent chacune un exemplaire libre |
| En réparation | exemplaire en `maintenance` |
| Retiré | tous les exemplaires `retired`, ou aucun exemplaire |

L'ordre de priorité est celui du tableau : un set avec un exemplaire libre est « Disponible » même si un autre est loué. Pour « En location » et « En battement », la date de retour affichée est le premier jour où un exemplaire redevient libre (fin de location + battement + 1). `loadAvailability()` fait le même calcul pour une liste de sets en deux requêtes. Le jour de référence est la date à Paris.

### Prix

Chaque set est rattaché à un forfait, sinon au forfait par défaut. Total de la location = nombre de jours × prix par jour du forfait. Au démarrage, un seul forfait existe, « Forfait 1 » à 2 € par jour, marqué par défaut ; les gérants créent les autres forfaits depuis l'admin et les affectent set par set. La caution est un montant fixe par set (`sets.deposit_cents`) ; elle n'est pas débitée mais bloquée sur la carte au moment de la remise.

## 6. Comptes et rôles

Les comptes sont gérés par Clerk. Les pages `/connexion` et `/inscription` affichent les composants Clerk (en français, aux couleurs du site). Le fichier `proxy.ts` à la racine (l'équivalent du middleware dans Next.js 16) exige une session pour `/admin` et `/compte`.

Trois niveaux d'utilisateurs, distingués par `publicMetadata.role` côté Clerk :

| Rôle | Qui | Accès |
| --- | --- | --- |
| aucun | les clients | catalogue, réservation, `/compte` |
| `admin` | les gérants (Marion et Gaëtan) | `/admin` : sets, exemplaires, réservations, forfaits, contenus |
| `superadmin` | Agon-Gate | tout `admin`, plus `/admin/maintenance` (réglages techniques, rôles) |

Le contrôle du rôle se fait côté serveur dans `app/admin/layout.tsx` via `requireRole()` de `lib/auth.ts`. Le rôle est lu dans le jeton de session si le Dashboard Clerk expose `metadata` dans les claims (Sessions > Customize session token : `{"metadata": "{{user.public_metadata}}"}`), sinon via l'API Clerk. Les deux chemins fonctionnent, le premier évite un appel réseau par page.

Attribuer un rôle, une fois que la personne a créé son compte sur le site :

```bash
pnpm role marion@example.com admin
pnpm role contact@agon-gate.com superadmin
pnpm role marion@example.com none      # retirer
```

La fiche client en base (`customers`) n'est pas créée à l'inscription : elle est créée à la première demande de réservation, à partir du compte Clerk et des coordonnées saisies dans le tunnel (mises à jour à chaque demande). Ça évite un webhook et une synchronisation à maintenir. Le tunnel (`/catalogue/<slug>/reserver`) est protégé par `proxy.ts` comme `/compte`.

Les clés Clerk fournies par l'intégration Vercel sont celles d'une instance de développement (`pk_test_`). Avant la mise en production sur le domaine final, il faudra créer l'instance de production dans le Dashboard Clerk et remplacer les clés dans Vercel.

## 7. Espace de gestion

Accessible sur `/admin` aux rôles `admin` et `superadmin`. Les écrans sont des pages serveur qui lisent la base avec Drizzle ; les modifications passent par des Server Actions (`actions.ts` dans chaque dossier), qui revérifient le rôle avec `requireRole()`, valident la saisie avec zod (`lib/validation.ts`) et renvoient un message d'erreur ou de succès affiché sous le formulaire. Les montants sont saisis en euros (« 12,50 ») et stockés en centimes.

Composants partagés dans `components/admin/form.tsx` : bouton d'envoi avec état « Enregistrement… », bouton de suppression en deux clics (pas de boîte de dialogue navigateur), champ avec libellé et aide, message de résultat.

### Forfaits (`/admin/forfaits`)

Liste, création, modification du nom et du prix, choix du forfait par défaut, suppression. Un forfait ne peut pas être supprimé s'il est le forfait par défaut ou si des sets l'utilisent.

### Sets (`/admin/sets`)

- Liste avec photo principale, numéros de boîtes, marque si autre que LEGO, exemplaires, forfait effectif, caution et statut.
- Création : la fiche, en cinq blocs (identité, contenu, location, textes affichés au client, publication). Les numéros de boîtes se saisissent en une ligne séparés par des virgules ; ils sont stockés en liste, sans doublon. Le `slug` de l'adresse publique est dérivé du nom, unique, et ne change que si le nom change. Un premier exemplaire est créé automatiquement.
- Fiche : modification, photos, exemplaires, suppression.
- Photos : envoyées sur Vercel Blob (store `set-et-brique-images`, accès public, variable `BLOB_READ_WRITE_TOKEN`), JPEG, PNG ou WebP jusqu'à 8 Mo, 10 photos par set au plus. La première de la liste est la photo principale ; l'ordre se règle avec les flèches. Supprimer une photo la retire aussi du stockage.
- Exemplaires : libellé, état, statut, note interne. Un exemplaire déjà réservé ne se supprime pas : le passer en « Retiré ». Pour bloquer un set le temps d'un souci (retard, casse), le passer en « En réparation ».
- Suppression d'un set : refusée s'il a déjà été réservé, il faut alors l'archiver.

### Lieux de remise (`/admin/lieux`)

Liste ordonnée (flèches), création, modification, activation, suppression. Un lieu utilisé par une réservation ne se supprime pas : le désactiver. L'heure de remise n'est pas gérée ici, elle se convient avec le client après la réservation (spécification, module 2).

### Périodes fermées (`/admin/fermetures`)

Fermetures à venir modifiables, création, suppression ; les périodes passées sont listées en bas pour mémoire. Si une réservation active a sa remise ou son retour dans la période, l'écran l'indique en rouge : c'est aux gérants de contacter le client, rien n'est annulé automatiquement. Pour bloquer un seul set (retard, casse), on passe son exemplaire « En réparation » depuis la fiche du set, ce qui couvre le « blocage par set » de la spécification.

### Réservations (`/admin/reservations`)

Liste en quatre groupes : à traiter (`pending_review`), en attente du client (`date_proposed`), acceptées et en cours, terminées et annulées. Le tableau de bord affiche le nombre de demandes à traiter. La fiche d'une réservation montre la location, le client (avec blocage et déblocage du compte), la note interne, les décisions possibles et l'historique.

- **Accepter** : `pending_review` → `pending_payment`. Rien d'autre n'est déclenché pour l'instant (pas d'email, pas de paiement).
- **Proposer d'autres dates** : vérifie qu'un exemplaire est libre sur les nouvelles dates (battement compris, en ignorant la réservation elle-même), puis `date_proposed` avec un message facultatif au client.
- **Refuser** : `cancelled` avec un motif visible du client, possible aussi sur une demande déjà acceptée tant qu'elle n'est pas payée.

### Où vit un set

| Quoi | Où | Forme |
| --- | --- | --- |
| La fiche (textes, chiffres, caution, forfait, statut) | Postgres Neon, table `sets` | une ligne par article |
| Les photos | Vercel Blob, chemin `sets/<slug>/<horodatage>.<ext>` avec suffixe aléatoire | fichiers publics, l'URL est gardée dans `set_images` |
| Les boîtes physiques | Postgres, table `set_copies` | une ligne par exemplaire, rattachée au set |
| Les réglages communs (battement par défaut) | Postgres, table `site_settings` | une ligne par clé, valeur JSON |

Rien n'est stocké sur le disque du serveur : Vercel n'en garantit pas la persistance. Supprimer un set supprime ses photos du Blob et ses exemplaires (cascade en base).

## 8. Catalogue public

`/catalogue` liste les sets `published`, coups de cœur d'abord, avec photo principale, statut du jour, prix par jour (forfait du set ou forfait par défaut) et caution. Sans set publié, la page renvoie vers Poppins et le contact. `/catalogue/<slug>` est la fiche : photos, statut et date de retour, prix, caution, description, commentaire public (« Bon à savoir »), et le bloc « En bref » (pièces, figurines, notices, dimensions, temps de montage, âge, marque, numéros). Une notice numérique déclenche l'encart d'avertissement demandé par la cliente. Le poids n'est jamais affiché. Tant que le tunnel de réservation n'existe pas, le bouton « Réserver » ouvre un email pré-rempli ; un set indisponible propose « Être prévenu de son retour ».

## 9. Tunnel de réservation

Depuis la fiche d'un set disponible, « Réserver ce set » mène à `/catalogue/<slug>/reserver` (connexion requise). Le client choisit la date de remise (à partir de demain), le nombre de jours (libre, minimum `min_rental_days`, pas de maximum), le lieu de remise parmi les lieux actifs, laisse un message facultatif, renseigne ses coordonnées et coche les conditions générales. Le total (prix par jour × jours) et la date de retour s'affichent en direct ; la fin est comptée en jours calendaires (mardi + 4 jours = vendredi). Aucun paiement à cette étape.

Côté serveur (`lib/bookings.ts`), la demande est refusée avec un message clair si : le set n'est plus publié, le lieu n'est pas actif, la remise ou le retour tombe dans une fermeture, aucun exemplaire n'est libre, ou le compte est bloqué. Sinon la réservation est créée en `pending_review` avec sa référence, et le client est redirigé vers `/compte`, où il suit ses demandes, accepte une date proposée ou annule.

Hypothèses prises faute de règle dans la spécification : la remise ne peut pas être demandée pour le jour même, et le planning par lieu (une seule remise à la fois) n'est pas contrôlé automatiquement, c'est la validation manuelle qui s'en charge.

## 10. Étapes suivantes

- Écrans de l'espace admin restants : contenus, maintenance.
- Emails transactionnels : aucun fournisseur n'est encore configuré. À brancher sur les transitions de `booking_events` (demande reçue, acceptée, refusée, date proposée).
- Saisie des 28 sets du catalogue par les gérants (ou import depuis la liste `catalogue-sets-lego.md` quand elle sera dans le dépôt).
- Paiement Stripe et caution après `pending_payment`, une fois tranché avec la cliente si le paiement précède ou suit la validation.
- Parcours client : catalogue depuis la base, fiche set, calendrier de disponibilité, réservation et paiement Stripe.
- Emails transactionnels (confirmation, rappel de retour).
