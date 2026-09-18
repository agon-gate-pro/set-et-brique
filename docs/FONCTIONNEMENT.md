# Set et Brique, comment ça fonctionne

Documentation technique de la plateforme, pour les développeurs qui reprennent le projet. Elle décrit l'état actuel du code et de la base, et elle est mise à jour à chaque étape. Trois documents vivent dans `docs/` :

| Document | Rôle |
| --- | --- |
| `FONCTIONNEMENT.md` (celui-ci) | comment ça marche : architecture, base, règles implémentées, écrans |
| `AVANCEMENT.md` | ce qui est fait, ce qui reste, les questions ouvertes, le journal par étape |
| `specification-fonctionnelle.md` | les règles métier attendues, module par module, avec ce qui est confirmé ou en attente |

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

`.env.local` contient les clés Neon, Clerk et Stripe. Il n'est jamais commité. Tant que le site n'est pas public, les environnements Development, Preview et Production de Vercel pointent sur la même base Neon : une migration appliquée en local l'est aussi pour le site déployé, et les données de test sont à nettoyer après usage.

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
| `pnpm db:import-sets <fichier.csv> [--dry-run]` | Crée les sets à partir de la grille CSV remplie par la cliente. Ignore les numéros de boîte déjà en base |

## 3. Organisation du code

```
app/              pages et layouts (App Router)
  page.tsx        accueil
  catalogue/      catalogue public depuis la base, fiche set `[slug]/`, tunnel `[slug]/reserver/`
  admin/          espace de gestion (rôles admin et superadmin)
    forfaits/, sets/, lieux/, fermetures/, reservations/, bons-cadeaux/   écrans + actions.ts (Server Actions)
  compte/         espace client : ses réservations, réponse aux dates proposées, annulation
  connexion/, inscription/   pages Clerk
  qui-sommes-nous/, mentions-legales/, cgu/
components/       en-tête, pied de page, composants réutilisables
  catalogue/      pastille de disponibilité
proxy.ts          contexte d'authentification Clerk (ne protège plus les routes)
lib/
  auth.ts         rôles et gardes d'accès
  validation.ts   schémas zod des formulaires
  format.ts       euros, slugs, libellés des statuts
  site.ts         constantes du site (contact, liens, textes de secours)
  settings.ts     lecture des réglages `site_settings` avec leurs valeurs par défaut
  dates.ts        dates ISO (jour à Paris, ajout de jours, fin de location), sans dépendance serveur
  availability.ts statut d'un set (disponible, en location, en battement…) et recherche d'un exemplaire libre sur une période
  bookings.ts     fiche client, référence, création d'une demande de réservation (verrou sur les exemplaires)
  gift-vouchers.ts   génération de codes, statut affiché (valide/utilisé/expiré/annulé)
  db/schema.ts    schéma de la base (source de vérité)
  db/index.ts     connexion et client Drizzle
drizzle/          migrations SQL générées, à commiter
docs/             documentation (ce document, AVANCEMENT.md, specification-fonctionnelle.md)
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

- `pickup_points` : lieux de remise en main propre proposés au client, dans l'ordre `sort_order`. `open_from` et `open_until` (facultatifs, ensemble) délimitent les heures de remise que le client peut demander ; le tunnel borne le champ heure au lieu choisi et le serveur revérifie (`isWithinOpening()`). Un lieu `active = false` n'est plus proposé mais reste dans l'historique des réservations. Le seed crée les cinq lieux confirmés par la cliente (Lanester, Guidel, Kerizan, Monistrol, Plouay).
- `blackout_periods` : périodes sans remise ni retour (vacances des gérants), bornes incluses. Un set déjà chez un client peut y rester pendant la période.

**Réservations**

- `bookings` : une réservation = un client, un set, des dates, un exemplaire attribué dès la demande, un lieu de remise, les montants (`rental_cents`, `deposit_cents`) et les identifiants Stripe. Les montants sont en centimes d'euro, en entiers, pour éviter les erreurs d'arrondi. Le champ `reference` est un code court (`SB-` + 5 caractères sans ambiguïté) communiqué au client. `proposed_start_date` / `proposed_end_date` portent une autre date proposée par les gérants, `cancel_reason` le motif visible du client, `terms_accepted_at` l'acceptation des conditions générales.
- `booking_events` : historique des changements de statut et des actions, avec l'auteur (`customer`, `admin`, `system`).

**Bons cadeaux**

- `gift_vouchers` : un bon = un code unique (`code`), un montant en centimes (`amount_cents`), une origine (`origin` : `admin` couvre les avoirs offerts et les lots créés pour un événement, `purchase` correspondra aux bons achetés en ligne une fois le module 4 en place) et un statut (`status` : `valid`, `used`, `cancelled`). `batch_label` retrouve les codes créés ensemble pour un événement, `note` est un motif interne non affiché au client. `expires_at` est obligatoire ; l'état « expiré » n'est pas stocké, il se déduit de `status = "valid"` et `expires_at` dépassée (`giftVoucherDisplayStatus()` de `lib/gift-vouchers.ts`).

**Contenu éditable**

- `testimonials`, `press_articles` : avis clients et articles de presse affichés sur l'accueil.
- `site_settings` : réglages modifiables en clé / valeur JSON. Clés actuelles : `turnaround_days` (battement par défaut, 4), `min_rental_days` (1, pas de maximum), `radius_km`, `contact_email`, `contact_phone`. Les valeurs par défaut sont dans `lib/settings.ts`. Pas encore d'écran admin pour les modifier.

### Cycle de vie d'une réservation

```
                    ┌── proposer une autre date ──▶ date_proposed ──client accepte──┐
                    │                                     │                          ▼
