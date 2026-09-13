# Spécification fonctionnelle — Plateforme de location Set et Brique

**Date :** 13 septembre 2026

> Document interne (AGON-GATE) — à usage d'Alexis et Madus pour le développement. Ne pas diffuser tel quel à la cliente. Basé sur le devis, le contrat et les échanges de cadrage successifs.

## Objectif du document

Décrire, module par module, les règles métier concrètes à implémenter : statuts, données, comportements attendus, cas limites déjà tranchés, et ce qui reste en attente. Rien dans ce document n'est inventé — tout ce qui n'est pas explicitement confirmé ci-dessous doit être posé en question avant développement plutôt que supposé.

## Légende

- **CONFIRMÉ** — Règle confirmée, prête à développer.
- **EN ATTENTE** — En attente d'une réponse de la cliente (Marion) ou d'Alexis — cf. document « Questions en suspens ».
- **V2** — Reporté à une V2, ne pas développer maintenant.

---

## 1. Location pure — catalogue & stock

### Fiche article (par set)

Champs confirmés (document client du 11/09, exemple détaillé "Faucon Millénium" + catalogue complet) :

- **CONFIRMÉ** Titre.
- **CONFIRMÉ** Description (zone de texte libre).
- **CONFIRMÉ** Nombre de pièces total.
- **CONFIRMÉ** Dimensions une fois construit.
- **CONFIRMÉ** Numéro(s) du set — **peut être multiple** : un article loué regroupe parfois plusieurs boîtes LEGO officielles combinées (ex. NINJAGO = 2 références, Château Harry Potter = 2, Gare et train = 3). Le champ doit donc supporter une liste de références, pas une seule.
- **CONFIRMÉ** Nombre de notices (total, somme des références combinées le cas échéant).
- **CONFIRMÉ** Type de notice : papier ou numérique — **si numérique, avertissement à afficher au client** (nécessite un accès à internet par téléphone/PC/tablette pour suivre le montage).
- **CONFIRMÉ** Nombre de figurines.
- **CONFIRMÉ** Temps estimatif de montage.
- **CONFIRMÉ** Âge conseillé.
- **CONFIRMÉ** Marque : LEGO ou autre — confirmé nécessaire, le catalogue contient au moins une référence d'une autre marque ("La mine de l'ouest", marque "PANTASY").
- **CONFIRMÉ** Montant de la caution (par set, déjà su — cf. grille des cautions, de 100 € à 650 € selon le set).
- **CONFIRMÉ** Champ commentaire libre, **visible côté client** sur la fiche du set (vide sur tous les sets actuels, à remplir au cas par cas par Set et Brique).
- **CONFIRMÉ** Poids du set : stocké en interne (utile à la vérification au retour, module 9), mais **jamais affiché côté client** — décision volontaire pour éviter que les locataires ne devinent le contenu exact des sachets pesés.
- **CONFIRMÉ** Nombre de photos par set — résolu (réponse de Marion du 13/09) : **10 photos maximum** (remplace la proposition initiale de 3-4).

### Stock

