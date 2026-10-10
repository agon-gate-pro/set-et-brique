# Récap de la semaine 41 (5 au 10 octobre 2026)

Base du point de fin de semaine avec Madus et Marion. Branche `semaine-41`. Le détail technique est dans `FONCTIONNEMENT.md`, le journal complet dans `AVANCEMENT.md`.

## 1. Ce qui a changé sur le site

### Pour les clients

- **Délai pour payer une demande acceptée, et annulation automatique.** Une fois sa demande acceptée, le client voit dans son compte le temps qu'il lui reste pour payer (« Votre set vous reste réservé encore 23 h 41 min »). Passé ce délai sans paiement, la réservation est annulée d'elle-même et le set redevient disponible pour les autres. Le client voit sa réservation « Annulée » avec le motif. Le délai est de 24 h par défaut et ne dépasse jamais la fin du jour de remise.
- **Pastille « actions en attente » dans le menu.** Un petit chiffre rouge sur le rond du compte (sur le bouton du menu sur mobile) indique au client combien de réservations attendent quelque chose de lui : payer, répondre à une nouvelle date proposée, ou prendre connaissance d'un changement de lieu ou d'heure.
- **Changement de lieu ou d'heure de remise signalé.** Quand Set et Brique modifie le lieu ou l'heure, le client voit sur sa réservation un encart « La remise a été modifiée » avec l'ancien et le nouveau (« 10:00 → 11:00 »), et un bouton « J'ai bien noté ». En attendant l'e-mail, qui viendra plus tard.
- **Récapitulatif de paiement** dans l'espace client : montant à régler, saisie d'un bon cadeau. Le paiement en ligne lui-même n'existe pas encore (le bouton « Payer » l'annonce).
- **Formulaire de réservation réorganisé.** Le prix est maintenant dans un encart « Récapitulatif » juste avant le bouton d'envoi, après l'option « set rendu monté » qui le modifie. Les dates tiennent en une phrase, l'adresse du lieu de remise s'affiche sous la liste, quelques textes contradictoires sont corrigés.
- **Conditions générales de location** en ligne (`/cgl`), liées depuis la case à cocher de la réservation.
- **Fiche d'un set** : un clic sur la photo l'ouvre en grand, avec le même cadrage que dans le catalogue ; glisser du doigt sur mobile pour passer d'une photo à l'autre.
- **Accueil** : nouveau texte sous le titre, « Comment ça marche » en cinq étapes, version mobile plus compacte.
- **Bons cadeaux** : « Commander ce bon » mène au récapitulatif de la commande après connexion (paiement en ligne à venir).
- **Orthographe « Mega Bloks »** (nom officiel) sur l'accueil et sur les bons cadeaux.
- **Photos recadrées plus nettes.** Le site envoyait une photo à la taille du cadre puis l'agrandissait pour n'en montrer que la zone choisie, d'où la pixelisation signalée par Set et Brique. Il envoie maintenant une photo assez grande pour la zone affichée. Les photos des sets sont aussi moins compressées (qualité 90 au lieu de 75), un peu plus lourdes à charger.

- **Téléphone au bon format** (10 octobre) : dans les coordonnées du compte et dans la réservation, le champ n'accepte plus que dix chiffres (« 06 12 34 56 78 »). Les numéros étrangers sont refusés, à confirmer avec Marion.

### Pour les gérants (espace de gestion)

