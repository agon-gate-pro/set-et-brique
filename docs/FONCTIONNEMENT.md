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
| `pnpm db:seed` | Amorce la base (avis, presse, lieu de remise, réglages, grille tarifaire d'exemple). Sans effet si déjà fait |

## 3. Organisation du code

```
app/              pages et layouts (App Router)
  page.tsx        accueil
  catalogue/      catalogue public
  qui-sommes-nous/, mentions-legales/, cgu/
components/       en-tête, pied de page, composants réutilisables
lib/
  site.ts         constantes du site (contact, liens, textes de secours)
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

Deux chaînes de connexion : `DATABASE_URL` (avec pooler, utilisée par l'application) et `DATABASE_URL_UNPOOLED` (directe, utilisée par les migrations). C'est la recommandation de Neon.

### Tables

**Clients et comptes**

- `customers` : un client par compte Clerk (`clerk_user_id`). Coordonnées et note interne. Le compte de connexion vit chez Clerk, la fiche client vit ici.

**Catalogue**

- `sets` : un modèle de set (nom, numéro, thème, pièces, âge, caution, statut `draft` / `published` / `archived`). Seuls les sets `published` apparaissent sur le site.
- `set_images` : photos d'un set, ordonnées.
- `set_copies` : les exemplaires physiques d'un set. Un set peut exister en plusieurs exemplaires, chacun avec son état (`new`, `very_good`, `good`, `worn`) et son statut (`available`, `maintenance`, `retired`). C'est l'exemplaire qui est réservé, pas le modèle.
- `price_tiers` : grille tarifaire dégressive. Chaque palier donne un prix par jour à partir d'un nombre de jours minimum. Une grille sans `set_id` est la grille par défaut ; un set peut avoir la sienne.

**Logistique**

- `pickup_points` : lieux de remise en main propre proposés au client.
- `blackout_periods` : périodes sans remise ni retour (vacances des gérants).

**Réservations**

- `bookings` : une réservation = un client, un set, des dates, un exemplaire attribué, un lieu de remise, les montants (`rental_cents`, `deposit_cents`) et les identifiants Stripe. Les montants sont en centimes d'euro, en entiers, pour éviter les erreurs d'arrondi. Le champ `reference` est un code court communiqué au client.
- `booking_events` : historique des changements de statut et des actions, avec l'auteur (`customer`, `admin`, `system`).

**Contenu éditable**

- `testimonials`, `press_articles` : avis clients et articles de presse affichés sur l'accueil.
- `site_settings` : réglages et textes modifiables en clé / valeur JSON (rayon de livraison, délai de remise en état, textes d'accueil).

### Cycle de vie d'une réservation

```
pending_payment ──paiement Stripe──▶ confirmed ──remise──▶ picked_up ──retour──▶ returned
       │                                 │
       └──────── annulation ─────────────┴──▶ cancelled
```

- `pending_payment` : créée quand le client lance le paiement. Bloque l'exemplaire pendant un court délai (session Stripe), puis expire.
- `confirmed` : paiement reçu, exemplaire attribué, client prévenu.
- `picked_up` : remise faite, empreinte de caution posée.
- `returned` : set rendu et vérifié, empreinte libérée (ou capturée partiellement en cas de pièces manquantes).
- `cancelled` : annulation par le client ou par les gérants.

### Disponibilité

Un exemplaire est disponible sur une période si aucune réservation `pending_payment`, `confirmed` ou `picked_up` ne le chevauche, en ajoutant un délai de remise en état entre deux locations (réglage `turnaround_days` dans `site_settings`). Un set est disponible si au moins un de ses exemplaires `available` l'est. Les `blackout_periods` interdisent les dates de début et de fin qui tombent dedans.

### Prix

Pour N jours, on prend le palier de la grille (celle du set, sinon la grille par défaut) avec le plus grand `min_days` inférieur ou égal à N. Total = N × prix par jour du palier. La grille par défaut actuelle est un exemple (5 €, 4 € et 3 € par jour selon la durée), à remplacer par les vrais tarifs depuis l'admin. La caution est un montant fixe par set (`sets.deposit_cents`) ; elle n'est pas débitée mais bloquée sur la carte au moment de la remise.

## 6. Étapes suivantes

- Espace admin (Clerk, rôle `admin`) : sets, exemplaires, tarifs, lieux, périodes fermées, réservations, contenus.
- Parcours client : catalogue depuis la base, fiche set, calendrier de disponibilité, réservation et paiement Stripe.
- Emails transactionnels (confirmation, rappel de retour).
