# Design système — Set et Brique

Référence des couleurs, composants et conventions visuelles du site, telles qu'elles existent dans le code aujourd'hui. À tenir à jour à chaque décision de design, au même titre que `FONCTIONNEMENT.md` et `AVANCEMENT.md`. Base : `app/globals.css` (tokens Tailwind v4) et `components/admin/form.tsx` (composants de formulaire partagés).

## Couleurs

Définies comme variables CSS dans `app/globals.css` (`@theme`), utilisables directement comme classes Tailwind (`bg-brick`, `text-ink-deep`, `border-sea/30`…).

| Token | Valeur | Rôle |
|---|---|---|
| `brick` / `brick-deep` | `#e3000b` / `#b8000a` | Couleur de marque et CTA public (« Réserver »), et actions **destructrices ou négatives** côté gestion : supprimer, refuser, bloquer un client. |
| `sun` / `sun-deep` | `#fcd54b` / `#eab308` | Mise en avant, alerte non bloquante : demandes à traiter, badge « par défaut », badge « Coup de cœur », identité du compte connecté, ajout d'une ligne dans une liste (ex. « + Ajouter un créneau »). |
| `leaf` / `leaf-deep` | `#16a34a` / `#15803d` | **Toute action constructive** : créer, ajouter, enregistrer une modification, accepter, marquer remis/rendu. Regroupe ce qui était avant réparti entre rouge et vert : plus une action fait progresser une donnée (au lieu de la détruire), plus elle est verte. |
| `sea` / `sea-deep` | `#2563eb` / `#1d4ed8` | Bleu d'interaction discret : survols dans l'espace de gestion (menu, tuiles du tableau de bord), liens de navigation neutres (« Modifier » dans un tableau). |
| `ink` / `ink-deep` / `ink-deeper` | `#2b207d` / `#172554` / `#0f1837` | Texte principal, titres, chiffres clés (CA, compteurs du tableau de bord), fonds sombres (statut « en location »). |
| `sky` | `#f8fafc` | Fond très pâle, quasi blanc : fonds de section, survols neutres. **Trop pâle pour servir de couleur de surbrillance visible** (retenu après plusieurs essais sur le menu de gestion). |
| `paper` | `#ffffff` | Fond des cartes, boutons secondaires. |
| `slate-ink` | `#334155` | Texte secondaire, légendes, bordures discrètes (`border-slate-ink/10`, `/15`, `/20`). |

### Règles apprises

- **Le rouge (`brick`) est réservé aux actions destructrices ou négatives** (supprimer, refuser, bloquer) et au CTA de marque public. Il ne doit plus servir pour une action de création ou d'enregistrement, même primaire : ça s'est révélé trompeur, en particulier pour le style « texte souligné rouge » du bouton d'annulation/suppression (`ConfirmButton`), qui ne doit pas être réutilisé pour autre chose (ex. un bouton « ajouter »). Il est aussi jugé trop fort pour une simple pastille d'identité (compte utilisateur) ou pour un survol de menu : dans ces cas, préférer `sun` (identité) ou `sea` (survol) en teinte diluée.
- **Vert (`leaf`) pour toute action qui construit ou fait avancer une donnée**, pas seulement la validation/acceptation : créer, ajouter, enregistrer une modification. Décision revue deux fois dans la même session (d'abord rouge partout, puis rouge pour les créations et vert seulement pour « Enregistrer », puis vert pour tout ce qui n'est pas destructeur) : la ligne de partage la plus stable s'est révélée être *destructeur = rouge, tout le reste = vert*, pas *primaire = rouge, secondaire = vert*.
- **`sky` ne fonctionne pas comme couleur de surbrillance** : sa faible saturation la rend quasi invisible en survol ou en fond d'avatar. Utiliser `sea` en opacité réduite (`bg-sea/15`) à la place.
- **Teintes diluées, pas de couleurs pleines, pour les surbrillances et fonds discrets** : `hover:bg-sea/15`, `bg-brick/10`, `bg-sun/40`. Les couleurs pleines (`bg-brick`, `bg-sun`) sont réservées aux badges, boutons et alertes qui doivent vraiment attirer l'œil.
- **Cohérence d'intensité** : deux zones cliquables équivalentes (ex. menu de gestion et tuiles du tableau de bord) doivent utiliser exactement la même couleur et la même opacité de survol, pas seulement la même teinte.