- **Nouvelle rubrique « Réglages »** : délai pour payer une demande acceptée (24 h), battement entre deux locations (4 jours), durée minimale d'une location (1 jour). Modifiables à tout moment ; un changement de délai ne vaut que pour les demandes acceptées ensuite.
- **Bouton « Paiement reçu »** sur une réservation en attente de paiement : on choisit le moyen (espèces, virement, carte, autre), la réservation passe en « Confirmée » et n'est plus concernée par le délai.
- **Annuler une réservation acceptée** : une fois la demande acceptée, on ne la « refuse » plus, on l'annule (lien « Annuler la réservation » sur la fiche), avec un motif obligatoire que le client voit, et un rappel de lui proposer une autre date, un autre set ou un avoir (conditions générales, article 13).
- **Savoir si le client a vu un changement de remise** : la fiche d'une réservation indique « Le client n'a pas encore vu la modification » tant qu'il n'a pas cliqué « J'ai bien noté » (l'historique garde aussi l'ancien et le nouveau lieu / heure).
- **Lieux de remise** : le chiffre en haut à droite d'un lieu devient « N réservations à venir » (remises pas encore faites, au lieu du total depuis le début), cliquable vers la liste de ces réservations.
- **Réservations : filtre par lieu**, à côté du filtre par statut et de la recherche.
- **Bouton « Prolonger de 24 h »** sur la même réservation, pour un client qui a prévenu qu'il paiera plus tard.
- **Bons cadeaux imprimés refaits d'après la maquette de Marion** : 20 × 9 cm, trois par feuille A4, pointillé de découpe, logo, slogan, code, montant et QR code vers le catalogue.
- **Annuler un bon cadeau** : la confirmation est une petite pastille « Oui, annuler » / « Non » au lieu d'un gros bouton rouge sur deux lignes.
- **Recadrage des photos libre** (n'importe quelle forme), pour les sets photographiés en hauteur.
- **Menu du site sur téléphone (burger)** : un panneau qui glisse depuis la droite, plus compact, et la page ne défile plus derrière.
- **Menu de l'espace de gestion sur téléphone** : une barre en bas de l'écran, comme dans une application (Tableau, Réservations, Sets, Bons, et « Plus » pour le reste). Première étape d'un travail sur l'affichage mobile de l'espace de gestion. **Les listes des sets, des bons cadeaux et des réservations s'affichent en cartes** sur téléphone, au lieu de tableaux à faire glisser de côté. **Les filtres sont repliés** derrière un bouton « Filtres », la recherche restant visible. **Les chevauchements sont corrigés** (textes qui dépassaient, graphique des statistiques, fenêtres avec le clavier ouvert, boutons des vignettes de photos). **Le tableau de bord est refait** : chiffres regroupés par thème et en couleur (à faire, chiffre d'affaires, catalogue et clients), deux par ligne sur téléphone, et les cartes « à traiter », « à remettre », « en location » ouvrent directement les réservations concernées. **Chaque page de gestion a son icône de couleur** à côté du titre.
- **Photos jusqu'à 20 Mo** (au lieu de 8, et en réalité 4,5 en ligne à cause d'une limite de Vercel) : on peut envoyer les photos du téléphone ou de l'appareil sans les réduire. La barre de progression avance pendant l'envoi de chaque photo. Une photo de plus de 8192 px de côté est refusée avec un message.
- **Fiche d'une réservation** : la pastille d'état reprend les couleurs du tableau des réservations (jaune à traiter, orange paiement en attente, vert payé, rouge annulée).
- **Aperçu d'une réservation** (au clic dans le tableau) plus lisible : état en couleur, puis client, montant, remise et retour en blocs séparés.
- **Fiche d'une réservation** : onglet Location plus lisible (set, montant, remise, retour en blocs ; message du client et motif d'annulation mis en évidence ; bouton « Enregistrer la note » en vert).
- **Un compte gérant peut aussi louer** comme un client et suivre ses locations dans « Mon compte ».

- **Bouton « Modifier » de la remise grisé** tant que le lieu ou l'heure n'a pas changé (10 octobre).
- **Tableau de bord** (10 octobre) : « Sets à remettre » ne compte plus que les réservations payées ; nouvelle carte « Paiements en attente », et le même découpage dans le filtre de la liste des réservations.
- **Liste des réservations triée par date de remise**, la plus récente en haut, tous statuts confondus (10 octobre).

### En préparation : prolonger une location