demande ──▶ pending_review ──accepter──────────────────────┼───────────────────▶ pending_payment ──paiement──▶ confirmed ──remise──▶ picked_up ──retour──▶ returned
                    │                                     │                          │
                    └── refuser / client annule ──────────┴──── client annule ───────┴──▶ cancelled
```

- `pending_review` : demande envoyée par le client depuis le tunnel. Toute demande est validée à la main par les gérants (spécification, module 5). L'exemplaire est attribué tout de suite pour bloquer les dates.
- `date_proposed` : statut conservé en base mais plus produit par l'admin depuis le 16 septembre 2026 : les gérants ne changent pas les dates choisies par le client, seulement le lieu et l'heure de remise. Le code client qui l'affichait reste, pour d'éventuelles anciennes réservations.
- `pending_payment` : demande acceptée. Le moment du paiement (avant ou après validation) est encore en attente de la cliente, cette étape est donc un point d'arrêt pour l'instant.
- `confirmed` : paiement reçu, client prévenu.
- `picked_up` : remise en main propre faite, enregistrée par les gérants (`picked_up_at`). Possible depuis `pending_payment` (loyer réglé par TPE à la remise) ou `confirmed`. L'empreinte de caution viendra avec le module 4.
- `returned` : set rendu, enregistré par les gérants avec la date et un état des lieux en commentaire libre (`returned_at`, `return_note`). L'exemplaire redevient libre après le battement. La libération ou la capture de la caution viendra avec le module 4.
- `cancelled` : refus des gérants, annulation par le client (possible tant que la demande n'est pas acceptée) ou par les gérants. `cancel_reason` est montré au client.

Chaque changement est tracé dans `booking_events` avec son auteur.

Retard : un set `picked_up` dont la date de retour est passée est en retard à partir de J+1 (`daysLate()` de `lib/dates.ts`, jours calendaires). Le retard se déduit, rien n'est stocké. Tant que le set n'est pas rendu, il continue d'occuper son exemplaire : `withLateReturn()` ramène sa fin effective à aujourd'hui dans les calculs de disponibilité et de recherche d'exemplaire libre, pour que le catalogue ne l'annonce pas disponible et qu'aucune demande ne soit acceptée dessus. La séquence d'emails et le forfait de retard (module 9) ne sont pas encore là.

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

### Calendrier de la fiche

La fiche d'un set affiche un calendrier mensuel des jours où il peut être loué, du mois courant à cinq mois plus tard (`loadDayAvailability()`, `lib/availability.ts`). Le calcul est pur (`computeDayAvailability()`) : un jour est « Disponible » si `findFreeCopy()` trouve un exemplaire libre ce jour-là, en comptant le battement avant et après chaque réservation (`RESERVING_STATUSES`, demandes en attente comprises, dates proposées par les gérants si elles existent) ; « Fermé » s'il tombe dans une `blackout_period` ; « Déjà loué » sinon. Le battement s'applique toujours, le visiteur n'étant pas identifié. Les jours passés et aujourd'hui sont grisés, la remise commençant demain. Le composant client `AvailabilityCalendar` reçoit la table jour → état et ne fait que la navigation entre mois.

### Prix

Chaque set est rattaché à un forfait, sinon au forfait par défaut. Total de la location = nombre de jours × prix par jour du forfait. Au démarrage, un seul forfait existe, « Forfait 1 » à 2 € par jour, marqué par défaut ; les gérants créent les autres forfaits depuis l'admin et les affectent set par set. La caution est un montant fixe par set (`sets.deposit_cents`) ; elle n'est pas débitée mais bloquée sur la carte au moment de la remise.

## 6. Comptes et rôles

Les comptes sont gérés par Clerk. Les pages `/connexion` et `/inscription` affichent les composants Clerk (en français, aux couleurs du site). Après l'inscription, le nouveau client arrive sur l'onglet Coordonnées de son compte (`forceRedirectUrl` du composant `SignUp`) ; s'il venait d'une page de réservation, elle est gardée en paramètre `retour` et il y revient une fois les coordonnées enregistrées. Seuls les chemins internes sont acceptés comme retour (`safeReturnPath()`). La gestion du compte est la page `/compte/profil`, atteinte par « Gérer le compte » du bouton utilisateur du header et par le bouton « Gérer mon compte » de `/compte`. C'est le composant `UserProfile` de Clerk avec quatre onglets :

| Onglet | Qui le fournit | Contenu |
| --- | --- | --- |
| Compte | Clerk | photo, nom, adresses e-mail, comptes connectés (lier un compte Google à un compte créé par e-mail, pour se connecter ensuite avec l'un ou l'autre) |
| Sécurité | Clerk | mot de passe, sessions actives, suppression du compte |
| Coordonnées | nous (`app/compte/profil/profile-form.tsx`, action `saveCustomerProfile`) | prénom, nom, téléphone, adresse, ville, lieu de remise préféré ; écrit dans `customers` via `upsertCustomer` |
| Historique | nous | toutes les réservations du client, en lecture ; les actions restent sur `/compte` |

Les onglets à nous sont des `UserProfile.Page` déclarées dans un composant client (`profile-panel.tsx`) : Clerk les reconnaît en comparant le type des éléments enfants, ce qui échoue si les éléments sont créés côté serveur. Leur contenu, lui, est rendu côté serveur et passé en props. Le téléphone est normalisé à l'enregistrement (`formatPhone()` de `lib/format.ts` : « 06 12 34 56 78 », les formes +33 ou avec points ramenées à celle-ci, les numéros étrangers gardés tels quels) et affiché ainsi partout, avec un lien `tel:`. Les coordonnées servent au contrat et à la note ; elles sont pré-remplies dans le tunnel, où le client peut encore les corriger (ce qui met la fiche à jour). Le lieu de remise préféré (`customers.preferred_pickup_point_id`, migration 0006) pré-sélectionne le lieu dans le tunnel, sans l'imposer. Les pages `/compte` et `/compte/profil` appellent `auth.protect()` de Clerk en tête : un visiteur anonyme est renvoyé vers `/connexion` avec le chemin courant en retour. Le tunnel fait sa propre redirection explicite. Voir §6.1 pour la raison.

### 6.1 Où se fait la protection, et pourquoi pas dans le proxy

Chaque ressource serveur se garde elle-même : les pages de `/admin` et les Server Actions par `requireRole("admin")`, les pages `/compte` par `auth.protect()`, le tunnel par une redirection explicite. `proxy.ts` ne fait plus que poser le contexte d'authentification que lisent `auth()` et `currentUser()`.

Jusqu'au 17 septembre 2026, `proxy.ts` protégeait `/admin`, `/compte` et le tunnel par motif d'URL (`createRouteMatcher` + `auth.protect()`). Clerk a déprécié ce mécanisme, et pour une raison qui nous concernait directement : un motif raisonne sur des chemins, alors qu'en navigation côté client le routeur Next peut ne demander au serveur que le segment d'une page, sans réexécuter le layout parent. Le `requireRole()` de `app/admin/layout.tsx` n'était donc pas une barrière suffisante à lui seul — il l'était uniquement parce que le motif du proxy couvrait le trou en amont. Retirer le motif sans garder chaque page aurait rendu les listes de réservations et de clients, notes internes comprises, lisibles par une requête RSC forgée par un visiteur anonyme. Les écritures, elles, seraient restées protégées par les contrôles des Server Actions.

D'où la règle : **toute nouvelle page sous `/admin` commence par `await requireRole("admin")`**, même si son layout le fait déjà. Un layout n'est pas une frontière de sécurité.

Trois niveaux d'utilisateurs, distingués par `publicMetadata.role` côté Clerk :

| Rôle | Qui | Accès |
| --- | --- | --- |
| aucun | les clients | catalogue, réservation, `/compte` |
| `admin` | les gérants (Marion et Gaëtan) | `/admin` : sets, exemplaires, réservations, forfaits, contenus |
| `superadmin` | Agon-Gate | tout `admin`, plus `/admin/maintenance` (réglages techniques, rôles) |

Le contrôle du rôle se fait côté serveur avec `requireRole()` de `lib/auth.ts`, appelé en tête de **chacune** des pages de `/admin` et de chaque Server Action, et non dans le seul `app/admin/layout.tsx` (voir §6.1). Le rôle est lu dans le jeton de session si le Dashboard Clerk expose `metadata` dans les claims (Sessions > Customize session token : `{"metadata": "{{user.public_metadata}}"}`), sinon via l'API Clerk. Les deux chemins fonctionnent, le premier évite un appel réseau par page.

Attribuer un rôle, une fois que la personne a créé son compte sur le site :

```bash
pnpm role marion@example.com admin
pnpm role contact@agon-gate.com superadmin
pnpm role marion@example.com none      # retirer
```

La fiche client en base (`customers`) n'est pas créée à l'inscription : elle est créée à la première demande de réservation ou au premier enregistrement de l'onglet Coordonnées, à partir du compte Clerk et des coordonnées saisies (mises à jour à chaque demande). Ça évite un webhook et une synchronisation à maintenir. Le tunnel (`/catalogue/<slug>/reserver`) se protège lui-même, comme `/compte`.

### Où vivent les données d'un client

| Quoi | Où | Forme |
| --- | --- | --- |
| Identité de connexion : e-mail, mot de passe (haché), compte Google lié, prénom et nom saisis chez Clerk, photo, sessions actives | Clerk (serveurs Clerk, instance de développement aujourd'hui) | un utilisateur Clerk, identifié par `clerk_user_id` |
| Rôle gérant ou superadmin | Clerk, `publicMetadata.role` de l'utilisateur | attribué par `pnpm role` |
| Coordonnées portées sur la note et le contrat : prénom, nom, téléphone, adresse, code postal, ville | Postgres Neon, table `customers` | une ligne par client, créée à la première demande ou au premier enregistrement de l'onglet Coordonnées, reliée à Clerk par `clerk_user_id` |
| Lieu de remise préféré, blocage du compte et sa raison, note interne des gérants | Postgres, table `customers` | mêmes lignes |
| Réservations : set, exemplaire, dates, lieu, montants, statut, message du client, horodatage de l'acceptation des CG | Postgres, table `bookings` | une ligne par demande, rattachée à `customers.id` |
| Historique des changements de statut | Postgres, table `booking_events` | une ligne par transition |
| Paiements et caution (à venir, module 4) | Stripe, et les identifiants Stripe dans `bookings` | rien en base au-delà des identifiants |

L'e-mail est copié de Clerk dans `customers.email` à chaque enregistrement, pour que les gérants le voient sans appel à Clerk. Rien n'est stocké sur le disque du serveur ni dans le navigateur au-delà du cookie de session Clerk.

### Ce qui part vers le navigateur

Une ligne Drizzle passée en prop à un composant client est sérialisée entière dans la réponse, quel que soit le type TypeScript affiché sur le prop. Les pages client projettent donc les colonnes à la requête : `findCustomerByClerkId()` ne lit que `customerPublicColumns` (jamais `adminNote` ni `blockedReason`), et les listes de réservations de `/compte` et `/compte/profil` ne lisent que `bookingCustomerColumns` (jamais `adminNote` ni `returnNote`, ni les identifiants Stripe). `BookingCard` est typé sur `CustomerBooking`, dérivé de cette projection. Les pages admin lisent les lignes complètes. Le chemin de retour `retour` n'accepte qu'un chemin interne : `safeReturnPath()` refuse `//hôte` et `/\hôte`, que le navigateur lit comme une origine externe.