## Typographie

- Police unique : Poppins (`--font-poppins`), via `next/font/google`.
- `h1`, `h2`, `h3` et la classe utilitaire `.display` : `font-display` (Poppins), `font-weight: 700`, `letter-spacing: -0.02em`.
- Titres de page (`h1`) : `text-3xl md:text-4xl font-bold`.
- Sous-titre descriptif sous un `h1` : `text-sm text-slate-ink max-w-xl` (uniformisé sur toutes les pages de l'espace de gestion — c'était `text-slate-ink` sans `text-sm` sur plusieurs pages, corrigé pour matcher la page Sets).
- Chiffres clés (tableau de bord, prix) : `.display text-3xl sm:text-4xl font-bold`, en `text-ink-deep` (jamais en rouge : le rouge est réservé aux actions, pas à l'affichage d'information).

## Boutons

Classe de base `.btn` (`app/globals.css`) : pilule (`border-radius: 9999px`), ombre `--shadow-brick-sm`, légère translation vers le haut au survol. Dans `@layer components`, comme `.brick-card`, pour que des utilitaires Tailwind (`text-xs`, `py-1.5`, `px-3`…) puissent réduire un bouton par défaut sans réécrire toute la classe — un bouton compact (« Modifier » d'un tableau, boutons d'un `ConfirmButton`…) doit toujours passer par ces utilitaires, jamais par une classe séparée non « layered » : une règle CSS hors `@layer` gagne toujours sur les utilitaires Tailwind, quel que soit l'ordre d'écriture (bug vécu : `text-xs py-1.5 px-3` sur le bouton « Modifier » du tableau des sets n'avait aucun effet tant que `.btn` vivait hors `@layer components`). Variantes via `SubmitButton` (`components/admin/form.tsx`) ou directement en classes :

| Variante | Classe | Usage |
|---|---|---|
| Brick | `.btn-brick` | CTA de marque public (« Réserver »), et actions destructrices/négatives en gestion (supprimer, refuser, bloquer). |
| Sun | `.btn-sun` | Secondaire mis en avant (espace de gestion, badges), ajout d'une ligne dans une liste (« + Ajouter un créneau »). |
| Leaf (défaut du bouton d'enregistrement) | `.btn-leaf` | Toute action constructive : créer, ajouter, enregistrer, accepter, marquer remis/rendu. |
| Sea | `.btn-sea` | Action secondaire bleue, lien de navigation neutre (« Modifier » dans un tableau). |
| Paper | `.btn-paper` | Action neutre / secondaire (« Annuler », « Voir plus »). |

### Bouton « Enregistrer » conditionnel

Les boutons d'enregistrement qui modifient une donnée existante (édition d'un exemplaire, d'un forfait, d'un set, d'un lieu de remise, du profil client) sont en **vert (`leaf`)** et cliquables **que si le formulaire a été modifié** par rapport à son état chargé. Tant que rien n'a changé, ils restent gris et non cliquables — pas une version simplement assombrie de la couleur, un vrai style neutre (`bg-slate-200 text-slate-ink/50 shadow-none cursor-not-allowed`).

- Hook : `lib/use-form-dirty.ts` — compare un instantané du formulaire (`FormData` sérialisée) à son état initial à chaque saisie (`input`/`change`), expose `{ ref, dirty, markClean }`.
- `markClean()` est appelé quand l'action serveur renvoie un succès (`state.ok`), pour que le bouton redevienne gris après un enregistrement réussi plutôt que de rester actif.
- Ne s'applique **qu'aux formulaires d'édition d'une donnée existante** (label « Enregistrer »), jamais aux formulaires de création (« Créer… », « Ajouter… »), qui restent en vert et toujours actifs (voir la règle de couleur ci-dessus : création = vert aussi, seule la présence du suivi de modification distingue les deux).
- Exemples : `app/admin/sets/[id]/sections.tsx` (`CopyEditor`), `app/admin/forfaits/forms.tsx` (`RatePlanRow`), `app/admin/lieux/forms.tsx` (`PickupPointRow`), `app/admin/sets/set-form.tsx` (en mode édition seulement, via `Boolean(set) && !dirty`), `app/compte/profil/profile-form.tsx`.

## Cartes et badges

- `.brick-card` : carte de base (bordure fine, coins arrondis `1rem`, ombre légère, fond blanc). Toujours dans `@layer components` pour que les utilitaires Tailwind (`bg-sun`, `hover:bg-sky`…) puissent la surcharger.
- Badge de statut (`AvailabilityBadge`, badges de réservation…) : `text-sm font-bold px-2.5 py-1 rounded-md border border-slate-ink/15`, couleur de fond selon le statut (`bg-sun` disponible, `bg-ink` en location, `bg-brick` en réparation, `bg-slate-200` retiré, `bg-sky` en battement).
- `.badge-gold` : badge doré animé (dégradé qui brille), réservé aux demandes acceptées côté client — respecte `prefers-reduced-motion`.

## Formulaires (`components/admin/form.tsx`)

- `Field` : label en gras, astérisque rouge (`text-brick`) si `required`, indice optionnel en petit texte gris sous le label.
- `inputClass` : `rounded-xl border border-slate-ink/20 bg-paper px-3 py-2 text-ink-deep`, focus sans double anneau (`focus-outline-none`).
- `SubmitButton` : gère `pending` (via `useFormStatus`, texte « Enregistrement… ») et `disabled` (gris, voir ci-dessus).
- `ConfirmButton` : suppression en deux temps.
  - Par défaut : le bouton texte souligné se transforme en place (« Confirmer » + « Annuler »).
  - `asDialog` : fenêtre centrée à l'écran (`fixed inset-0`, fond `bg-ink-deep/50`), pour les suppressions à conséquence plus lourde (un exemplaire, un set). Se ferme automatiquement sur succès en comparant l'état renvoyé par l'action à l'état précédent pendant le rendu (jamais via un `onClick` sur le bouton `submit` lui-même : ça démonte le bouton avant que le navigateur ait fini de soumettre le formulaire — bug vécu et corrigé).
- `FormMessage` : bandeau d'erreur (`border-brick/30 bg-red-50 text-brick-deep`) ou de succès (`border-slate-ink/15 bg-sky text-ink-deep`).

## Navigation

### Header public (`components/site-header.tsx`)

- Pastille de compte connecté : avatar rond + prénom dans un contour `sun` (`border-sun-deep/30 bg-sun/15`, `hover:bg-sun/25`), pas de rouge (jugé trop fort pour une simple identité).
- La pastille ouvre un **menu déroulant** (pas un lien direct) : « Mes locations », « Gérer mon compte », puis « Se déconnecter » séparé par un filet. Le menu s'ouvre vers la droite (`left-0` sur le panneau, pas `right-0`), se ferme au clic extérieur, à Échap, ou après un choix.
- Mobile (< `lg`) : menu plein écran avec les mêmes liens à plat, pas de menu déroulant.

- **Page courante** : le lien de la page où l'on se trouve est souligné d'un trait jaune épais (`underline decoration-sun-deep decoration-[3px] underline-offset-[10px]`), avec `aria-current="page"`, dans la barre desktop comme dans le menu mobile. Un soulignement plutôt qu'une pastille de fond : il ne change pas la largeur des liens, déjà juste entre `lg` et `xl`. Actif aussi sur les sous-pages (`/catalogue/<slug>` allume « Catalogue »). Les ancres de l'accueil (« Comment ça marche », « Vinted », « Contact ») ne sont pas des pages et ne s'allument jamais.
- **Zone du compte séparée des liens** : dès qu'on est connecté, « Espace de gestion » (gérants) et l'avatar forment un groupe à droite, séparé des liens du site par un filet vertical (`border-l border-slate-ink/15`, marges `ml-5 pl-5`, `xl:ml-6 xl:pl-6`). Avant, tout se suivait avec le même écart et paraissait collé.
- **Barre d'un gérant, toujours compacte** : « Vinted » masqué sur ordinateur (`wideOnly`), « Qui sommes-nous » masqué sous `xl` (`adminWideOnly`), bouton « Gestion » (au lieu d'« Espace de gestion ») sous `xl`, avatar seul sans prénom. Vérifié en captures à 1024, 1280, 1411 et 1600 px avec une session gérant simulée.
- Liens de la barre desktop (`nav`, `lib/site.ts`) : un lien marqué `wideOnly` (aujourd'hui « Vinted ») est masqué entre `lg` et `xl`, où tous les liens ne tiennent pas sur une ligne. Le menu mobile les montre tous.

### Menu de l'espace de gestion (`components/admin/nav.tsx`)

- Desktop : colonne fixe (`md:sticky md:top-24`), lien actif en fond `bg-ink-deep text-paper`, survol en `hover:bg-sea/15`.
- Mobile : rangée de pastilles horizontale et défilante (`overflow-x-auto`, `[scrollbar-width:none]`), pour que le contenu de la page reste immédiatement visible.
- Remonte en haut de page à chaque changement de section (`window.scrollTo(0, 0)` sur changement de route), Next.js gardant sinon la position de défilement tant que le menu sticky reste visible.

### Tableau de bord (`app/admin/page.tsx`)

- Bannières d'alerte pleine largeur pour les cas urgents : demandes à traiter (`bg-sun`), retards de retour (`bg-brick/10 border-brick`).
- Tuiles cliquables : `brick-card` + `hover:bg-sea/15`, chiffre en `text-ink-deep` (jamais en rouge), grille responsive `sm:grid-cols-2 lg:grid-cols-3`.

## Éléments flottants

- **Onglet flottant « Réserver un set » : retiré** (24 septembre 2026). Il ne faisait qu'ouvrir le catalogue, déjà accessible par le header (toujours visible) et par les boutons de l'accueil ; il masquait du contenu sur tablette et n'était qu'une icône peu lisible sur mobile. Remplacé, là où le menu est replié (sous `lg`), par un bouton « Catalogue » dans le header, à gauche du burger (`rounded-xl border`, comme le burger ; icône livre à partir de 400 px ; trait jaune quand on est sur le catalogue). Plus aucun élément flottant hormis le header.
- Header sous 380 px : écart réduit (`gap-2`) et nom du site en `text-base` ; sous 340 px, le nom est masqué visuellement (`sr-only`, le logo reste), pour que logo, bouton « Catalogue » et burger tiennent sur une ligne.

## Bons cadeaux (public)

- Bandeau de l'accueil, **en forme de ticket** (« ticket gagnant ») : fond `studs` (jaune à pois), bordure `sun-deep/40`, ombre `shadow-brick-sun` ; talon à gauche avec l'icône cadeau bleu nuit posée directement sur le jaune (légèrement inclinée), séparé par une ligne pointillée (`border-dashed border-ink-deep/25`) ; deux encoches demi-cercle (`bg-sky`, couleur du fond de page) en haut et en bas de la découpe, à partir de `md`. Surtitre « Idée cadeau », titre, une ligne de texte, bouton bleu nuit (`btn bg-ink-deep text-paper`). Sur mobile, talon au-dessus, découpe horizontale, sans encoches. Première version (pastille blanche + icône et bouton rouges) jugée peu harmonieuse : pas de blanc ni de rouge sur ce jaune.
- Page `/bons-cadeaux` : en-tête `bg-sun/10` comme l'accueil ; cartes de montant sur le modèle des étapes de l'accueil (bordure haute épaisse, ici `border-t-sun-deep`), montant en `display text-5xl md:text-6xl text-ink-deep`, bouton `btn-sun` pleine largeur. **Page volontairement douce, presque sans rouge** (trois boutons rouges côte à côte jugés agressifs) : titre en bleu nuit avec un seul mot en `text-brick` (« construction », comme « Construisez. » sur l'accueil ; un surlignage jaune essayé d'abord n'a pas été retenu), icône cadeau identique à celle du ticket de l'accueil (`Gift` bleu nuit, `strokeWidth` 1.75, `-rotate-6`, sans pastille), jaune pour les actions. Un seul mot rouge dans un titre reste la signature du site ; c'est l'accumulation (mot rouge + icône rouge + trois boutons rouges) qui était de trop. Cartes « Comment ça marche » identiques aux étapes de l'accueil : bordure haute `border-t-4` rouge (`brick`), bleu nuit (`ink`), jaune (`sun-deep`) dans cet ordre.

## Tuiles des gammes (accueil, `app/page.tsx`)

- `brick-card` en `aspect-[4/3]`, photo en `object-cover` sur toute la tuile, zoom `group-hover:scale-105`.
- Nom de la gamme en `display text-lg md:text-2xl font-bold text-paper` sur un dégradé `from-ink-deeper/85 via-ink-deeper/25 to-transparent` en bas de l'image : texte blanc lisible quelle que soit la photo. Nombre de sets en dessous, `text-paper/85`.
- Sans photo : fond `studs-ink` (bleu nuit à pois), jamais un fond pâle sous un texte blanc.
- Grille `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`, focus clavier `ring-sun` comme les cartes du catalogue.

## Filtres du catalogue (`app/catalogue/catalogue-browser.tsx`)

- Page en `max-w-7xl` (largeur du header) ; grille de sets `sm:grid-cols-2 xl:grid-cols-3` à côté des filtres, cartes compactes (`p-4`, titre `text-lg`, prix `text-xl`, textes secondaires `text-xs`/`text-sm`).
- Colonne `brick-card` à gauche à partir de `lg` (`15rem`, sticky sous le header, défilement interne si trop haute) ; en dessous, bouton `btn-paper` « Filtres » avec pastille `bg-ink-deep` du nombre de filtres actifs, qui déplie le panneau.
- Groupes séparés par un filet (`border-t border-slate-ink/10`), titre `text-sm font-bold text-ink-deep`. « Réinitialiser » en lien bleu souligné (`text-sea-deep`), neutre.
- Gamme et âge : menus déroulants natifs au même style (`selectClass`), nombre de sets de chaque gamme entre parenthèses dans l'option. La gamme a d'abord été une liste verticale de boutons (entrée active en rouge puis en bleu), remplacée par un menu, plus compact et identique à celui de l'âge.
- Pas de contour rouge `:focus-visible` global sur ces menus (`focus-outline-none`, comme `inputClass`), bordure bleue `focus-visible:border-sea` au clavier.
- Curseur à deux poignées (`.range-dual`, `app/globals.css`) : deux `input type="range"` superposés dont seules les poignées captent le pointeur. Poignée blanche bordée `ink-deep`, 28 px (cible tactile) ; plage choisie en `sun-deep` sur piste `slate-200` (sélection = jaune, comme le calendrier) ; valeurs affichées en clair au-dessus (« 1 000 pièces – 3 000 pièces »). Focus clavier : contour `sun-deep` sur la poignée, pas sur la barre.

## Écrans de chargement

- `loading.tsx` sur les pages qui lisent la base à chaque visite (catalogue, fiche, réservation) : silhouette de la page, mêmes conteneurs et grilles que la vraie page, blocs `Skeleton` (`components/skeleton.tsx` : `bg-slate-200/80`, arrondis, `motion-safe:animate-pulse`). Les titres fixes (« Le catalogue ») restent en vrai texte. Un `LoadingLabel` (`role="status"`, masqué) annonce le chargement aux lecteurs d'écran.

## Fiche d'un set (public)

- Carrousel de photo principale (`app/catalogue/[slug]/image-carousel.tsx`) avec flèches gauche/droite superposées, compteur `n / total`.
- Colonne de vignettes cliquables à gauche de la photo principale (au lieu d'une grille sous la photo) : largeur `w-14 sm:w-16 md:w-20`, hauteur limitée à 4 vignettes visibles (`max-h-[248px] sm:max-h-[280px] md:max-h-[344px]`), défilement vertical au-delà, vignette active en bordure `border-brick`.

## Calendrier de réservation (`app/catalogue/[slug]/reserver/booking-calendar.tsx`)

- Popup centrée, calendrier mensuel, sélection de période en deux clics.
- Période sélectionnée en **jaune** (`bg-sun` / `bg-sun/40`), jamais en rouge — jugé alarmant pour une simple sélection de dates.
- Prix en **vert** (`text-leaf-deep`).
- Dates lisibles via `DateReadable` (`app/catalogue/[slug]/reserver/date-readable.tsx`) : jour et mois en gras/foncé (`font-bold text-ink-deep`), jour de semaine et année en poids normal — la phrase entière en gras était jugée difficile à lire.
- Cases de jour dimensionnées pour rester proches de la cible tactile recommandée même sur petit mobile (marges du popup réduites sous `sm`).

## Conventions responsive

- Points de rupture Tailwind standards : `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
- Grilles de cartes : 1 colonne mobile → `sm:grid-cols-2` → `lg:grid-cols-3`.
- Barre de navigation admin : bascule pastilles horizontales (mobile) / colonne (desktop) à `md`.
- Menu compte / bouton « Réserver un set » du header : `lg` est le seuil desktop (au-delà, nav complète visible ; en dessous, menu burger).
- Cible tactile : viser ~40 px minimum sur les éléments cliquables denses (calendrier) ; ajuster les marges plutôt que la taille du contenu quand c'est possible.
- Vérification visuelle possible en local (24 septembre 2026) : Edge en mode headless (`msedge --headless=new --screenshot`), la page chargée dans une `iframe` de la largeur voulue (375, 768, 1024 px). L'`iframe` est nécessaire : Edge headless impose une largeur de fenêtre minimale d'environ 500 px, une capture directe à 375 px met donc la page en page trop large et la coupe. Les composants Clerk (connexion) ne s'affichent pas de cette façon.
- Pièges rencontrés à cette vérification : un bouton `btn` à long libellé (adresse e-mail) plus large que sa carte fait déborder toute une grille à une colonne sur mobile (corrigé par `grid-cols-1`, `min-w-0` sur les cartes et un bouton plus compact) ; un bloc en ligne à trois zones (ticket) écrase son texte dès `md` (passé en ligne seulement à partir de `lg`) ; trois boutons « Commander ce bon » en trois colonnes de tablette passent sur deux lignes (libellé court « Commander » entre `sm` et `lg`, boutons calés en bas des cartes avec `mt-auto`) ; un menu déroulant avec un long libellé est tronqué dans la colonne de filtres de 15rem.

## Champ à valeurs multiples dans un formulaire natif

Motif utilisé pour les créneaux horaires d'un lieu de remise (`app/admin/lieux/forms.tsx`, `SlotsField`) : une liste modifiable (ajouter/retirer des lignes) gérée en état React, sérialisée en JSON dans un unique champ caché (`<input type="hidden" name="…" value={JSON.stringify(list)} />`) plutôt qu'en plusieurs champs nommés. Le serveur reparse et valide ce JSON (`lib/validation.ts`). À réutiliser pour tout futur champ « liste de… » dans un formulaire natif (`<form action={...}>`) plutôt que d'inventer une convention de nommage indexé (`item.0.from`, `item.1.from`…).

## Historique des décisions notables

- Rouge → jaune → bleu pour les surbrillances d'interface (identité du compte, survols de menu) : le rouge et le jaune plein ont été jugés trop forts tour à tour, le bleu dilué (`sea/15`) retenu comme compromis.
- Chiffres du tableau de bord : rouge → bleu foncé (`ink-deep`), pour ne garder le rouge que pour les actions, pas l'affichage d'information.
- Bouton flottant : bulle bas-droite → onglet latéral à 1/3 de hauteur, sur retour visuel direct de l'utilisateur.