Demande de Marion, hors spécification d'origine : plus de la moitié des clients veulent garder leur set plus longtemps. Le client demandera depuis « Mes locations », Set et Brique acceptera ou refusera, puis le client paiera la différence. Le 10 octobre, le socle est posé (base de données, calcul de la date maximale en tenant compte de la réservation suivante et du battement, jours bloqués pour les autres clients) et le côté client est construit : bouton « Prolonger ma location » sur la carte de la location, grisé tant que le set n'est pas remis, puis fenêtre avec calendrier et supplément. Le côté gérants l'est aussi : la demande apparaît dans « À traiter », la fiche de la réservation permet de l'accepter ou de la refuser, puis d'enregistrer le paiement du supplément, ce qui repousse la date de retour. Testé à l'écran par Alexis le 10 octobre, avec un bouton « Payer la prolongation » ajouté côté client. Les e-mails sont écrits (demande reçue, acceptée, refusée, payée, annulée faute de règlement), sur le modèle des e-mails existants et sans attendre la relecture de Marion. Pas encore en production : reste le paragraphe des conditions générales, et le paiement en ligne du supplément viendra avec Stripe.

## 2. Décisions prises cette semaine (Alexis)

1. Délai de paiement **réglable dans l'espace de gestion**, 24 h par défaut.
2. Passé le délai, **annulation automatique** et set remis en location.
3. L'échéance **ne dépasse pas la fin du jour de remise** (23 h 59) : un client qui ne paie pas et ne vient pas ne bloque pas le set au-delà. La fin de journée plutôt que l'heure exacte, pour laisser le temps d'enregistrer un paiement par TPE fait sur place.
4. **« Paiement reçu »** côté gestion, indispensable tant que le paiement en ligne n'existe pas (sinon toutes les demandes acceptées auraient été annulées).
5. **« Prolonger de 24 h »** au cas par cas.
6. Les réservations de test déjà en attente de paiement sont **annulées au premier passage**, y compris celles acceptées avant le 5 octobre (sans délai enregistré), dès que leur jour de remise est passé.
7. Rubrique **« Réglages »** séparée de « Contenus du site », qui reste prévue pour les textes, avis, presse et modèles d'e-mails (laissée dans le menu même vide).
8. Orthographe **« Mega Bloks »**.
9. Une réservation **acceptée** ne se refuse plus : elle s'**annule** à l'initiative de Set et Brique, motif obligatoire, en proposant au client une autre date, un autre set ou un avoir (article 13 des CGL).
10. Un changement de lieu ou d'heure de remise est **signalé au client sur le site** (encart + pastille) en attendant l'e-mail ; stockage par une **migration** de la base plutôt que par lecture de l'historique.

## 3. Mise en production et infrastructure (pour Madus)

**Fait le 7 octobre 2026 par Alexis :**

- Migration **`0018_handover_change`** appliquée à la base (`pnpm db:migrate`) : quatre colonnes vides ajoutées à `bookings`.
- **Mise en production** : `semaine-41` avancée sur `main` (commit `d90e40f`, sans commit de fusion), déploiement Vercel réussi. Accueil, catalogue, bons cadeaux, CGL et route du header vérifiés ; la tâche planifiée refuse bien un appel sans secret.
- Variable **`CRON_SECRET`** ajoutée dans Vercel (production uniquement), valeur aléatoire de 32 octets générée sur place et jamais affichée. Elle protège la tâche planifiée quotidienne qui annule les réservations non payées même quand personne ne visite le site.