Règle de conservation retenue : 3 ans après la dernière activité du client, ou dès qu'il supprime son compte. Les notes et les contrats sont archivés dans le logiciel comptable avec leurs durées légales propres, la plateforme n'en est pas le dépôt : elle les émet et permet de les exporter. Aujourd'hui, supprimer son compte depuis l'onglet Sécurité efface l'utilisateur chez Clerk mais laisse la ligne `customers` et les réservations, rattachées à un identifiant Clerk orphelin : la purge et l'anonymisation restent à écrire, voir `AVANCEMENT.md` §2.

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

### Import en masse depuis la grille CSV (`scripts/import-sets.ts`)

La cliente a rempli une grille « Liste des sets LEGO disponibles à la location » (une ligne par set, colonnes Titre, Description, pièces, dimensions, numéro, notices, type de notice, figurines, temps de montage, âge, marque, caution). `pnpm db:import-sets <fichier.csv>` la lit et crée les sets, avec `--dry-run` pour vérifier sans écrire.

- Une ligne **sans titre** est la suite du set précédent : un article de location composé de plusieurs boîtes officielles. Les numéros sont cumulés dans `set_numbers`, les pièces, notices et figurines additionnées, les dimensions concaténées avec « + ».
- Normalisation : caution « 150 € » ou « 150 » en centimes, « PAPIER » / « NUMERIQUE » en `paper` / `digital`, temps de montage ramené à « N h », âge « 9 ans et + » à 9, marque « Lego » en `LEGO`. Les titres du CSV (souvent en capitales, quelques coquilles) sont remplacés par une forme lisible définie dans le script, qui sert aussi de slug.
- La gamme (`theme`) n'est pas dans la grille : le script la déduit du premier numéro de boîte avec une table écrite à la main, à faire vérifier par la cliente.
- Les sets sont créés **publiés**, sans photo (la carte affiche « Photo à venir »), avec un exemplaire « Exemplaire 1 » et le forfait par défaut, comme la création dans l'admin.
- Idempotent : un set dont le premier numéro de boîte existe déjà est ignoré, on peut relancer sans doublon.

