# Set et Brique, avancement

État du développement de la plateforme, module par module de la spécification (`specification-fonctionnelle.md`), avec le journal des étapes. La doc technique est dans `FONCTIONNEMENT.md`. Mis à jour à chaque étape.

Dernière mise à jour : 17 septembre 2026.

## 1. Où on en est

| Module (spécification) | État | Ce qui est en place | Ce qui manque |
| --- | --- | --- | --- |
| 1. Catalogue et stock | **Fait** | Fiche set complète (numéros multiples, marque, notices papier/numérique, figurines, dimensions, temps de montage, commentaire public, poids interne, caution, battement par set), 10 photos max, multi-exemplaires, statuts calculés Disponible / Location / Battement / Réparation / Retiré, catalogue et fiche publics, les 28 sets de la grille de la cliente importés | Photos des sets, vérification par la cliente des gammes déduites et des textes |
| 2. Planning des locations | **Fait en partie** | 5 lieux de remise, durée libre à 2 €/jour, jours calendaires, battement entre clients différents et aucun battement pour le même client qui enchaîne, périodes fermées, blocage par set via « En réparation » | Planning propre à chaque lieu (une remise à la fois) non contrôlé : validation manuelle |
| 3. Comptes clients et suivi | **Fait** | Compte Clerk, fiche client à la première demande avec nom, prénom, téléphone, adresse obligatoires, compte bloqué par les gérants, espace `/compte` avec ses réservations, gestion du compte `/compte/profil` (Clerk + onglets Coordonnées et Historique), lieu de remise préféré, suivi récupéré / à rendre / retard sur chaque location | Rien de bloquant ; la purge des données au bout de 3 ans reste à écrire (voir §2) |
| 4. Paiement Stripe | **Pas commencé** | Colonnes Stripe prévues en base, statut `pending_payment` | Tout le paiement, la caution, les délais de blocage (1 h, 15 min). Bloqué par deux questions ouvertes, voir §3 |
| 5. Tunnel de réservation | **Fait** | Set → dates → lieu → coordonnées → CG → demande en attente ; validation manuelle par les gérants : accepter, refuser, proposer d'autres dates ; réponse du client ; annulation | Paiement (module 4), bon cadeau (module 6) |
| 6. Bons cadeaux | **Commencé** | Table `gift_vouchers` (migration 0010) : montant, origine achat/admin, statut valide/utilisé/annulé, lot, note interne, expiration. Écran admin `/admin/bons-cadeaux` : génération à l'unité ou en lot, liste avec filtres, marquer utilisé, annuler | Achat en ligne par le client (paiement, module 4), utilisation comme moyen de paiement dans le tunnel de réservation, email d'envoi du bon |
| 7. Contrat et CG | **Fait en partie** | Case à cocher obligatoire, horodatée en base | Contrat PDF généré, texte légal définitif |
| 8. Facturation | **Pas commencé** | | Tout |
| 9. État des lieux et dommages | **Commencé** | Statut « En réparation » et note interne par exemplaire, état des lieux en commentaire libre au retour, retard calculé et affiché | Séquence de retard J-1 / J / J+1 / J+2, barème, forfaits |
| 10. Notifications | **Pas commencé** | Historique `booking_events` sur lequel se brancher | Fournisseur d'email à choisir (aucune clé dans le projet), templates modifiables |
| 11. Back-office et reporting | **Fait en partie** | Admin : tableau de bord, sets, forfaits, lieux, fermetures, réservations, bons cadeaux. Rôles admin et superadmin | Contenus du site, maintenance, réglages, CA du mois, taux d'occupation, export des ventes |
| 12. Déploiement et formation | **En cours** | Déploiement Vercel automatique, base Neon partagée | Instance Clerk de production, domaine final, formation |

## 2. Hypothèses prises sans règle explicite

À valider avec la cliente, à corriger si elle tranche autrement.