**Fait le 8 octobre 2026 au soir par Alexis :** mise en production des photos (plus nettes, qualité 90, envoi direct jusqu'à 20 Mo) : `main` avancée sur `semaine-41` (commit `2b703e2`), déploiement réussi. Envoi d'une photo depuis un téléphone testé en réel : fonctionne bien.

**Fait le 10 octobre 2026 :** migration **`0020_booking_extensions`** appliquée à la base (nouvelle table vide et son type, rien de modifié dans l'existant). Le code correspondant n'est pas encore en production.

**Reste à faire :**

- **Redéployer la production une fois** (Vercel → Deployments → dernier déploiement de production → Redeploy), ou attendre le prochain déploiement : `CRON_SECRET` n'est prise en compte qu'au déploiement suivant son ajout. D'ici là, la tâche planifiée est refusée ; l'annulation au fil des visites fonctionne quand même.
- Vérifier ensuite que la tâche planifiée apparaît dans Vercel (Settings → Cron Jobs, `/api/cron/paiements-expires`, tous les jours à 5 h UTC). Le plan gratuit ne permet qu'un passage par jour.
- **Photos** : les photos des sets sont désormais servies en meilleure qualité et en plus grand quand elles sont recadrées. Ça consomme davantage de transformations d'images (5 000 par mois sur le plan gratuit ; au-delà, les nouvelles photos ne s'affichent plus, celles déjà calculées restent visibles). Par ailleurs, les conditions de Vercel réservent le plan gratuit (Hobby) à un usage personnel non commercial : à terme, le plan Pro.
- Rappel : aucun fournisseur d'e-mail n'est branché. Ni l'annulation ni le rappel avant échéance ne sont envoyés par e-mail aujourd'hui (Resend recommandé, à mutualiser avec les e-mails transactionnels).

## 4. À voir avec Marion

- **Test d'impression des bons cadeaux** sur son imprimante : la marge est de 5 mm, certaines imprimantes ne savent pas imprimer si près du bord. Si un bord est coupé, on réduit le bon à 19 cm de large.
- **Nom du lieu de remise** « parking de covoiturage ( à coté du mc do » à corriger dans l'espace de gestion, rubrique Lieux (proposition : « Parking de covoiturage (à côté du McDo) »).
- **Comment le client paie-t-il pendant le délai**, tant que le paiement en ligne n'existe pas (virement, passage sur place, TPE à la remise) ? Le bouton « Paiement reçu » couvre tous les cas, mais il faut que les gérants l'utilisent à chaque paiement, sinon la réservation est annulée à l'échéance.
- **Rappel avant l'échéance** par e-mail : souhaité ? (nécessite le fournisseur d'e-mail.)
- **Usage des noms de marques** (Lego, Pantasy, Mega Bloks) sur le site et les bons : à confirmer.
- **Taille des photos d'origine** : toutes les photos des sets font 1414 × 2000 px. Sont-elles réduites ou exportées (Canva ?) avant d'être mises sur le site, et existe-t-il des originaux en meilleure résolution ? Ce sont elles qui limitent la netteté en plein écran.

- **E-mails de prolongation** (10 octobre) : six textes à relire, partie D de `EMAILS.md`.
- **Prolongation** (10 octobre) : demande possible jusqu'à la veille du retour ; nouvelle empreinte de caution au paiement de la prolongation ; paragraphe à ajouter aux conditions générales.
- **Inscription en erreur signalée par un client** (10 octobre) : le compte a bien été créé et le serveur n'a renvoyé aucune erreur ; il faudrait le texte affiché et l'appareil utilisé pour aller plus loin.

## 5. À vérifier par Alexis avant la mise en ligne

Ces points n'ont pas pu être testés connecté (pas de session de test) ni en écrivant dans la base partagée :

- La pastille rouge dans le header avec un compte qui a une réservation en attente de paiement.
- La rubrique Réglages : enregistrer une valeur, puis accepter une demande et vérifier le délai affiché au client.
- Les boutons « Paiement reçu » et « Prolonger de 24 h » sur une réservation de test.
- Une réservation dont l'échéance est passée : elle doit apparaître « Annulée » et ses dates redevenir libres dans le calendrier.
- Le formulaire de réservation réorganisé, connecté, sur ordinateur et sur téléphone.