### Lieux de remise (`/admin/lieux`)

Liste ordonnée (flèches), création, modification, activation, suppression. Un lieu utilisé par une réservation ne se supprime pas : le désactiver. L'heure de remise n'est pas gérée ici, elle se convient avec le client après la réservation (spécification, module 2).

### Périodes fermées (`/admin/fermetures`)

Fermetures à venir modifiables, création, suppression ; les périodes passées sont listées en bas pour mémoire. Si une réservation active a sa remise ou son retour dans la période, l'écran l'indique en rouge : c'est aux gérants de contacter le client, rien n'est annulé automatiquement. Pour bloquer un seul set (retard, casse), on passe son exemplaire « En réparation » depuis la fiche du set, ce qui couvre le « blocage par set » de la spécification.

### Réservations (`/admin/reservations`)

Liste en cinq groupes : à traiter (`pending_review`), en attente du client (`date_proposed`), à remettre (`pending_payment`, `confirmed`), en cours de location (`picked_up`, triées par date de retour, retard en rouge), terminées et annulées. Chaque carte montre la référence, le set, le client et son téléphone, la période de location en dates courtes (17/09/2026), le lieu et l'heure de remise. Une demande à traiter porte directement ses trois boutons : Accepter (vert), Modifier (jaune, renvoie au bloc Décision de la fiche pour le lieu et l'heure) et Refuser (rouge, avec confirmation, sans motif ; le motif se saisit depuis la fiche). Le tableau de bord affiche le nombre de demandes à traiter, le nombre de sets en location et une alerte sur les retours en retard. La fiche d'une réservation montre la location, le client (avec blocage et déblocage du compte), la note interne, les décisions possibles et l'historique.