- **CONFIRMÉ** **28 références au catalogue** (mise à jour de l'estimation "~25" du RDV de cadrage) — liste complète dans `catalogue-sets-lego.md`. Un seul exemplaire par référence aujourd'hui, mais le modèle de données doit prévoir le **multi-stock** (plusieurs exemplaires d'une même référence) pour une évolution future — ne pas coder en dur "quantité = 1".

### Statuts d'un set

- **CONFIRMÉ** Disponible / Location / Battement / Réparation / Retiré.

### Délai de battement (entre deux locations)

- **CONFIRMÉ** Réglable individuellement par set (valeur par défaut 4 jours), modifiable par Marion elle-même depuis le back-office.

### Hors périmètre

- Suivi des colis envoyés/reçus — retiré, sans objet en V1 (100 % remise en main propre).

---

## 2. Planning des locations

- **CONFIRMÉ** Le planning est **propre à chaque lieu de retrait** (une seule personne fait les remises, donc impossible d'être sur deux lieux en même temps sur le même créneau).
- **CONFIRMÉ** Lieux de retrait réels confirmés (5) : aire de covoiturage de Lanester (à côté du McDo), covoiturage de Guidel, covoiturage de Kerizan (Brec'h), Intermarché Drive de Monistrol (Lorient), covoiturage de Plouay.
- **CONFIRMÉ** **Durée libre** — résolu (réponse de Marion du 13/09). Le tarif est maintenant de **2 €/jour pour tous les sets**, sans distinction. Il n'y a plus de 4 durées fixes : le client choisit librement son nombre de jours de location, sans blocage ni durée maximale. Le sélecteur de durée du tunnel devient un simple nombre de jours (prix = 2 € × nombre de jours) au lieu d'un choix parmi 4 options.
- **CONFIRMÉ** Le tunnel réserve **une date, pas un créneau horaire précis**. L'heure exacte de remise est négociée directement avec le client par téléphone/email en V1 (un outil de chat est souhaité par la cliente mais explicitement pas développé pour l'instant — cf. section V2) — pas de sélecteur d'horaire dans le tunnel en V1. (Confirmé par la cliente ; elle envisage d'ajouter une tranche horaire plus tard, cf. section V2.)
- **CONFIRMÉ** Durée comptée en **jours calendaires**, pas en blocs de 24h. Une location démarrant un mardi (quelle que soit l'heure de remise ce jour-là) et prévue pour 4 jours se termine le vendredi — le client doit rendre le set ce jour-là, quelle que soit l'heure. Cette règle détermine la date de retour attendue pour tous les calculs (rappel J-1, déclenchement de la relance de retard, etc.).
- **CONFIRMÉ** Prolongation d'une location en cours : possible, mais **gérée manuellement, pas par un bouton dédié** dans l'espace client. Le client contacte Set et Brique (téléphone ou email — pas de chat en V1) pour vérifier la disponibilité, puis effectue lui-même une nouvelle réservation via le tunnel pour les jours supplémentaires — comme une location normale qui suit immédiatement la première. Aucun développement spécifique nécessaire pour la prolongation en elle-même.
- **CONFIRMÉ** Battement lors d'une prolongation immédiate — résolu (réponse de Marion du 13/09). Exemple : un client loue le Faucon Millénium du 1er au 8, puis décide de le garder plus longtemps et réserve lui-même, via le tunnel, une nouvelle location du 9 au 15 pour ce même set qu'il a déjà en main (il ne le rend jamais entre les deux réservations). Marion a confirmé que ce type de prolongation se fait **sans avoir besoin de bloquer un nouveau RDV de remise en main propre** — donc **pas de délai de battement** à imposer entre deux réservations du même client sur le même set quand rien n'est physiquement rendu entre les deux. Le délai de battement par défaut (4 jours) continue de s'appliquer normalement entre deux locataires **différents**.
- **CONFIRMÉ** Outil de chat : souhaité par la cliente comme canal de contact, mais confirmé par Alexis comme **non développé en V1**, éventuellement en V2.
- **CONFIRMÉ** Blocage de dates sur le planning — résolu (réponse de Marion du 13/09). Les deux mécanismes sont nécessaires : blocage **par set** (set indisponible pour cause de retard, problème technique, ou non-restitution) et blocage **par période** (congés de Marion), indépendamment du statut de chaque set individuel.

### Reporté en V2

- **V2** Outil de chat pour contacter la cliente — souhaité mais pas développé en V1.
- **V2** Tranche horaire précise sélectionnable dans le tunnel (créneaux de remise) — la cliente confirme elle-même vouloir l'envisager plus tard, "pas dans l'immédiat".

---

## 3. Comptes clients & espace de suivi

### Inscription — champs obligatoires

- **CONFIRMÉ** Nom, prénom, email, téléphone, adresse postale (informations nécessaires à la facturation). Rien de plus (pas de date de naissance, etc.).

### Locations simultanées

- **CONFIRMÉ** Résolu (réponse de Marion du 13/09) : un client peut louer plusieurs sets en même temps, mais cela doit passer par **deux réservations distinctes** (pas de panier multi-articles unique — chaque set fait l'objet de sa propre location, son propre paiement et sa propre caution).

### Compte bloqué

- **CONFIRMÉ** Statut "compte bloqué" à prévoir, activé/désactivé **manuellement par Marion** depuis le back-office (ex. set non rendu, litige en cours) — empêche toute nouvelle réservation tant qu'il est actif.

### Espace de suivi (fusion de l'ancien module "Espace client")

- **CONFIRMÉ** Le client voit l'avancement de ses locations en cours : prochaine date de retrait, set concerné, statut récupéré / à rendre, date de retour prévue, retard éventuel.

---

## 4. Paiement Stripe

### Modes de paiement du loyer

- **CONFIRMÉ** Deux modes possibles : paiement en ligne (Stripe, prélevé à la réservation), ou paiement sur place par **TPE** au moment de la remise en main propre.

### Caution — sujet résolu (document client du 11/09)

- **CONFIRMÉ** Toujours en **pré-autorisation standard Stripe (7 jours)**, jamais débitée sauf litige.
- **CONFIRMÉ** Pas de solution technique de prolongation nécessaire (ni Swikly, ni autorisation étendue Stripe, ni PayPal) : la cliente a tranché elle-même. Un hold bancaire au-delà de 7 jours est techniquement impossible, elle en est consciente et prend une **assurance professionnelle** de son côté pour couvrir le risque sur les locations de plus de 7 jours (15 jours, 1 mois). Aucun développement supplémentaire à prévoir sur ce point — ce qui clôt toute la réflexion Swikly/PayPal/autorisation étendue menée précédemment.
- **EN ATTENTE** Si le loyer est payé par TPE sur place, comment se fait la pré-autorisation de la caution (carte enregistrée en amont côté client tout de même) ? Question posée à Marion — reste ouverte indépendamment du point ci-dessus.
- **CONFIRMÉ** Restitution de la caution : **automatique 48h après réception du set**, avec un plafond de **7 jours maximum** dans tous les cas (indépendant de la rapidité de Marion à valider l'état des lieux).

### Hors périmètre

- Pas d'option d'assurance/protection additionnelle — la caution est la seule protection.

### Cas d'échec / abandon

- **CONFIRMÉ** Échec du paiement en ligne (carte refusée) → créneau bloqué **1h** le temps que le client trouve une solution.
- **CONFIRMÉ** Abandon en cours de paiement (avant tentative) → créneau libéré après **15 min**.

---

## 5. Tunnel de réservation client

- **CONFIRMÉ** Parcours : sélection du set → choix de la durée en nombre de jours libre (prix = 2 € × nombre de jours, cf. README section tarifaire) → choix de la date de retrait (pas d'heure précise, cf. module 2) → paiement (en ligne, à la remise par TPE, ou par bon cadeau — module 6). L'heure exacte de remise se négocie après coup, hors tunnel.
- **CONFIRMÉ** En V1, tous les sets sont disponibles à tous les lieux de retrait (pas de restriction géographique par set).
- **CONFIRMÉ** Validation manuelle des réservations — résolu (réponse de Marion du 13/09). Marion valide manuellement **toutes** les locations **et** les prolongations, sans exception — chaque demande est une *demande en attente*, avec une étape d'approbation côté back-office (accepter / refuser / proposer une autre date) avant confirmation définitive. Ce n'est donc **pas** une confirmation automatique instantanée dès le paiement.
- **EN ATTENTE** Résidu à préciser avec Marion : le paiement est-il pris **avant ou après** cette validation manuelle ? Et que se passe-t-il en cas de refus d'une réservation dont le paiement aurait déjà été prélevé (remboursement automatique) ?

---

## 6. Bons cadeaux

Module ajouté en cours de cadrage (absent du devis initial), à la demande de la cliente. Listé "Inclus" dans le devis — pas de surcoût, présenté comme rendu possible grâce à la réutilisation des modules Paiement Stripe (4) et Tunnel de réservation (5).

Résolu (réponse de Marion du 13/09) — fonctionnement complet du module :

- **CONFIRMÉ** Montants fixes proposés à l'achat : **10 € / 20 € / 30 €** (remplacent les anciens 10/15/25/45 € qui étaient calés sur les 4 durées fixes, abandonnées avec le nouveau modèle tarifaire à 2 €/jour). Ces montants correspondent respectivement à 5, 10 et 15 jours de location, mais le bon reste un **crédit en euros**, pas une durée figée.
- **CONFIRMÉ** Utilisation : au moment de réserver, le client voit le prix total de sa location (2 € × nombre de jours choisi) et saisit son code cadeau, qui est défalqué du prix — il peut choisir n'importe quel set pour ce montant, ou plus avec un complément de règlement par carte.
- **CONFIRMÉ** Complément de règlement par carte possible si le bon ne couvre pas la totalité du prix.
- **CONFIRMÉ** Le bon cadeau n'inclut jamais la caution : elle reste toujours due séparément (pré-autorisation Stripe ou TPE), quel que soit le bon utilisé.
- **CONFIRMÉ** Usage unique : si le bon vaut plus que le prix réglé, le solde restant est perdu (pas de report sur une prochaine location).
- **CONFIRMÉ** Non nominatif : utilisable par toute personne détenant le code.
- **CONFIRMÉ** Durée de validité : 1 an (conforme au minimum légal de la loi Chatel).
- **CONFIRMÉ** Non remboursable/non annulable une fois acheté, s'il n'est pas utilisé.
- **CONFIRMÉ** Réutilisation du système pour émettre des **avoirs gratuits** (offerts par Marion, sans achat, ex. pour compenser un client lésé par un retard de retour du set précédent, cf. module 1/2) : confirmé, avec un montant égal à la valeur de la durée de la location initiale du client concerné.
- **CONFIRMÉ** Génération automatique d'un code unique par bon, envoyé par email à l'achat (ou à l'émission, pour un avoir gratuit).
- **CONFIRMÉ** Utilisable comme moyen de paiement dans le tunnel de réservation, au même titre que Stripe ou le TPE.
- **CONFIRMÉ** Suivi des bons émis (valide / utilisé / expiré) depuis le back-office.

**Module entièrement tranché, plus aucun point ouvert.**

---

## 7. Contrat de location / conditions générales

- **CONFIRMÉ** Contrat généré automatiquement (PDF) à chaque réservation — pas un simple texte CGL statique. Le PDF doit reprendre les mentions légales, le set loué, la durée, les dates de retrait/retour et le montant. Réutiliser le même mécanisme de génération PDF que les factures (module 8) est probablement pertinent.
- **CONFIRMÉ** Acceptation par simple case à cocher ("J'accepte les conditions générales") avant validation de la commande — pas de signature électronique nominative en V1. C'est cette acceptation qui déclenche la génération du contrat.
- **CONFIRMÉ** Le document physique remis dans la boîte lors du prêt (avertissement d'âge conseillé) est **géré indépendamment par Marion, hors système** — rien à générer côté plateforme.
- **EN ATTENTE** Le contenu légal exact du contrat (barèmes de pénalités, annulation, retard) dépend des réponses de Marion — le moteur de génération PDF peut être développé dès maintenant, mais le texte légal définitif ne pourra être finalisé qu'après ses réponses.

Prix du module inchangé (300 €) malgré ce développement plus conséquent que la case à cocher initialement prévue — décision d'Alexis d'absorber le coût dans le forfait.

### Politique d'annulation — résolu (document client du 11/09)

- **CONFIRMÉ** Annulation à l'initiative du client :
  - Plus de 7 jours avant le retrait : gratuite (remboursement intégral).
  - Entre 7 jours et 48h avant : 50 % du prix de la location retenu.
  - Moins de 48h avant : 100 % retenu (pas de remboursement).
- **CONFIRMÉ** Annulation à l'initiative de Set et Brique : trois options au choix de Marion — proposition d'un changement de date (gratuit), avoir sur un autre set disponible, ou remboursement. Ce cas confirme que le système d'avoir (module 6, bons cadeaux) doit pouvoir être déclenché gratuitement par Marion, pas seulement acheté par un client.

---

## 8. Facturation

- **CONFIRMÉ** Nouvelle numérotation de factures, repart de zéro (pas de reprise de Poppins ou d'une séquence existante).
- **CONFIRMÉ** Facture générée uniquement une fois le paiement confirmé :
  - automatiquement pour un paiement en ligne ou par bon cadeau ;
  - après que Marion ait marqué manuellement la réservation "payée" sur le site, pour un paiement TPE sur place.
  - **Jamais de facture avant paiement effectif.**
- **V2** Export comptable complet (format, fréquence) : non défini, Marion n'a pas d'outil de comptabilité précis à ce jour — reporté en V2 (voir aussi module 11 pour l'export simple des ventes, inclus en V1).

---

## 9. État des lieux & gestion des dommages

### Processus de retour

- **CONFIRMÉ** Le client dépose physiquement le set, sans déclaration formelle à faire (il peut signaler un souci à l'oral, ce n'est pas obligatoire).
- **CONFIRMÉ** Marion réalise l'état des lieux plus tard, généralement le soir même — c'est elle seule qui valide si le set est rentré en bon état.
- **CONFIRMÉ** Cette validation déclenche le compte à rebours des 48h avant libération automatique de la caution (cf. module 4 / règle déjà actée).

### Retard de retour — entièrement résolu (2ᵉ document client du 11/09)

Remplace l'ancienne règle "rappel 48h avant + relance quotidienne".

- **CONFIRMÉ** La date de retour attendue se calcule en jours calendaires (cf. module 2) : le client doit rendre le set le jour J de la fin de location, à n'importe quelle heure.
- **CONFIRMÉ** Tolérance d'environ **30 minutes** après la fermeture/l'horaire habituel du jour J avant qu'un retard soit considéré comme tel.
- **CONFIRMÉ** Séquence d'emails automatiques : **J-1** (veille de la fin), **J** (jour de fin), **J+1** (retard constaté), **J+2**.
- **CONFIRMÉ** J+1 : un forfait de retard de **30 €** est appliqué.
- **CONFIRMÉ** J+2 : la **caution entière** est prélevée.
- **CONFIRMÉ** Marion doit pouvoir **stopper manuellement** cette séquence depuis le back-office (ex. si elle joint le client par téléphone et obtient une explication valable) — prévoir une action "suspendre/annuler la procédure de retard" sur chaque réservation concernée.

### Barème de pénalité (pièces manquantes/cassées, notices, figurines) — résolu

| % de pertes constaté | Retenue sur caution |
|---|---|
| 0 à 5 % | Aucune |
| 5 à 10 % | 10 € |
| 10 à 15 % | 30 € |
| 15 à 20 % | 50 € |
| Plus de 20 % | Prix du set neuf, référence Bricklink |
| Figurine manquante | Prix (référence Bricklink) |
| Notice manquante | Prix (référence Bricklink) |
| Set non restitué | Prix du set (référence Bricklink) |

- **CONFIRMÉ** Forfait démontage : **20 €** si le client rapporte le set assemblé ("en vrac") au lieu de le redémonter dans ses sachets d'origine.
- **CONFIRMÉ** Calcul du "% de pertes" — résolu (réponse de Marion du 13/09) : comptage précis du nombre de pièces manquantes par rapport au set de départ (pas un calcul par écart de poids). Une **zone de commentaire libre** doit être ajoutée en complément, pour que Marion documente le détail de l'état des lieux.
- Bricklink est un site de référence communautaire pour les prix des pièces/sets LEGO d'occasion — la consultation du prix de référence sera probablement **manuelle** (Marion), pas une intégration automatisée, sauf si une API est envisagée plus tard.

### Client suivant lésé en cas de non-retour dans les temps — résolu (réponse de Marion du 13/09)

- **CONFIRMÉ** Il est prévenu par **email et téléphone** (Marion l'appelle elle-même).
- **CONFIRMÉ** Il est indemnisé selon son choix : **avoir** (via le système de bons cadeaux, module 6) ou **remboursement**.

---

## 10. Notifications automatisées

- **CONFIRMÉ** Canal : **email uniquement en V1** (pas de SMS).
- **CONFIRMÉ** Séquence de rappel/relance autour de la fin de location : J-1, J, J+1, J+2 — voir le détail complet (forfaits associés à J+1/J+2, arrêt manuel possible) au module 9. Cette séquence remplace l'ancienne règle "rappel 48h avant + relance quotidienne indéfinie".
- **CONFIRMÉ** Textes des emails rédigés par défaut par AGON-GATE, mais **Marion doit pouvoir les modifier elle-même** — prévoir un éditeur de templates dans le back-office.

---

## 11. Back-office & reporting

- **CONFIRMÉ** Deux comptes d'accès en V1 : Alexis (admin), Marion (compte propriétaire). Pas d'autre utilisateur prévu pour l'instant.
- **CONFIRMÉ** Tableau de bord : chiffre d'affaires du mois, taux d'occupation par set, sets les plus loués.
- **CONFIRMÉ** Export simple des ventes par année civile, inclus en V1 (distinct de l'export comptable complet, qui reste en V2). Modèle de données : une **vente** est un nœud entre un **set**, une **durée** et un **client** — c'est cet élément qui doit être interrogeable en base pour produire cet export.
- **V2** Export comptable complet (format lié à un outil de comptabilité) : reporté en V2, Marion n'a pas d'outil précis à ce jour.

---

## 12. Intégration, tests, déploiement, formation

- **CONFIRMÉ** Formation destinée à Marion uniquement.
- **CONFIRMÉ** Format : documentation écrite + sessions en présentiel chez elle (pas de visio prévue).

---

## Récapitulatif des points bloquants (EN ATTENTE de Marion)

Cf. README.md pour le détail. Le lot de réponses de Marion du 13/09 a résolu la quasi-totalité des points qui restaient : nouveau modèle tarifaire, validation manuelle des réservations, calcul du "% de pertes", gestion du client suivant lésé, locations simultanées, nombre de photos, blocage de dates sur le planning, battement lors d'une prolongation, et l'intégralité du fonctionnement des bons cadeaux (module 6). Résolus depuis le 2ᵉ document client du 11/09 : barème de pénalité, montant de la pénalité de retard, politique d'annulation, lieux de retrait. Résolu précédemment : sujet caution/durée de préautorisation (Swikly, Stripe étendu, PayPal — cf. module 4). Résolu (réponse d'Alexis) : nature du "chat" — souhaité mais pas développé en V1, cf. section V2.

Il ne reste que deux points ouverts :

1. **Pré-autorisation de la caution en cas de paiement TPE sur place** : faut-il enregistrer la carte du client en amont, ou la caution est-elle prise directement sur place via le TPE ? (module 4)
2. **Résidu de la validation manuelle des réservations** : le paiement est-il pris avant ou après la validation manuelle de Marion, et que se passe-t-il en cas de refus d'une réservation déjà payée (remboursement automatique) ? (module 5)

## Récapitulatif des points reportés en V2

1. Outil de chat pour contacter la cliente — souhaité mais pas développé en V1 (module 2).
2. Tranche horaire précise sélectionnable dans le tunnel de réservation (module 2) — la cliente envisage de l'ajouter plus tard, "pas dans l'immédiat". En V1, l'heure se négocie hors tunnel (téléphone/email).
3. Export comptable complet (modules 8, 11) — l'export simple des ventes par année civile, lui, est inclus en V1 (module 11).

**Résolu, ne figure plus en V2 :** la prolongation d'une location en cours ne nécessite finalement aucun développement dédié — elle se fait via une nouvelle réservation standard dans le tunnel après accord manuel avec la cliente (cf. module 2).

---

*Agon-Gate — Document préparé pour échange client*