- La remise ne peut pas être demandée pour le jour même : la première date proposée est demain.
- Une demande acceptée passe en « acceptée, paiement à venir » (`pending_payment`) et s'arrête là tant que le module 4 n'est pas construit.
- L'exemplaire est attribué dès la demande, pas à la confirmation, pour bloquer les dates. Les gérants pourront le changer.
- Le client peut annuler lui-même tant que sa demande n'est pas acceptée ; ensuite il doit contacter les gérants (la politique d'annulation du module 7 s'applique après paiement).
- « Blocage par set » (module 2) = passer l'exemplaire « En réparation » ; pas de blocage par dates propre à un set.
- **Les gérants ne modifient pas les dates d'une demande.** Le client a choisi ses jours ; s'ils ne conviennent pas, la demande est refusée avec un motif et il refait une demande. Les gérants ajustent seulement le lieu et l'heure de remise. Décision du 16 septembre 2026, qui retire la proposition d'autres dates mise en place le matin même.
- **Heure de remise demandée dans le tunnel.** La spécification (module 2) prévoyait « une date, pas d'heure » en V1, l'heure se négociant ensuite. Décision du 16 septembre 2026 : le client indique une heure souhaitée (par quart d'heure) que les gérants confirment ou modifient en proposant d'autres dates. Ça évite un aller-retour par téléphone dans le cas simple.
- **Conservation des données clients : 3 ans après la dernière activité** (dernière location terminée ou dernière connexion), ou dès la suppression du compte par le client. Décision du 16 septembre 2026. Les factures, contrats et pièces comptables vivent dans le logiciel comptable, avec leurs propres durées légales (6 ans fiscal, 10 ans comptable) ; la plateforme n'a donc pas à les porter. Passé le délai : suppression du compte Clerk et des coordonnées, réservations conservées anonymisées (statistiques). Reste à faire : la purge elle-même (script ou tâche planifiée), l'export du contrat et de l'acceptation des CG vers l'archive comptable au moment de la facturation, et la mention dans la politique de confidentialité.


## 3. Questions ouvertes avec la cliente

Les deux points encore en attente dans la spécification bloquent le module 4 :

1. Le paiement est-il pris **avant ou après** la validation manuelle ? Et en cas de refus d'une demande déjà payée, remboursement automatique ?
2. Si le loyer est payé par **TPE** sur place, comment se pose la pré-autorisation de la caution ?

Autres points à poser quand l'occasion se présente :

- Délai minimal entre la demande et la remise (aujourd'hui : dès le lendemain).
- Faut-il une durée minimale de location au-delà d'un jour ? (réglage `min_rental_days`, à 1)
- Domaine final du site : lequel, et chez quel registrar ? Nécessaire pour l'instance Clerk de production (voir §4).
- Grille des sets : la gamme (Star Wars, Ideas, Technic…) a été déduite du numéro de boîte, à vérifier. Trois sets sans gamme : Coupe du Monde (43020), La mine de l'Ouest (Pantasy 85025), Échecs pirate (40158). La description du Faucon Millenium cite le 75105 alors que le numéro saisi est 75257. Le set « Test : voiture de course » reste publié.

## 4. Prochaines étapes, dans l'ordre proposé

1. Emails transactionnels : choisir un fournisseur (Resend est le plus simple avec Vercel), ajouter la clé dans Vercel, envoyer aux transitions demande reçue / acceptée / refusée, puis set remis / set rendu. Les gérants doivent pouvoir modifier les textes (module 10).
2. Paiement Stripe et caution (module 4), une fois les deux questions tranchées.
3. Contenus du site et réglages dans l'admin (avis, presse, textes, battement par défaut).
4. Séquence de retard, état des lieux et barème (module 9), puis facturation (8), contrat PDF (7), bons cadeaux (6), reporting (11).

### Passage de Clerk en production (module 12)

Clerk reste le service de comptes en production : plan gratuit suffisant, aucun changement de code. La vérification de l'e-mail à l'inscription et les mails de compte (mot de passe oublié, codes) sont envoyés par Clerk, pas par un service à nous. Étapes, dans l'ordre, une fois le domaine connu :

1. Rattacher le domaine au projet Vercel.
2. Dans le Dashboard Clerk, renommer l'application « Set et Brique » et créer l'instance de production sur ce domaine.
3. Ajouter les cinq CNAME fournis par Clerk (deux pour l'authentification, trois pour les mails). Si le domaine est chez Vercel, `vercel dns add` suffit ; sinon les saisir chez le registrar. Attendre la validation par Clerk.
4. Créer des identifiants Google OAuth dans la console Google Cloud et les renseigner dans Clerk : la connexion Google de l'instance de développement ne fonctionne pas en production.
5. Remplacer `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY` dans Vercel (Production), redéployer.
6. Les comptes de l'instance de développement ne sont pas repris : Marion et Gaëtan recréent leur compte, puis `pnpm role <email> admin` (et `superadmin` pour Agon-Gate).

## 5. Journal

### 17 septembre 2026

- **Revue de sécurité, deux correctifs**. Les notes internes des gérants (`customers.adminNote`, `customers.blockedReason`, `bookings.adminNote`, `bookings.returnNote`) partaient dans la charge RSC de `/compte`, `/compte/profil` et du tunnel : les lignes entières étaient passées en prop à des composants client. Projection explicite des colonnes (`customerPublicColumns`, `bookingCustomerColumns` dans `lib/bookings.ts`), type `CustomerBooking` sur la carte de réservation. `safeReturnPath()` acceptait `/\hôte`, lu comme une origine externe par le navigateur : redirection ouverte fermée.

- **Calendrier de disponibilités sur la fiche set**. Cadre « Disponibilités » avec un mois à la fois, navigation sur six mois, trois états (disponible, déjà loué, fermé) et jours passés grisés. Calcul pur jour par jour (`computeDayAvailability()`), réutilisant la recherche d'exemplaire libre du tunnel : locations prévues, demandes en attente, battement et périodes fermées sont exclus.

### 16 septembre 2026

- **Base et fiche set** (`a189d0a`). Table `sets` alignée sur la spécification, migration 0003, battement global à 4 jours. Formulaire admin en cinq blocs, 10 photos max. Catalogue public avec statut du jour et fiche set. Correction des sous-requêtes de la liste admin (la photo principale n'apparaissait jamais) et de l'avertissement SSL de `pg` que Next affichait comme une erreur.
- **Lieux de remise et périodes fermées** (`b7c35cc`). Deux écrans admin, cinq lieux confirmés dans le seed.
- **Tunnel de réservation jusqu'à la demande en attente** (`6b99e7f`). Statuts `pending_review` et `date_proposed`, migration 0004 (type recréé, l'ajout de valeur d'enum n'étant pas utilisable dans la même transaction) et 0005 (durée minimale à 1 jour, plus de maximum). Tunnel client, espace `/compte`, écran Réservations avec accepter / refuser / proposer d'autres dates, blocage du client. Tests : recherche d'exemplaire libre (12 cas purs), création de demandes sur la base (battement, prolongation, fermetures).
- **Import des 28 sets de la cliente**. Script `scripts/import-sets.ts` (`pnpm db:import-sets 00/Sets_LEGO.csv`), parseur CSV maison, fusion des lignes de suite (Ninjago = 71720 + 70613), valeurs normalisées, un exemplaire par set, publiés sans photo. Relance sans doublon. Catalogue : 29 sets, tous disponibles.
- **Filtre par gamme sur le catalogue**. Pastilles avec compteur, paramètre d'URL `?gamme=`, rendu côté serveur.
- **Comptes** : inscription testée avec succès sur l'instance Clerk de développement (e-mail + code de vérification). Plan de passage en production noté en §4.
- **Gestion du compte** : « Gérer le compte » du bouton utilisateur envoyait vers la page des locations. Nouvelle page `/compte/profil` avec le composant Clerk `UserProfile`, lien depuis `/compte`.
- **Coordonnées et historique dans la gestion du compte**. Onglet Coordonnées (identité, adresse, téléphone pour contrat et facture, lieu de remise préféré pré-sélectionné dans le tunnel), onglet Historique des réservations. Migration 0006 (`customers.preferred_pickup_point_id`). Correctif : les onglets n'apparaissaient pas en ligne, Clerk exige qu'ils soient déclarés dans un composant client.
- **Remise et retour dans l'admin**. Actions « Set remis » (dès l'acceptation, le loyer pouvant être réglé par TPE) et « Set rendu » avec date et état des lieux libre (migration 0007, `bookings.return_note`). Liste admin en cinq groupes, retard calculé à partir de J+1 et affiché en rouge, alerte sur le tableau de bord. Un set dehors non rendu reste indisponible au catalogue et pour les demandes. Suivi côté client sur chaque carte. Tests : retard et fin effective (unitaires), set en retard sur la base (indisponible, puis libre une fois rendu).
- **Coordonnées obligatoires avant de réserver**. L'inscription mène à l'onglet Coordonnées ; la page de réservation renvoie vers cet onglet tant que la fiche est incomplète, puis ramène à la réservation. Cadre Clerk sans défilement interne, téléphone au format 06 12 34 56 78.
- **Liste des réservations refondue, heure de remise**. Cartes lisibles (période en dates courtes, lieu et heure de remise, téléphone) avec les boutons Accepter, Modifier, Refuser sur les demandes à traiter. Heure de remise demandée dans le tunnel, modifiable par les gérants (migration 0008, `bookings.pickup_time`). Bandeau jaune du tableau de bord et fonds de cartes enfin appliqués (`.brick-card` passé dans `@layer components`).
- **Plage horaire par lieu de remise** (migration 0009). Les gérants fixent, lieu par lieu, les heures entre lesquelles le client peut demander la remise ; le tunnel borne le champ heure et le serveur revérifie.
- **Décision simplifiée sur une demande**. Plus de proposition d'autres dates : les gérants modifient seulement le lieu et l'heure de remise, puis acceptent (vert) ou refusent (rouge, bouton). Lieux : boutons colorés (ajouter bleu, enregistrer vert, supprimer rouge), interrupteur et suppression sur une ligne.
- **Bons cadeaux, première version admin** (`e11db65`, fusionné avec les 46 commits ci-dessus dans `d3ed70a`). Table `gift_vouchers` (migration 0010, appliquée après `vercel env pull` sur le nouveau compte Vercel payant) et écran `/admin/bons-cadeaux` : génération à l'unité ou en lot (même montant, étiquette de lot facultative, note interne), liste avec filtres (état, origine, recherche par code ou lot), marquer utilisé, annuler. Conflit de fusion réel sur `lib/format.ts` : `formatDate` existait déjà côté `main` pour une date ISO jour seul (réservations) ; renommé `formatDateTime` côté bons cadeaux, qui formate un timestamp complet. Pas encore branché sur le tunnel de réservation ni sur un achat en ligne (module 4, paiement).

### Avant le 16 septembre 2026

- Site vitrine repris de l'ancien site : accueil, avis, presse, Vinted, contact, mentions légales, CGU, charte graphique.
- Socle : Next.js 16, Neon + Drizzle, Clerk avec rôles, Vercel Blob, seed, écrans admin Forfaits et Sets (première version).