- **Accepter** : `pending_review` → `pending_payment`. Rien d'autre n'est déclenché pour l'instant (pas d'email, pas de paiement).
- **Modifier la remise** : lieu (parmi les lieux actifs) et heure seulement, sans changement de statut ; les dates et la durée restent celles du client. La modification est tracée dans l'historique et visible du client dans son espace. Possible tant que le set n'est pas remis.
- **Refuser** : `cancelled` avec un motif visible du client, possible aussi sur une demande déjà acceptée tant qu'elle n'est pas payée.
- **Set remis** : `pending_payment` ou `confirmed` → `picked_up`, avec la date (aujourd'hui par défaut, jamais dans le futur) et une précision facultative pour l'historique (« loyer encaissé par TPE »). Refusé si aucun exemplaire n'est attribué.
- **Set rendu** : `picked_up` → `returned`, avec la date (pas avant la remise, pas dans le futur) et l'état des lieux en commentaire libre, jamais visible du client. Le retard éventuel est écrit dans l'historique. À construire (spécification, module 9, révision du 18 septembre 2026) : le solde de la restitution par deux boutons exclusifs, **Restitution conforme** ou **Établir une note complémentaire** (retard, forfait démontage, retenues du barème) — voir §10.

Pas d'annulation d'une remise ou d'un retour enregistrés par erreur pour l'instant : le passer par la maintenance si ça arrive.

### Bons cadeaux (`/admin/bons-cadeaux`)

Génération à l'unité ou en lot (jusqu'à 200 bons du même montant en une fois), avec étiquette de lot et note interne facultatives ; chaque bon reçoit un code unique. Liste filtrable par état (valide, utilisé, expiré, annulé), origine et recherche (code ou lot). Actions sur un bon valide : marquer utilisé, annuler (deux clics, sans motif). Pas encore de vente en ligne ni d'utilisation comme moyen de paiement dans le tunnel : ces bons servent aujourd'hui aux avoirs et aux lots papier remis à la main.

