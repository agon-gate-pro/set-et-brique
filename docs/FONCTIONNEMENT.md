# Set et Brique, comment ça fonctionne

Documentation technique de la plateforme, pour les développeurs qui reprennent le projet. Elle décrit l'état actuel du code et de la base, et elle est mise à jour à chaque étape. Plusieurs documents vivent dans `docs/` :

| Document | Rôle |
| --- | --- |
| `FONCTIONNEMENT.md` (celui-ci) | comment ça marche : architecture, base, règles implémentées, écrans |
| `AVANCEMENT.md` | ce qui est fait, ce qui reste, les questions ouvertes, le journal par étape |
| `specification-fonctionnelle.md` | les règles métier attendues, module par module, avec ce qui est confirmé ou en attente |
| `DESIGN-SYSTEM.md` | couleurs, composants et conventions visuelles, avec les règles apprises par itération |

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

- `pickup_points` : lieux de remise en main propre proposés au client, dans l'ordre `sort_order`. `slots` (jsonb, `{ from, until }[]`, vide = toute heure) liste un ou plusieurs créneaux horaires dans lesquels le client peut demander la remise (ex. 09:00–12:00 et 17:00–19:00) ; le tunnel affiche les créneaux en indication et le serveur revérifie (`isWithinOpening()`). Un lieu `active = false` n'est plus proposé mais reste dans l'historique des réservations. Le seed crée les cinq lieux confirmés par la cliente (Lanester, Guidel, Kerizan, Monistrol, Plouay).
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

### Prix

Chaque set est rattaché à un forfait, sinon au forfait par défaut. Total de la location = nombre de jours × prix par jour du forfait. Au démarrage, un seul forfait existe, « Forfait 1 » à 2 € par jour, marqué par défaut ; les gérants créent les autres forfaits depuis l'admin et les affectent set par set. La caution est un montant fixe par set (`sets.deposit_cents`) ; elle n'est pas débitée mais bloquée sur la carte au moment de la remise.

## 6. Comptes et rôles

Les comptes sont gérés par Clerk. Les pages `/connexion` et `/inscription` affichent les composants Clerk (en français, aux couleurs du site). Après l'inscription, le nouveau client arrive sur l'onglet Coordonnées de son compte (`forceRedirectUrl` du composant `SignUp`) ; s'il venait d'une page de réservation, elle est gardée en paramètre `retour` et il y revient une fois les coordonnées enregistrées. Seuls les chemins internes sont acceptés comme retour (`safeReturnPath()`). La gestion du compte est la page `/compte/profil`, atteinte par « Gérer le compte » du bouton utilisateur du header et par le bouton « Gérer mon compte » de `/compte`. C'est le composant `UserProfile` de Clerk avec quatre onglets :

| Onglet | Qui le fournit | Contenu |
| --- | --- | --- |
| Compte | Clerk | photo, nom, adresses e-mail, comptes connectés (lier un compte Google à un compte créé par e-mail, pour se connecter ensuite avec l'un ou l'autre) |
| Sécurité | Clerk | mot de passe, sessions actives, suppression du compte |
| Coordonnées | nous (`app/compte/profil/profile-form.tsx`, action `saveCustomerProfile`) | prénom, nom, téléphone, adresse, code postal, ville, lieu de remise préféré (les six premiers obligatoires, astérisque sur le libellé) ; écrit dans `customers` via `upsertCustomer` |
| Historique | nous | toutes les réservations du client, en lecture ; les actions restent sur `/compte` |

