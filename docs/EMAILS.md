# Set et Brique, e-mails automatiques

Textes par défaut des e-mails envoyés par la plateforme (spécification, module 10). Rédigés par AGON-GATE le 6 octobre 2026 en l'absence des textes de Marion ; elle pourra les modifier elle-même depuis l'espace de gestion une fois l'éditeur construit. Les déclencheurs ont été validés le 6 octobre 2026.

Les mails de compte (vérification de l'adresse, mot de passe oublié, codes de connexion) sont envoyés par Clerk et ne figurent pas ici.

## Règles communes

- **Expéditeur** : `Set et Brique <bonjour@set-et-brique.com>` (domaine à vérifier chez Resend, DNS chez Cloudflare). **Réponse à** : `setetbrique@gmail.com`, pour que le client qui clique sur « Répondre » tombe sur Marion.
- **Destinataire « gérants »** : l'adresse `contact_email` des réglages du site (`setetbrique@gmail.com` aujourd'hui).
- **Ton** : vouvoiement, chaleureux, phrases courtes. On parle au client comme en boutique. Pas de jargon (« statut », « transition »), pas de majuscules d'insistance.
- **Forme** : un objet, un corps en texte simple avec un bloc de rappel de la réservation, un bouton vers l'espace client ou l'admin, la signature. Version texte brut générée automatiquement depuis la version HTML.
- **Signature** (identique partout) :

  > À bientôt,
  > Marion et Gaëtan
  > Set et Brique · 73 boulevard René Laennec, 56100 Lorient
  > 07 83 73 70 20 · setetbrique@gmail.com

- **Pied de page** : « Vous recevez cet e-mail parce que vous avez une réservation chez Set et Brique. Retrouvez toutes vos locations dans votre espace : {{lien_compte}}. » (Pas de lien de désinscription : ce sont des e-mails de service, pas de la prospection.)
- **Dates** en toutes lettres (« samedi 18 octobre »), heures « 10 h 30 », montants « 24,00 € ».

### Variables disponibles