### Où vit un set

| Quoi | Où | Forme |
| --- | --- | --- |
| La fiche (textes, chiffres, caution, forfait, statut) | Postgres Neon, table `sets` | une ligne par article |
| Les photos | Vercel Blob, chemin `sets/<slug>/<horodatage>.<ext>` avec suffixe aléatoire | fichiers publics, l'URL est gardée dans `set_images` |
| Les boîtes physiques | Postgres, table `set_copies` | une ligne par exemplaire, rattachée au set |
| Les réglages communs (battement par défaut) | Postgres, table `site_settings` | une ligne par clé, valeur JSON |

Rien n'est stocké sur le disque du serveur : Vercel n'en garantit pas la persistance. Supprimer un set supprime ses photos du Blob et ses exemplaires (cascade en base).

## 8. Catalogue public

`/catalogue` liste les sets `published`, coups de cœur d'abord, avec photo principale, statut du jour, prix par jour (forfait du set ou forfait par défaut) et caution. Un filtre par gamme (pastilles « Toutes », une par gamme avec son nombre de sets, « Autres » pour les sets sans gamme) s'applique par l'URL, `?gamme=harry-potter`, le slug étant dérivé du champ `theme` ; une valeur inconnue revient à « Toutes ». Sans set publié, la page renvoie vers Poppins et le contact. `/catalogue/<slug>` est la fiche : photos, statut et date de retour, prix, caution, description, commentaire public (« Bon à savoir »), et le calendrier des disponibilités (voir §5) et le bloc « En bref » (pièces, figurines, notices, dimensions, temps de montage, âge, marque, numéros). Une notice numérique déclenche l'encart d'avertissement demandé par la cliente. Le poids n'est jamais affiché. Un set disponible a un bouton « Réserver ce set » vers le tunnel ; un set indisponible propose « Être prévenu de son retour » (email pré-rempli).