Les onglets à nous sont des `UserProfile.Page` déclarées dans un composant client (`profile-panel.tsx`) : Clerk les reconnaît en comparant le type des éléments enfants, ce qui échoue si les éléments sont créés côté serveur. Leur contenu, lui, est rendu côté serveur et passé en props. Le téléphone est normalisé à l'enregistrement (`formatPhone()` de `lib/format.ts` : « 06 12 34 56 78 », les formes +33 ou avec points ramenées à celle-ci, les numéros étrangers gardés tels quels) et affiché ainsi partout, avec un lien `tel:`. Les coordonnées servent au contrat et à la facture ; elles sont pré-remplies dans le tunnel, où le client peut encore les corriger (ce qui met la fiche à jour). Le lieu de remise préféré (`customers.preferred_pickup_point_id`, migration 0006) pré-sélectionne le lieu dans le tunnel, sans l'imposer. Le fichier `proxy.ts` à la racine (l'équivalent du middleware dans Next.js 16) exige une session pour `/admin`, `/compte` et le tunnel `/catalogue/<slug>/reserver`.

Dans l'onglet Coordonnées, le code postal propose la ville via l'API publique `geo.api.gouv.fr` (`app/compte/profil/postal-city-fields.tsx`, sans clé, appelée depuis le navigateur) : remplissage automatique si le champ Ville est vide et qu'une seule commune correspond, sinon suggestions dans la liste native du champ (`<datalist>`) sans écraser une saisie déjà faite. Bouton Enregistrer aligné à droite, comme dans les fiches de l'espace de gestion (`app/admin/sets/set-form.tsx`).

Dans l'onglet Compte (page native Clerk, pas la nôtre), le bouton qui enregistre le nom et la photo est renommé « Enregistrer » par une surcharge de la localisation (`app/layout.tsx`, `clerkLocalization`, clé `userProfile.start.profileSection.primaryButton`). Son emplacement dans la page reste celui que Clerk lui donne : contrairement à Coordonnées, cet onglet n'est pas un de nos composants et son agencement n'est pas personnalisable au-delà des couleurs, polices et textes exposés par l'API d'apparence de Clerk.

Trois niveaux d'utilisateurs, distingués par `publicMetadata.role` côté Clerk :

| Rôle | Qui | Accès |
| --- | --- | --- |
| aucun | les clients | catalogue, réservation, `/compte` |
| `admin` | les gérants (Marion et Gaëtan) | `/admin` : sets, exemplaires, réservations, forfaits, contenus |
| `superadmin` | Agon-Gate | tout `admin`, plus `/admin/maintenance` (réglages techniques, rôles) |

Le contrôle du rôle se fait côté serveur dans `app/admin/layout.tsx` via `requireRole()` de `lib/auth.ts`. Le rôle est lu dans le jeton de session si le Dashboard Clerk expose `metadata` dans les claims (Sessions > Customize session token : `{"metadata": "{{user.public_metadata}}"}`), sinon via l'API Clerk. Les deux chemins fonctionnent, le premier évite un appel réseau par page.

Le header du site (`components/site-header.tsx`) affiche une pastille jaune « Espace de gestion » (lien `/admin`) pour les comptes `admin` et `superadmin`, en plus du bouton « Réserver un set » masqué pour ces mêmes comptes. Ce rôle est relu ici côté client (`useUser()` de Clerk) pour ne pas rendre tout le site dynamique ; la vraie protection de `/admin` reste `requireRole()` côté serveur. Pour la même raison, le prénom du client n'est pas lu depuis le layout mais via un petit appel client à `/api/customer-name` (route qui interroge `customers` par `clerk_user_id`), déclenché à la connexion et à chaque enregistrement de l'onglet Coordonnées (événement DOM `customer-profile-updated`, dispatché par `profile-form.tsx`). Affiché avec un avatar (initiale du prénom, pas la photo Clerk) dans une même pastille cliquable, pas comme deux éléments séparés : la pastille entière est un lien direct vers `/compte/profil`, plutôt que le composant `UserButton` de Clerk (qui ouvrait un menu au clic, sans aller directement au profil). Seul le prénom (pas le nom) pour rester compact, visible à partir de `xl` ; en dessous, la pastille perd bordure et fond (`xl:` uniquement) et ne montre plus que l'avatar. Comme `UserButton` était aussi la seule façon de se déconnecter du site, un bouton « Se déconnecter » séparé (icône, `SignOutButton` de Clerk) l'accompagne dans le header desktop, et une entrée équivalente a été ajoutée au menu mobile (qui n'avait jamais eu de déconnexion directe).

Attribuer un rôle, une fois que la personne a créé son compte sur le site :

```bash
pnpm role marion@example.com admin
pnpm role contact@agon-gate.com superadmin
pnpm role marion@example.com none      # retirer
```

La fiche client en base (`customers`) n'est pas créée à l'inscription : elle est créée à la première demande de réservation ou au premier enregistrement de l'onglet Coordonnées, à partir du compte Clerk et des coordonnées saisies (mises à jour à chaque demande). Ça évite un webhook et une synchronisation à maintenir. Le tunnel (`/catalogue/<slug>/reserver`) est protégé par `proxy.ts` comme `/compte`.

### Où vivent les données d'un client

| Quoi | Où | Forme |
| --- | --- | --- |
| Identité de connexion : e-mail, mot de passe (haché), compte Google lié, prénom et nom saisis chez Clerk, photo, sessions actives | Clerk (serveurs Clerk, instance de développement aujourd'hui) | un utilisateur Clerk, identifié par `clerk_user_id` |
| Rôle gérant ou superadmin | Clerk, `publicMetadata.role` de l'utilisateur | attribué par `pnpm role` |
| Coordonnées de facturation et de contrat : prénom, nom, téléphone, adresse, code postal, ville | Postgres Neon, table `customers` | une ligne par client, créée à la première demande ou au premier enregistrement de l'onglet Coordonnées, reliée à Clerk par `clerk_user_id` |
| Lieu de remise préféré, blocage du compte et sa raison, note interne des gérants | Postgres, table `customers` | mêmes lignes |
| Réservations : set, exemplaire, dates, lieu, montants, statut, message du client, horodatage de l'acceptation des CG | Postgres, table `bookings` | une ligne par demande, rattachée à `customers.id` |
| Historique des changements de statut | Postgres, table `booking_events` | une ligne par transition |
| Paiements et caution (à venir, module 4) | Stripe, et les identifiants Stripe dans `bookings` | rien en base au-delà des identifiants |

L'e-mail est copié de Clerk dans `customers.email` à chaque enregistrement, pour que les gérants le voient sans appel à Clerk. Rien n'est stocké sur le disque du serveur ni dans le navigateur au-delà du cookie de session Clerk.

Règle de conservation retenue : 3 ans après la dernière activité du client, ou dès qu'il supprime son compte. Les factures et contrats sont archivés dans le logiciel comptable avec leurs durées légales propres, la plateforme n'en est pas le dépôt. Aujourd'hui, supprimer son compte depuis l'onglet Sécurité efface l'utilisateur chez Clerk mais laisse la ligne `customers` et les réservations, rattachées à un identifiant Clerk orphelin : la purge et l'anonymisation restent à écrire, voir `AVANCEMENT.md` §2.

Les clés Clerk fournies par l'intégration Vercel sont celles d'une instance de développement (`pk_test_`). Avant la mise en production sur le domaine final, il faudra créer l'instance de production dans le Dashboard Clerk et remplacer les clés dans Vercel.

## 7. Espace de gestion

Accessible sur `/admin` aux rôles `admin` et `superadmin`. Les écrans sont des pages serveur qui lisent la base avec Drizzle ; les modifications passent par des Server Actions (`actions.ts` dans chaque dossier), qui revérifient le rôle avec `requireRole()`, valident la saisie avec zod (`lib/validation.ts`) et renvoient un message d'erreur ou de succès affiché sous le formulaire. Les montants sont saisis en euros (« 12,50 ») et stockés en centimes.

Composants partagés dans `components/admin/form.tsx` : bouton d'envoi avec état « Enregistrement… », bouton de suppression en deux clics (`ConfirmButton`), champ avec libellé et aide, message de résultat. `ConfirmButton` a deux présentations : par défaut le bouton se transforme sur place (Confirmer / Annuler) ; avec la prop `asDialog`, une fenêtre centrée à l'écran demande confirmation à la place — utilisée pour les suppressions à plus lourde conséquence (un exemplaire, un set), pas pour le reste (lieux, forfaits, bons cadeaux…) qui garde le bouton sur place. En mode fenêtre, le bouton « Confirmer » ne ferme pas la fenêtre lui-même au clic (le démonter dans son propre clic annulerait l'envoi du formulaire, un piège classique de React) : il faut lui passer l'état de l'action (`state`, celui renvoyé par `useActionState` du formulaire parent) pour qu'elle se referme seule une fois l'action terminée sans erreur, et affiche l'erreur dans la fenêtre sinon (un `FormMessage` classique resterait masqué derrière).

Le menu de gauche (`components/admin/nav.tsx`) affiche le titre « Espace de gestion » (même pastille jaune que dans le header) et une icône par section ; la section « Maintenance » (superadmin) est séparée du reste par un trait. Les onglets « Contenus du site » et « Maintenance » sont pour l'instant sans page : à construire. Un changement de section ramène la fenêtre en haut (`window.scrollTo` sur le changement de route dans `AdminNav`) : par défaut Next.js garde la position de défilement tant que la page précédente reste visible, ce qui est toujours le cas ici puisque le menu est sticky.

### Tableau de bord (`/admin`)

Trois rangées de blocs : Sets au catalogue (cliquable, renvoie vers l'ajout d'un set), Clients, Bons cadeaux valides ; puis Sets en location actuellement, Réservations à traiter, Sets à remettre au client (les trois cliquables vers `/admin/reservations`, mêmes statuts que les groupes de cette page) ; puis le CA du jour, de la semaine et du mois, basé sur la date de début de location et les réservations `confirmed`, `picked_up` et `returned` uniquement. Bandeaux au-dessus pour les demandes à traiter et les retards, inchangés.

### Forfaits (`/admin/forfaits`)

Liste, création, modification du nom et du prix, choix du forfait par défaut, suppression. Un forfait ne peut pas être supprimé s'il est le forfait par défaut ou si des sets l'utilisent.

### Sets (`/admin/sets`)

- Liste sous forme de tableau (photo, nom, thème, exemplaires, tarif, caution, statut, lien Modifier), avec recherche (nom ou numéro de set) et filtres par statut et par thème, tout en instantané côté client (`components/admin/sets-table.tsx`) — la page charge tous les sets, le filtrage ne refait pas d'appel serveur.
- Création : la fiche, en cinq blocs (identité, contenu, location, textes affichés au client, publication), chaque bloc avec son titre en pastille rouge et un fond légèrement teinté pour bien le distinguer des autres. Les numéros de boîtes se saisissent en une ligne séparés par des virgules ; ils sont stockés en liste, sans doublon. Le `slug` de l'adresse publique est dérivé du nom, unique, et ne change que si le nom change. Un premier exemplaire est créé automatiquement, avec la date d'entrée en stock du jour.
- Fiche : exemplaires, modification, photos, suppression, dans cet ordre. Le champ Statut est un composant contrôlé (pas de `defaultValue`) pour éviter qu'il affiche une valeur différente de ce qui vient d'être enregistré.
- Exemplaires en premier, en onglets (`CopiesSection`, juste sous le nom du set) : un onglet par exemplaire (son libellé, ex. « Exemplaire 1 ») plus un onglet « + Nouvel exemplaire », choix conservé en état local (`selected`), pas dans l'URL. Le panneau sous les onglets affiche soit la fiche de l'exemplaire choisi (état, statut, note interne, Enregistrer, Supprimer en deux temps), soit le formulaire de création. Par défaut, le premier exemplaire. Après création, bascule automatiquement sur le nouvel exemplaire ; si l'exemplaire affiché est supprimé, retombe sur le premier restant (comparaison de la prop `copies` d'un rendu à l'autre, pendant le rendu — pas dans un effet). Avant, cette section était une liste en bas de la fiche ; déplacée en haut à la demande, un set pouvant avoir plusieurs exemplaires à suivre séparément (état, statut) alors que la fiche et les photos sont communes à tous. L'onglet et le panneau du premier exemplaire restent sur le fond blanc habituel (`bg-paper`) ; chaque exemplaire suivant a sa propre couleur, discrète (jaune, vert, bleu, puis ça boucle : `copyTints` dans `sections.tsx`), pour repérer d'un coup d'œil non seulement qu'on n'est pas sur le premier, mais lequel des autres. La couleur qu'aura le prochain exemplaire est déjà visible sur l'onglet « + Nouvel exemplaire » avant même de l'avoir créé. Les classes Tailwind sont écrites en toutes lettres dans ce tableau plutôt que composées avec le nom de la couleur en variable : Tailwind ne scanne pas les chaînes construites dynamiquement.
- Photos : envoyées sur Vercel Blob (store `set-et-brique-images`, accès public, variable `BLOB_READ_WRITE_TOKEN`), JPEG, PNG ou WebP jusqu'à 8 Mo, 10 photos par set au plus. À 10 photos, la zone d'ajout est remplacée par un message : retirer une photo avant d'en ajouter (`MAX_IMAGES_PER_SET`, dupliqué à l'identique côté client dans `sections.tsx` et côté serveur dans `actions.ts` — un fichier `"use server"` ne peut exporter que des fonctions, pas de constante partageable). Le champ, une zone cliquable en pointillés avec icône (`<label>` habillant un `<input type="file" multiple>` masqué en `sr-only`, le nombre et le nom des photos choisies affichés en dessous — un `<input type="file">` nu ne se voyait pas comme cliquable), accepte une sélection multiple, mais l'envoi reste une photo par appel de `addSetImage(setId, file, alt)`, invoqué directement en boucle depuis le client (pas un `<form action>` classique) : une requête par photo, pour ne jamais dépasser `serverActions.bodySizeLimit` (`next.config.ts`, 10 Mo, pensé pour une seule photo à la fois) quel que soit le nombre de photos choisies — envoyer les 10 en une seule requête multipart dépassait cette limite et Next rejetait tout le lot (« Unexpected end of form », corps tronqué). Pendant l'envoi, une fenêtre centrée à l'écran indique la photo en cours (nom du fichier) et l'avancement (« Photo 3 sur 10 », barre de progression) ; une photo refusée (format, poids) n'interrompt pas le lot : les suivantes sont quand même envoyées, et le message final liste les échecs, une erreur identique répétée (ex. limite de 10 atteinte pour chaque photo suivante) étant regroupée en une seule ligne plutôt que répétée. Pas de description à l'import (un texte commun à tout un lot n'aurait pas de sens) : elle s'ajoute après coup, sous la vignette de chaque photo (`AltEditor`, enregistrée par `updateSetImageAlt` quand le champ perd le focus, seulement si la valeur a changé). La première de la liste est la photo principale ; l'ordre se règle soit par glisser-déposer (HTML natif, `draggable`, état local optimiste recalé sur la prop serveur, action `reorderSetImages(setId, orderedIds)` qui écrit l'ordre complet en une transaction), soit avec les flèches ← / → pour rester accessible au clavier (`moveSetImage(id, direction)`, un `formAction` lié par photo, dans un composant à part — `MoveButtons` — pour que `useFormStatus` n'indique l'attente que sur les deux boutons concernés : ils se grisent et affichent « … » pendant le déplacement). Retirer une photo la supprime directement (pas de confirmation en deux temps comme les exemplaires ou le set : une photo se réajoute en un envoi, moins critique) et la retire aussi du stockage.
  Champs d'un exemplaire : libellé, date d'entrée en stock (`stock_entry_date`, migration 0011 ; saisie à la main, pas déduite de la date de création de la fiche), état, statut, note interne. Cinq champs sur trois colonnes (`sm:grid-cols-3`) plutôt que quatre sur deux, pour que le bloc ne prenne pas une ligne de plus qu'avant. Un exemplaire déjà réservé ne se supprime pas : le passer en « Retiré ». Pour bloquer un set le temps d'un souci (retard, casse), le passer en « En réparation ». Le dernier exemplaire d'un set ne peut pas être supprimé non plus (ça reviendrait à vider le set) : le bouton est remplacé par une explication, et l'action `deleteCopy` refuse aussi côté serveur si elle est appelée directement — le rendu seul n'est pas une barrière de sécurité.
- Suppression d'un set : refusée s'il a déjà été réservé, il faut alors l'archiver.

### Import en masse depuis la grille CSV (`scripts/import-sets.ts`)

La cliente a rempli une grille « Liste des sets LEGO disponibles à la location » (une ligne par set, colonnes Titre, Description, pièces, dimensions, numéro, notices, type de notice, figurines, temps de montage, âge, marque, caution). `pnpm db:import-sets <fichier.csv>` la lit et crée les sets, avec `--dry-run` pour vérifier sans écrire.

- Une ligne **sans titre** est la suite du set précédent : un article de location composé de plusieurs boîtes officielles. Les numéros sont cumulés dans `set_numbers`, les pièces, notices et figurines additionnées, les dimensions concaténées avec « + ».
- Normalisation : caution « 150 € » ou « 150 » en centimes, « PAPIER » / « NUMERIQUE » en `paper` / `digital`, temps de montage ramené à « N h », âge « 9 ans et + » à 9, marque « Lego » en `LEGO`. Les titres du CSV (souvent en capitales, quelques coquilles) sont remplacés par une forme lisible définie dans le script, qui sert aussi de slug.
- La gamme (`theme`) n'est pas dans la grille : le script la déduit du premier numéro de boîte avec une table écrite à la main, à faire vérifier par la cliente.
- Les sets sont créés **publiés**, sans photo (la carte affiche « Photo à venir »), avec un exemplaire « Exemplaire 1 » et le forfait par défaut, comme la création dans l'admin.
- Idempotent : un set dont le premier numéro de boîte existe déjà est ignoré, on peut relancer sans doublon.

### Lieux de remise (`/admin/lieux`)

Liste ordonnée (flèches), création, modification, activation, suppression. Un lieu avec des réservations **en cours** (tous les statuts sauf rendue/annulée) ne se supprime pas : le désactiver ou le modifier reste possible. Un lieu qui n'a plus que des réservations passées (rendues, annulées) reste supprimable ; ces réservations gardent leur historique, seul leur lieu de remise repasse à vide (`ON DELETE SET NULL`). Chaque lieu peut avoir plusieurs créneaux horaires de remise (ex. 09:00–12:00 et 17:00–19:00), ajoutés et retirés un par un ; sans créneau, toute heure est proposée. L'heure précise reste à confirmer avec le client après la réservation (spécification, module 2).

### Périodes fermées (`/admin/fermetures`)

Fermetures à venir modifiables, création, suppression ; les périodes passées sont listées en bas pour mémoire. Si une réservation active a sa remise ou son retour dans la période, l'écran l'indique en rouge : c'est aux gérants de contacter le client, rien n'est annulé automatiquement. Pour bloquer un seul set (retard, casse), on passe son exemplaire « En réparation » depuis la fiche du set, ce qui couvre le « blocage par set » de la spécification.

### Réservations (`/admin/reservations`)

Liste en cinq groupes : à traiter (`pending_review`), en attente du client (`date_proposed`), à remettre (`pending_payment`, `confirmed`), en cours de location (`picked_up`, triées par date de retour, retard en rouge), terminées et annulées. Chaque carte montre la référence, le set, le client et son téléphone, la période de location en dates courtes (17/09/2026), le lieu et l'heure de remise. Une demande à traiter porte directement ses trois boutons : Accepter (vert), Modifier (jaune, renvoie au bloc Décision de la fiche pour le lieu et l'heure) et Refuser (rouge, avec confirmation, sans motif ; le motif se saisit depuis la fiche). Ces mêmes statuts alimentent les blocs cliquables et l'alerte de retard du tableau de bord (§7, plus haut). La fiche d'une réservation montre la location, le client (avec blocage et déblocage du compte), la note interne, les décisions possibles et l'historique.

- **Accepter** : `pending_review` → `pending_payment`. Rien d'autre n'est déclenché pour l'instant (pas d'email, pas de paiement).
- **Modifier la remise** : lieu (parmi les lieux actifs) et heure seulement, sans changement de statut ; les dates et la durée restent celles du client. La modification est tracée dans l'historique et visible du client dans son espace. Possible tant que le set n'est pas remis.
- **Refuser** : `cancelled` avec un motif visible du client, possible aussi sur une demande déjà acceptée tant qu'elle n'est pas payée.
- **Set remis** : `pending_payment` ou `confirmed` → `picked_up`, avec la date (aujourd'hui par défaut, jamais dans le futur) et une précision facultative pour l'historique (« loyer encaissé par TPE »). Refusé si aucun exemplaire n'est attribué.
- **Set rendu** : `picked_up` → `returned`, avec la date (pas avant la remise, pas dans le futur) et l'état des lieux en commentaire libre, jamais visible du client. Le retard éventuel est écrit dans l'historique.

Pas d'annulation d'une remise ou d'un retour enregistrés par erreur pour l'instant : le passer par la maintenance si ça arrive.

### Bons cadeaux (`/admin/bons-cadeaux`)

Génération à l'unité ou en lot (jusqu'à 200 bons du même montant en une fois), avec étiquette de lot et note interne facultatives ; chaque bon reçoit un code unique. Liste filtrable par état (valide, utilisé, expiré, annulé), origine et recherche (code ou lot). Actions sur un bon valide : marquer utilisé, annuler (deux clics, sans motif). Pas encore de vente en ligne ni d'utilisation comme moyen de paiement dans le tunnel : ces bons servent aujourd'hui aux avoirs et aux lots papier remis à la main.

### Statistiques (`/admin/statistiques`)

Chiffre d'affaires des 12 derniers mois en barres (réservations `confirmed`, `picked_up` et `returned`, à la date de début de location, même règle que le tableau de bord). Cinq sets les plus loués, par nombre de réservations dans les mêmes statuts. Taux d'occupation glissant sur 30 jours : jours loués (recouvrement de chaque réservation avec la fenêtre) divisés par le nombre d'exemplaires actifs (hors « Retiré ») multiplié par 30 — approximation qui ne retire pas les exemplaires en réparation du dénominateur. Bons cadeaux : valeur totale émise, utilisée, encore en circulation (valides et non expirés).

### Où vit un set

| Quoi | Où | Forme |
| --- | --- | --- |
| La fiche (textes, chiffres, caution, forfait, statut) | Postgres Neon, table `sets` | une ligne par article |
| Les photos | Vercel Blob, chemin `sets/<slug>/<horodatage>.<ext>` avec suffixe aléatoire | fichiers publics, l'URL est gardée dans `set_images` |
| Les boîtes physiques | Postgres, table `set_copies` | une ligne par exemplaire, rattachée au set |
| Les réglages communs (battement par défaut) | Postgres, table `site_settings` | une ligne par clé, valeur JSON |

Rien n'est stocké sur le disque du serveur : Vercel n'en garantit pas la persistance. Supprimer un set supprime ses photos du Blob et ses exemplaires (cascade en base).

## 8. Catalogue public

`/catalogue` liste les sets `published`, coups de cœur d'abord, avec photo principale, statut du jour, prix par jour (forfait du set ou forfait par défaut) et caution. En-tête resserré (titre et compteur de sets sur une ligne) pour laisser le plus de place possible à la liste, qu'on vient parcourir plutôt que lire. Pas de phrase de présentation sous le titre : celle qui évoquait la caution bloquée sur la carte « sauf casse ou perte » a été retirée, jugée à même d'inquiéter les clients dès l'arrivée sur le site. Un filtre par gamme (pastilles « Toutes », une par gamme avec son nombre de sets, « Autres » pour les sets sans gamme) s'applique par l'URL, `?gamme=harry-potter`, le slug étant dérivé du champ `theme` ; une valeur inconnue revient à « Toutes ». Sans set publié, la page renvoie vers Poppins et le contact. `/catalogue/<slug>` est la fiche, en deux colonnes. À gauche : la photo dans un carrousel (`image-carousel.tsx`, composant client — flèches gauche/droite superposées à l'image, `←`/`→` avec `aria-label`, compteur « n / total » en bas à droite ; pas de flèches s'il n'y a qu'une photo, « Photo à venir » sans flèches s'il n'y en a aucune), puis, à la place des vignettes d'avant, la description (« Le set ») et le commentaire public (« Bon à savoir »). À droite, dans cet ordre : statut, nom, gamme, bloc « En bref » (pièces, figurines, notices, dimensions, temps de montage, âge, marque, numéros), puis prix, caution et bouton de réservation — les infos du set avant celles de la réservation, demandé après coup (l'ordre inverse, testé d'abord, donnait l'impression que le prix passait avant de savoir ce qu'on loue). Une notice numérique déclenche l'encart d'avertissement demandé par la cliente. Le poids n'est jamais affiché. Un set disponible a un bouton « Réserver ce set » vers le tunnel ; un set indisponible propose « Être prévenu de son retour » (email pré-rempli).

## 9. Tunnel de réservation

Depuis la fiche d'un set disponible, « Réserver ce set » mène à `/catalogue/<slug>/reserver` (connexion requise). Si la fiche client est incomplète (nom, prénom, téléphone, adresse, code postal, ville : `isCustomerComplete()`), la page affiche à la place un message et un bouton « Compléter mes coordonnées » qui mène à l'onglet Coordonnées puis ramène ici.

Le client choisit d'abord sa période sur un calendrier en fenêtre (`booking-calendar.tsx`, composant client), ouvert automatiquement à l'arrivée sur la page : mois par mois (12 mois maximum à l'avance), un jour libre en clair et cliquable, un jour indisponible (loué, en battement ou fermeture) grisé et non cliquable. Premier clic sur un jour libre = date de remise, deuxième clic = date de retour ; un clic avant la date de remise déjà choisie relance la sélection depuis ce jour-là. La période choisie est surlignée en jaune (`bg-sun`), pas en rouge : le rouge (`brick`) reste réservé aux vrais messages d'erreur (période indisponible, durée trop courte), pour ne pas donner l'impression qu'il y a un problème alors que la sélection est valide. Le prix, dans la fenêtre comme dans le résumé du formulaire, s'affiche en vert (`leaf-deep`) plutôt qu'en rouge, pour la même raison. Les dates se lisent avec le jour de la semaine et l'année (« mercredi 23 septembre 2026 »), le jour et le mois mis en avant en gras (`DateReadable`, `date-readable.tsx`) pour rester lisibles dans une phrase « Du ... au ... » sinon entièrement en gras — le reste (jour de semaine, année) en texte normal. Utilisé dans la fenêtre, le résumé « Vos dates » du formulaire et le retour prévu. La fenêtre affiche en direct la durée, le prix estimé et un message si la durée minimale n'est pas atteinte ou si la période n'est finalement pas libre pour un même exemplaire (rare : peut arriver quand plusieurs exemplaires existent et qu'aucun n'est libre sur tout l'intervalle, même si chaque jour pris isolément l'est). Une fois validée, la fenêtre se ferme et la période choisie s'affiche avec un bouton « Modifier les dates » pour rouvrir le calendrier.

Le calendrier réutilise `findFreeCopy` et `isInBlackout` de `lib/availability-core.ts` — un module sans dépendance serveur (aucun import de `lib/db`), extrait de `lib/availability.ts` spécifiquement pour pouvoir tourner aussi bien côté serveur (calcul du statut affiché, création de la demande) que côté navigateur (aperçu dans le calendrier), sans dupliquer cette logique ni risquer qu'elle diverge. `lib/availability.ts` réexporte tout depuis ce module et garde seulement `loadAvailability`, qui interroge la base. Les réservations envoyées au calendrier ont leur `customerId` vidé côté serveur avant sérialisation : l'aperçu compare toujours à `null` (jamais à un client précis), inutile d'exposer l'identifiant d'autres clients au navigateur.

Une fois la période choisie, le client renseigne l'heure de remise souhaitée (`pickup_time`, par quart d'heure, dans la plage horaire du lieu choisi s'il en a une, confirmée ou ajustée par les gérants), le lieu de remise parmi les lieux actifs, laisse un message facultatif, renseigne ses coordonnées et coche les conditions générales. Le bouton d'envoi reste désactivé tant qu'aucune période n'est choisie. Le total (prix par jour × jours) et la date de retour s'affichent en direct ; la fin est comptée en jours calendaires (mardi + 4 jours = vendredi). Aucun paiement à cette étape.

Côté serveur (`lib/bookings.ts`), la demande est refusée avec un message clair si : le set n'est plus publié, le lieu n'est pas actif, la remise ou le retour tombe dans une fermeture, aucun exemplaire n'est libre, ou le compte est bloqué. Sinon la réservation est créée en `pending_review` avec sa référence, et le client est redirigé vers `/compte`, où il suit ses demandes, accepte une date proposée ou annule. Chaque carte lui dit où en est la location : remise prévue le, set récupéré le et à rendre le, retour en retard (avec invitation à contacter les gérants), set rendu le (spécification, module 3).

Hypothèses prises faute de règle dans la spécification : la remise ne peut pas être demandée pour le jour même, et le planning par lieu (une seule remise à la fois) n'est pas contrôlé automatiquement, c'est la validation manuelle qui s'en charge.

## 10. Ce qui reste à faire

L'avancement, les prochaines étapes et les questions encore ouvertes avec la cliente sont tenus dans `AVANCEMENT.md`.