| Variable | Contenu | Source |
| --- | --- | --- |
| `{{prenom}}` | Prénom du client (ou « Bonjour, » sans prénom s'il manque) | `customers.first_name` |
| `{{client}}` | Prénom et nom | `customers` |
| `{{email_client}}`, `{{telephone_client}}` | Coordonnées du client | `customers` |
| `{{reference}}` | Référence courte de la réservation, ex. SB-4K7Q2 | `bookings.reference` |
| `{{set}}` | Nom du set | `sets.name` |
| `{{date_debut}}`, `{{date_fin}}` | Premier et dernier jour de location | `bookings.start_date`, `end_date` |
| `{{nb_jours}}` | Durée en jours | `bookings.days` |
| `{{lieu}}`, `{{adresse_lieu}}`, `{{consignes_lieu}}` | Lieu de remise, son adresse, ses consignes | `pickup_points` |
| `{{heure}}` | Heure de remise souhaitée ou fixée | `bookings.pickup_time` |
| `{{loyer}}` | Montant de la location | `bookings.rental_cents` |
| `{{caution}}` | Montant de la caution | `bookings.deposit_cents` |
| `{{option_monte}}` | Ligne « Option set rendu monté : 15,00 € » ou rien | `bookings.disassembly_cents` |
| `{{total}}` | Loyer + option, hors caution | calculé |
| `{{note_client}}` | Message laissé par le client à la demande | `bookings.customer_note` |
| `{{motif}}` | Motif de refus ou d'annulation, visible du client | `bookings.cancel_reason` |
| `{{precision}}` | Précision donnée par les gérants lors d'une action | `booking_events.message` |
| `{{jours_retard}}` | Nombre de jours de retard | calculé |
| `{{code}}`, `{{montant}}`, `{{expiration}}` | Bon cadeau : code, valeur, date de fin de validité | `gift_vouchers` |
| `{{lien_compte}}`, `{{lien_admin}}`, `{{lien_catalogue}}`, `{{lien_avis}}` | Liens vers l'espace client, la réservation dans l'admin, le catalogue, les avis Google | `site` |

Le **bloc de rappel** utilisé dans plusieurs e-mails :

> **{{set}}** · réservation {{reference}}
> Du {{date_debut}} au {{date_fin}} ({{nb_jours}} jours)
> Remise : {{lieu}}, {{adresse_lieu}}, vers {{heure}}
> Location : {{loyer}}
> {{option_monte}}
> Caution : {{caution}} (demandée séparément à la remise, restituée au retour du set complet)

---

## A. Vie d'une réservation

### A1. Demande reçue, au client

Déclencheur : le client valide le tunnel de réservation (création en `pending_review`).

**Objet** : Votre demande pour {{set}} est bien arrivée ({{reference}})

Bonjour {{prenom}},

Merci pour votre demande, nous l'avons bien reçue !

[bloc de rappel]

Et maintenant ? Nous vérifions que tout est en ordre de notre côté et nous vous confirmons la réservation très vite par e-mail. Les dates sont déjà bloquées pour vous.

Une question, un empêchement ? Répondez simplement à cet e-mail ou appelez-nous au 07 83 73 70 20.

[Bouton : Suivre ma demande → {{lien_compte}}]

[signature]

### A2. Nouvelle demande, aux gérants

Déclencheur : le même que A1.

**Objet** : Nouvelle demande : {{set}} du {{date_debut}} au {{date_fin}} ({{client}})

Bonjour,

{{client}} vient de demander une location.

[bloc de rappel]

Client : {{client}} · {{telephone_client}} · {{email_client}}
Message du client : {{note_client}} (ou « aucun »)

À traiter dans l'espace de gestion : accepter, modifier la remise ou refuser.

[Bouton : Voir la demande → {{lien_admin}}]

### A3. Demande acceptée, au client

Déclencheur : les gérants acceptent la demande (`pending_review` → `pending_payment`).

**Objet** : C'est confirmé : {{set}} vous attend du {{date_debut}} au {{date_fin}}

Bonjour {{prenom}},

Bonne nouvelle, votre réservation est confirmée !

[bloc de rappel]

Le règlement se fait à la remise du set, par carte ou en espèces. La caution est demandée au même moment et vous est restituée au retour du set complet. Pensez à venir avec une pièce d'identité.

Le set vous est remis démonté, pièces triées en sachets, notice comprise. Prévoyez un peu de place à la maison : {{set}} est un grand modèle.

Si quelque chose change d'ici là, prévenez-nous le plus tôt possible, un autre client attend peut-être ce set.

[Bouton : Voir ma réservation → {{lien_compte}}]

[signature]

*Quand le paiement en ligne existera (module 4), le deuxième paragraphe devient :*
« Pour finaliser, il vous reste à régler {{total}} en ligne dans les 24 heures : passé ce délai, la réservation est annulée et les dates redeviennent libres pour d'autres familles. La caution de {{caution}} est une simple empreinte bancaire, débitée uniquement en cas de casse ou de perte. »
[Bouton : Régler ma réservation → {{lien_paiement}}]

### A4. Demande refusée ou annulée par les gérants, au client

Déclencheur : les gérants refusent la demande ou annulent une réservation acceptée non payée (→ `cancelled`, avec motif).

**Objet** : Votre demande {{reference}} n'a pas pu être retenue

Bonjour {{prenom}},

Nous sommes désolés : nous ne pouvons pas donner suite à votre demande pour {{set}} du {{date_debut}} au {{date_fin}}.

Le motif : {{motif}}

Rien n'a été débité. Si vous le souhaitez, d'autres dates ou un autre set sont sans doute possibles : le catalogue affiche les disponibilités jour par jour, et nous sommes joignables au 07 83 73 70 20 pour en parler.

[Bouton : Voir le catalogue → {{lien_catalogue}}]

[signature]

### A5. Annulation par le client, aux gérants

Déclencheur : le client annule depuis son espace (→ `cancelled`).

**Objet** : Annulation : {{set}} du {{date_debut}} au {{date_fin}} ({{client}})

Bonjour,

{{client}} vient d'annuler sa réservation {{reference}} pour {{set}}, du {{date_debut}} au {{date_fin}}. Les dates sont de nouveau libres dans le catalogue.

[Bouton : Voir la réservation → {{lien_admin}}]

### A5 bis. Annulation par le client, au client (proposé en plus)

Même déclencheur. Un accusé court, pour que le client ait une trace.

**Objet** : Votre réservation {{reference}} est annulée

Bonjour {{prenom}},

C'est noté : votre réservation de {{set}} du {{date_debut}} au {{date_fin}} est annulée. Rien n'a été débité.

Vous êtes les bienvenus quand vous voulez, le catalogue est toujours là.

[Bouton : Voir le catalogue → {{lien_catalogue}}]

[signature]

### A6. Remise modifiée par les gérants, au client

Déclencheur : les gérants changent le lieu ou l'heure de remise (pas de changement de statut). Possible tant que le set n'est pas remis.

**Objet** : Remise de {{set}} : nouveau rendez-vous ({{reference}})

Bonjour {{prenom}},

Petit changement pour la remise de {{set}} le {{date_debut}} :

Lieu : {{lieu}}, {{adresse_lieu}}
Heure : vers {{heure}}
{{consignes_lieu}}
{{precision}}

Les dates de location ne changent pas. Si ce nouveau rendez-vous ne vous convient pas, répondez à cet e-mail ou appelez-nous au 07 83 73 70 20, nous trouverons autre chose.

[Bouton : Voir ma réservation → {{lien_compte}}]

[signature]

### A7. Set remis, au client

Déclencheur : les gérants marquent le set remis (→ `picked_up`).

**Objet** : Bonne construction ! {{set}} est à rendre le {{date_fin}}

Bonjour {{prenom}},

{{set}} est entre vos mains, nous vous souhaitons de belles heures de construction.

À retenir :

- Retour le **{{date_fin}}**, à l'heure qui vous arrange dans la journée, au même endroit : {{lieu}}, {{adresse_lieu}}.
- Rendez le set démonté, les pièces dans leurs sachets, avec la notice. {{option_monte_phrase}}
- Une pièce qui manque, une casse ? Dites-le-nous au retour, c'est toujours plus simple que de le découvrir après.

Envie de le garder quelques jours de plus ? Appelez-nous avant la date de retour : si le set est libre, on prolonge.

Au-delà du {{date_fin}}, un forfait de retard de 30 € s'applique le lendemain et la caution est prélevée le surlendemain. On préfère largement que vous nous appeliez !

[Bouton : Voir ma location → {{lien_compte}}]

[signature]

`{{option_monte_phrase}}` vaut « Vous avez choisi l'option set rendu monté : rapportez-le tel quel, nous nous occupons du démontage. » si l'option a été prise, rien sinon.

### A8. Set rendu, au client

Déclencheur : les gérants marquent le set rendu (→ `returned`).

**Objet** : Merci ! {{set}} est bien rentré

Bonjour {{prenom}},

{{set}} est de retour chez nous, merci d'en avoir pris soin. Votre caution vous est restituée.

Alors, cette construction ? Si l'expérience vous a plu, un avis sur Google nous aide énormément à faire connaître Set et Brique autour de Lorient : {{lien_avis}}

Et pour la prochaine fois, le catalogue s'agrandit régulièrement.

[Bouton : Voir le catalogue → {{lien_catalogue}}]

[signature]

*Quand la note complémentaire existera (module 8) : si une retenue est appliquée, le premier paragraphe devient « {{set}} est de retour chez nous. Au retour, nous avons constaté : {{precision}}. La note complémentaire de {{montant_note}} est jointe à cet e-mail et retenue sur la caution ; le reste vous est restitué. »*

---

## B. Fin de location (tâche planifiée, chaque matin)

Déclencheur : une tâche quotidienne parcourt les réservations `picked_up` et envoie, selon la date de fin, l'e-mail du jour. Un seul envoi par étape et par réservation. Les gérants peuvent **suspendre la séquence** sur une réservation depuis l'admin ; les e-mails B3 et B4 ne partent alors plus. Dès que le set est marqué rendu, la séquence s'arrête.

### B1. Veille du retour (J-1), au client

**Objet** : Demain, c'est le retour de {{set}}

Bonjour {{prenom}},

Petit rappel : {{set}} est à rendre **demain, {{date_fin}}**, à l'heure qui vous arrange dans la journée, au {{lieu}} ({{adresse_lieu}}).

Pensez à remettre les pièces dans leurs sachets avec la notice. {{option_monte_phrase}}

Besoin de quelques jours de plus ? Appelez-nous aujourd'hui au 07 83 73 70 20 : si le set est libre, on prolonge sans souci.

[signature]

### B2. Jour du retour (J), au client

**Objet** : {{set}} est à rendre aujourd'hui

Bonjour {{prenom}},

C'est aujourd'hui que {{set}} revient à la maison ! Nous vous attendons dans la journée au {{lieu}} ({{adresse_lieu}}).

Un imprévu ? Appelez-nous au 07 83 73 70 20 avant ce soir. À partir de demain, un forfait de retard de 30 € s'applique.

Merci, et à tout à l'heure.

[signature]

### B3. Retard constaté (J+1), au client

**Objet** : {{set}} n'est pas revenu : forfait de retard de 30 €

Bonjour {{prenom}},

Nous n'avons pas récupéré {{set}}, attendu hier {{date_fin}}. Comme prévu dans les conditions de location, un forfait de retard de 30 € est appliqué.

Pour éviter le prélèvement de la caution ({{caution}}) demain, rapportez le set aujourd'hui au {{lieu}} ({{adresse_lieu}}), ou appelez-nous au 07 83 73 70 20 : il y a sûrement une explication, et nous préférons en parler.

[signature]

### B4. Deuxième jour de retard (J+2), au client

**Objet** : Caution prélevée pour {{set}} ({{reference}})

Bonjour {{prenom}},

{{set}} n'est toujours pas revenu, deux jours après la date de retour prévue. Conformément aux conditions de location, la caution de {{caution}} est prélevée aujourd'hui, en plus du forfait de retard de 30 €.

Le set reste attendu : appelez-nous au 07 83 73 70 20 pour organiser son retour au plus vite.

[signature]

### B5. Annulation pour non-paiement (plus tard, avec le paiement en ligne), au client

Déclencheur : 24 h après l'acceptation sans règlement (`pending_payment` → `cancelled`, acteur système).

**Objet** : Votre réservation {{reference}} est annulée faute de règlement

Bonjour {{prenom}},

Nous n'avons pas reçu le règlement de votre réservation de {{set}} du {{date_debut}} au {{date_fin}} dans les 24 heures : elle est annulée et les dates sont de nouveau libres.

Rien n'a été débité. Si vous souhaitez toujours ce set, refaites une demande depuis le catalogue, ou appelez-nous au 07 83 73 70 20.

[Bouton : Voir le catalogue → {{lien_catalogue}}]

[signature]

---

## C. Bons cadeaux

### C1. Bon cadeau émis, au destinataire

Déclencheur : un bon est créé avec une adresse e-mail de destinataire (achat en ligne plus tard ; dès maintenant, à la création d'un bon par les gérants au format e-mail). Le destinataire est l'acheteur ou, s'il l'indique, la personne à qui il offre le bon.

**Objet** : Votre bon cadeau Set et Brique de {{montant}}

Bonjour {{prenom}},

Voici votre bon cadeau pour une location de set de briques chez Set et Brique, à Lorient.

> **{{montant}}**
> Code : **{{code}}**
> Valable jusqu'au {{expiration}}

Comment l'utiliser : choisissez un set dans le catalogue, vos dates, et saisissez le code au moment du règlement. Si la location coûte plus que le bon, vous réglez la différence ; si elle coûte moins, le solde n'est pas reporté.

Bon à savoir : le bon est valable sur tout le catalogue et peut être utilisé par la personne de votre choix. Il ne couvre pas la caution, demandée séparément à la remise du set.

[Bouton : Choisir un set → {{lien_catalogue}}]

[signature]

*Variante avoir (bon offert par les gérants, sans achat)* : le premier paragraphe devient « Pour nous faire pardonner, nous vous offrons un avoir à utiliser sur votre prochaine location. » et le paragraphe « Bon à savoir » reste identique.

---

## Points à faire valider par Marion

- La mention « pièce d'identité » à la remise (A3) : la demande-t-elle réellement ?
- « Carte ou espèces » à la remise (A3) : moyens de paiement acceptés au TPE.
- Le rappel des pénalités de retard dans A7 : le garder (transparence) ou l'alléger ?
- L'invitation à laisser un avis Google dans A8.
- Les horaires de retour : les e-mails disent « dans la journée » ; si les lieux de remise ont des créneaux, les reprendre.
- La signature « Marion et Gaëtan » et l'adresse d'envoi `bonjour@set-et-brique.com`.