## 9. Tunnel de réservation

Depuis la fiche d'un set disponible, « Réserver ce set » mène à `/catalogue/<slug>/reserver` (connexion requise). Si la fiche client est incomplète (nom, prénom, téléphone, adresse, code postal, ville : `isCustomerComplete()`), la page affiche à la place un message et un bouton « Compléter mes coordonnées » qui mène à l'onglet Coordonnées puis ramène ici. Le client choisit la date de remise (à partir de demain), l'heure de remise souhaitée (`pickup_time`, par quart d'heure, dans la plage horaire du lieu choisi s'il en a une, confirmée ou ajustée par les gérants), le nombre de jours (libre, minimum `min_rental_days`, pas de maximum), le lieu de remise parmi les lieux actifs, laisse un message facultatif, renseigne ses coordonnées et coche les conditions générales. Le total (prix par jour × jours) et la date de retour s'affichent en direct ; la fin est comptée en jours calendaires (mardi + 4 jours = vendredi). Aucun paiement à cette étape.

Côté serveur (`lib/bookings.ts`), la demande est refusée avec un message clair si : le set n'est plus publié, le lieu n'est pas actif, la remise ou le retour tombe dans une fermeture, aucun exemplaire n'est libre, ou le compte est bloqué. Sinon la réservation est créée en `pending_review` avec sa référence, et le client est redirigé vers `/compte`, où il suit ses demandes, accepte une date proposée ou annule. Chaque carte lui dit où en est la location : remise prévue le, set récupéré le et à rendre le, retour en retard (avec invitation à contacter les gérants), set rendu le (spécification, module 3).

Hypothèses prises faute de règle dans la spécification : la remise ne peut pas être demandée pour le jour même, et le planning par lieu (une seule remise à la fois) n'est pas contrôlé automatiquement, c'est la validation manuelle qui s'en charge.

## 10. Documents émis au client (à construire)

Rien n'est encore développé ici ; la décision de cadrage, elle, est prise et vaut d'être écrite avant d'y toucher.

**Le site n'est pas un logiciel de facturation.** Il n'émet pas de factures. Il émet des **notes** — le document de vente destiné à un particulier, aux obligations allégées (spécification, module 8, révision du 18 septembre 2026). Une note porte : la date de sa rédaction, le nom et l'adresse de l'entreprise, le nom du client sauf opposition de sa part, la date et le lieu d'exécution de la prestation (les dates de location et le lieu de remise, déjà en base dans `bookings`), le décompte détaillé en quantité et en prix, et la somme totale à payer.

Le décompte n'est pas une simple ligne de prix : il identifie la prestation par les **références du set** (titre et numéro(s) de boîte — un set en regroupe parfois plusieurs, cf. `set_numbers`) et par la **période de location**. La note **renvoie au contrat** (module 7) pour les conditions particulières, qu'elle ne reprend pas ; le renvoi se fait par `bookings.reference`, qui identifie déjà la réservation et donc son contrat.

Une note ne devient disponible **qu'après le paiement** de la prestation : automatiquement pour un paiement en ligne ou par bon cadeau, et après que les gérants aient marqué la réservation payée pour un règlement au TPE. Le contrat (module 7), lui, est généré à l'acceptation des conditions générales, dont l'horodatage est déjà en base. Les deux documents partagent le même moteur de génération PDF, un fichier par document.

Le numéro d'une note suit le format **`aaaa-mm-##`** — année, mois, numéro séquentiel repartant à `01` à chaque mois (la séquence est mensuelle, pas annuelle : le compteur se lit et s'incrémente par couple année-mois). Il s'attribue **à l'émission**, donc au paiement : une demande refusée ou jamais payée ne consomme pas de numéro, la séquence n'a pas de trou. Techniquement, ça suppose que l'attribution du numéro et l'enregistrement du paiement tiennent dans la même transaction, avec le compteur verrouillé le temps de la lecture et de l'écriture — deux paiements simultanés ne doivent pas obtenir le même numéro.

Ce qu'une note porte découle de son moment d'émission : établie au paiement, elle ne contient que ce qui est connu alors — la location, et le **forfait démontage de 20 € si le client l'a choisi à la réservation** (le forfait devient donc une option du tunnel, pas seulement une pénalité constatée au retour). Tout ce qui se découvre plus tard — indemnité de retard, démontage constaté au retour, retenues du barème de pertes — fait l'objet d'une **note complémentaire**, portant son propre numéro.

Cette note complémentaire ne facture que les montants découverts après coup — indemnité de retard, forfait démontage quand le set revient monté sans avoir été sélectionné, retenues du barème — mais elle **rappelle la note initiale** : son numéro, sa date, les références du set et la période de location, sans quoi le retard flotterait sans rattachement à sa location. Elle suppose donc un lien en base vers la note initiale, et une note initiale peut en porter plusieurs.

Son émission se décide **à la restitution**, dans l'écran Réservations : l'action « Set rendu » d'aujourd'hui se dédouble en deux boutons exclusifs — **« Restitution conforme »**, qui clôt sans rien émettre, ou **« Établir une note complémentaire »**, qui ouvre la saisie des montants dus. L'un des deux est obligatoire : c'est ce geste qui clôt l'état des lieux, et le laisser facultatif laisserait des restitutions dans un état indéterminé.

Le nom du client figure sur la note **sauf opposition de sa part**, exprimée par un réglage de son espace client. Cette opposition ne vaut que pour la note : le récapitulatif des ventes du back-office garde le nom, puisqu'il sert au recoupement comptable.

Deux exports depuis l'admin les accompagnent (module 11) : l'**export des ventes** sur une période — chiffre d'affaires total, puis une ligne par client avec la date de paiement et le set loué — et l'**export des notes** émises sur une période, par lot, dans un zip. La période se choisit avec deux champs **début** et **fin**, doublés d'un **bouton « année civile »** et de son sélecteur d'année qui remplit les deux champs.

## 11. Ce qui reste à faire

L'avancement, les prochaines étapes et les questions encore ouvertes avec la cliente sont tenus dans `AVANCEMENT.md`.
