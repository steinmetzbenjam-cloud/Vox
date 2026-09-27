# Vox

Préparer, garder et retrouver ses raisonnements bibliques — pour la prédication,
le pastoral, et tout autre domaine qu'on veut ajouter ensuite.

Application web autonome : **aucun serveur, aucun compte, aucune donnée qui sort
de l'appareil**. Elle s'installe sur l'écran d'accueil et fonctionne hors ligne.

---

## Comment ça marche

**Accueil → domaine → thème.**

- Un **domaine** regroupe des thèmes (*Prédication*, *Pastoral*, et ceux que vous
  créerez). Nom, couleur et icône se changent à tout moment.
- Un **thème** est une préparation : « Pourquoi Dieu permet-il la souffrance ? »,
  « Accompagner un deuil »…
- Un thème s'ouvre en **lecture plein écran**, pensée pour être lue debout, en
  situation. Le bouton ⛶ efface toutes les commandes.
- Le **crayon rond**, en bas à droite, suit la lecture : il ouvre l'éditeur
  directement sur le bloc qu'on avait sous les yeux, et **Terminé** ramène au
  même endroit. Dans l'éditeur, l'en-tête reste visible en haut de l'écran.

Un thème se compose de blocs qu'on empile dans l'ordre voulu :

| Bloc | À quoi il sert |
|---|---|
| **Question** | L'objection ou la question posée, mise en évidence |
| **Texte** | Le raisonnement, mis en page (titres, gras, couleurs, listes, tableaux). Les références écrites dedans deviennent cliquables |
| **Écriture** | Une référence isolée, avec l'idée à retenir |
| **Photo** | Une photo de l'appareil, ou une image en ligne par son adresse |
| **Document** | Un fichier de l'appareil : PDF, image, vidéo, son, Word… Le toucher l'ouvre en plein écran |
| **Vidéo, lien** | Un titre et une adresse. YouTube, Vimeo, un fichier vidéo ou audio, une image : lus directement dans Vox. Le reste (jw.org, article, JW Library) : une carte cliquable |
| **Aparté** | Un rappel pour soi : « ne pas enchaîner trop vite » |

Un bloc **Question** accepte une *réponse attendue* facultative, affichée en
petit sous la question. C'est ce qui permet de préparer une partie coopérative :
la question se lit à voix haute, la réponse reste un pense-bête.

## Les documents joints

Un bloc **Document** garde un fichier de l'appareil dans Vox, à côté des photos.
Le toucher l'ouvre en plein écran, par-dessus le thème :

- **PDF** : toutes les pages, qu'on fait défiler, avec **−** et **+** pour
  zoomer. Sur iPhone, iPad et Android, les pages sont dessinées par pdf.js,
  car le lecteur intégré du navigateur n'y montre que la première page (ou
  rien). Sur ordinateur, c'est le lecteur du navigateur ;
- **image, vidéo, son, texte** : affichés ou lus sur place ;
- **le reste** (Word, PowerPoint…) : le bouton ↗ le confie à une autre
  application (Pages, Word, Fichiers…).

Au-delà de 25 Mo, Vox demande confirmation : un document lourd alourdit
chaque sauvegarde et chaque envoi.

Les adresses d'un bloc **Vidéo, lien** ne sont ouvertes que si elles
commencent par `http:`, `https:` ou `jwlibrary:`. Un paquet reçu de quelqu'un
d'autre ne peut donc pas glisser une adresse exécutable : la carte s'affiche,
mais elle reste inerte.

## La mise en page

Les blocs **Texte**, **Question** et **Aparté** ont une barre d'outils : titre,
sous-titre, **G**ras, *I*talique, **S**ouligné, barré, surligné, couleur,
listes, citation, lien, image en ligne, **encadré** en couleur, et **Aperçu**
pour voir le rendu. L'encadré entoure les lignes sélectionnées (ou celle du
curseur) ; rappelé sur un texte déjà encadré, il change sa couleur ou le retire.

La barre écrit pour vous quelques signes, proches du Markdown, qu'on peut aussi
taper à la main :

| On écrit | On obtient |
|---|---|
| `# Titre` · `## Sous-titre` · `### Intertitre` | Titres de trois tailles |
| `**gras**` · `*italique*` · `++souligné++` · `~~barré~~` | Mise en forme du texte |
| `==surligné==` | Surlignage |
| `[texte]{rouge}` | Couleur : `rouge`, `orange`, `vert`, `bleu`, `violet`, `gris` |
| `[texte](https://…)` | Lien |
| `![légende](https://…/image.jpg)` | Image en ligne, sur sa propre ligne |
| `- point` · `1. point` · `- [ ] à faire` | Listes (deux espaces devant pour un sous-niveau) |
| `> citation` · `---` | Citation, trait de séparation |
| `:::bleu` … `:::` (chacun sur sa ligne) | Encadré en couleur, autour des lignes qu'il entoure |
| `\| a \| b \|` puis `\|---\|---\|` | Tableau (la première ligne devient l'en-tête) |

Les couleurs suivent le mode clair ou sombre : un rouge reste lisible sur fond
noir. Aucun HTML n'est jamais interprété — un paquet reçu ne peut rien glisser
d'autre que ces signes.

**Coller garde la mise en page.** Un texte copié depuis Word, Pages, Google Docs
ou une page web arrive avec ses titres, son gras, ses couleurs, ses listes, ses
tableaux et ses liens.

## Importer un document

**Importer un thème → Choisir un fichier** accepte aussi des documents, qui
deviennent un thème en gardant leur mise en page :

- **Word (.docx)** : titres (styles Titre 1, 2, 3), gras, italique, souligné,
  barré, couleurs, surlignage, listes, tableaux, liens et images ;
- **Markdown (.md)** : c'est déjà la syntaxe de Vox ;
- **page web (.html)** et **texte (.txt)**.

Le premier titre devient le titre du thème. Chaque grande partie (titre de
premier ou deuxième niveau) devient un bloc Texte, et chaque image un bloc
Photo, ce qui permet de réorganiser ensuite. Les images d'un Markdown ou d'une
page web enregistrée sont des fichiers à côté du document : sélectionnez-les en
même temps que lui. Ce qui n'a pas pu être repris (image introuvable, format
EMF ou TIFF) est signalé avant l'import. Pour un document Pages, exportez-le
d'abord en Word.

## Les références bibliques

Toute référence écrite en clair est reconnue et devient un lien qui ouvre
**JW Library au bon verset**.

Les 66 livres sont reconnus, avec leurs abréviations courantes et sans
obligation d'accentuer : `Matthieu 24:14`, `Mt 24:14`, `Eccl. 9:5`,
`1 Cor 15:3, 4`, `Revelation 21:3-5`, `Chant de Salomon 8:6`…

Le lien produit suit le format JW Library :

```
jwlibrary:///finder?bible=40024014&pub=nwtsty&wtlocale=F
                          ││  │  └── verset  (3 chiffres)
                          ││  └───── chapitre (3 chiffres)
                          └└──────── livre    (2 chiffres)
```

Les plages deviennent `bible=66021003-66021005`.

JW Library doit être installée sur l'appareil. Sinon, **Réglages → Références
bibliques → jw.org** fait passer tous les liens par le site. Sur chaque bloc
Écriture, la petite flèche ↗ ouvre de toute façon jw.org.

## Retrouver une préparation

- Les **situations** (`deuil`, `visite`, `objection`…) sont des étiquettes libres
  posées sur un thème. Elles deviennent des filtres dans le domaine.
- La **recherche** balaie les titres, les étiquettes, les textes et les
  références, sans tenir compte des accents.
- L'**étoile** remonte un thème en haut de la liste.
- L'accueil propose les trois derniers thèmes consultés.

## Échanger un thème

Sur l'écran de lecture, le bouton **↗** propose deux chemins :

- **Envoyer le fichier** — un `.json` qui contient le thème *et ses photos*. Sur
  téléphone, la feuille de partage native s'ouvre : AirDrop, message, mail.
  Ailleurs, le fichier est simplement téléchargé.
- **Copier un lien** — le thème est compressé et logé dans l'adresse elle-même.
  Un thème courant tient en un millier de caractères, ce qui passe partout.
  En revanche le lien **laisse les photos de côté** : elles sont trop lourdes.

Celui qui reçoit touche le lien, ou passe par **Importer un thème** en bas d'un
domaine, puis choisit où le ranger.

**L'import ajoute, il ne remplace jamais.** Chaque thème reçu arrive avec un
identifiant neuf : réimporter deux fois le même lien donne deux exemplaires,
jamais un écrasement. À ne pas confondre avec `Réglages → Restaurer une
sauvegarde`, qui remplace tout et sert à changer d'appareil.

### Écrire un paquet à la main

Un paquet est un JSON lisible. On peut donc en préparer un sans passer par
l'application — pour se constituer une bibliothèque, ou en préparer pour
quelqu'un d'autre :

```json
{
  "application": "vox",
  "type": "partage",
  "version": 1,
  "titre": "Trois thèmes sur l'espérance",
  "themes": [
    {
      "titre": "Que devient-on à la mort ?",
      "soustitre": "Un état, pas un lieu",
      "situations": ["deuil"],
      "blocs": [
        { "type": "question", "texte": "« Est-ce qu'il me voit, là où il est ? »" },
        { "type": "texte",    "texte": "Montrer ce que la Bible dit réellement soulage." },
        { "type": "ecriture", "reference": "Ecclésiaste 9:5", "idee": "Les morts ne savent rien" },
        { "type": "note",     "texte": "Laisser un silence ici." },
        { "type": "image",    "reference": "p1", "legende": "Photo du texte" }
      ]
    }
  ],
  "images": { "p1": "data:image/jpeg;base64,…" }
}
```

Règles :

- Les sept types de blocs sont `question`, `texte`, `ecriture`, `image`,
  `document`, `media`, `note`.
- `question`, `texte` et `note` ont un champ `texte`. Les références écrites
  dedans deviennent cliquables toutes seules. `question` accepte en plus un
  champ `attendu` : la réponse espérée, affichée discrètement.
- `ecriture` prend une `reference` en clair et une `idee` facultative.
- `media` prend un `titre`, une `url` (`http:`, `https:` ou `jwlibrary:`
  uniquement) et une `idee` facultative.
- `document` pointe vers une clé de l'objet `images` par son champ
  `reference` (un `data:` de n'importe quel type : PDF, vidéo…), avec un
  `titre`, le `nom` du fichier et une `idee` facultative. Un lien copié ne
  transporte pas les documents, seul le fichier le fait.
- `image` pointe vers une clé de l'objet `images` par son champ `reference`,
  ou vers une image en ligne par un champ `url` (`https:`).
  Un bloc image dont la photo manque est simplement ignoré à l'import.
- `texte`, `question`, `note` et `attendu` acceptent la mise en page décrite
  plus haut.
- `images` peut être omis. Les identifiants, eux, ne doivent **pas** figurer :
  l'application les attribue elle-même.

Le fichier s'importe tel quel par **Importer un thème → Choisir un fichier**.

## Vos données

Tout est enregistré dans le navigateur de l'appareil (IndexedDB), photos
comprises. Rien n'est envoyé nulle part.

Conséquence : **si vous effacez les données du navigateur, tout disparaît.**

`Réglages → Sauvegarder…` produit un fichier `.json` unique contenant les thèmes
*et* les photos. Sur téléphone, la feuille de partage native s'ouvre : choisissez
**Dropbox**, iCloud Drive, Fichiers, Mail — la destination que vous voulez.
Gardez le même endroit à chaque fois, le nom du fichier porte la date.

Pour restaurer : `Réglages → Restaurer une sauvegarde`. Le sélecteur de fichiers
d'iOS sait aller chercher dans Dropbox et iCloud Drive si ces applications sont
installées. C'est aussi ainsi qu'on passe d'un téléphone à un autre.

Il n'y a **pas** de synchronisation automatique, et c'est délibéré : un OAuth
Dropbox suppose une application développeur, une clé, et des jetons qui expirent.
Pour une sauvegarde, échouer en silence est le pire défaut possible.

À la place, l'application compte ce qui vous appartient. Un thème est marqué
`sien` dès qu'il sort de l'éditeur, qu'il est créé ou qu'il est importé — le
contenu de départ, lui, ne compte pas tant qu'on n'y a pas touché. Si des thèmes
marqués ont changé depuis la dernière sauvegarde, l'accueil affiche un rappel,
que l'on peut repousser d'une semaine.

---

## Installation

### Sur iPhone / iPad

1. Ouvrir l'adresse du site dans **Safari** (pas Chrome : l'installation
   n'y fonctionne pas).
2. Bouton Partager → **Sur l'écran d'accueil**.
3. L'icône apparaît ; l'application s'ouvre en plein écran, sans barre Safari,
   et fonctionne sans réseau.

### Sur Android

Chrome propose **Installer l'application** dans son menu.

## Mise en ligne

Le dépôt ne contient que des fichiers statiques : il n'y a rien à compiler.

**GitHub Pages** — `Settings` → `Pages` → Source : `Deploy from a branch`,
branche `main`, dossier `/ (root)`. L'adresse est publiée en une minute.

**En local**, pour essayer :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

Ouvrir `index.html` directement au `file://` fonctionne aussi, mais sans le
mode hors ligne (le service worker exige `http://` ou `https://`).

---

## Organisation du code

Pas de framework, pas d'étape de compilation. Une seule bibliothèque, rangée
dans le dépôt : pdf.js (Mozilla), chargée seulement à l'ouverture d'un PDF sur
téléphone. Des fichiers JavaScript chargés dans l'ordre :

```
index.html              coquille
manifest.webmanifest    installation sur l'écran d'accueil
sw.js                   cache hors ligne
css/app.css             toute la mise en forme (clair + sombre)
js/bible.js             les 66 livres, analyse des références, liens JW Library
js/store.js             IndexedDB : domaines, thèmes, photos, réglages, export
js/seed.js              les thèmes de départ (posés au premier lancement)
js/partage.js           paquets de thèmes : fabrication, lien compressé, import
js/ui.js                éléments, icônes, modales, notifications
js/mise-en-page.js      mise en page des textes, conversion depuis du HTML
js/documents.js         import de documents Word, Markdown, HTML, texte
js/lecteur-pdf.js       PDF page par page sur iPhone et Android (pdf.js)
js/vues.js              les écrans
js/app.js               état, photos, routeur, démarrage
assets/                 icônes
assets/pdfjs/           pdf.js 6.3 (build legacy), licence Apache 2.0
```

**Un thème enregistré ressemble à ceci :**

```js
{
  id: 'k3f9x-a81c',
  domaineId: 'dom-predication',
  titre: 'Pourquoi Dieu permet-il la souffrance ?',
  soustitre: 'La question la plus fréquente, et la plus douloureuse',
  situations: ['deuil', 'objection'],
  favori: false,
  blocs: [
    { id: '…', type: 'question', texte: '« Si Dieu existe… »' },
    { id: '…', type: 'ecriture', reference: 'Jacques 1:13', idee: '…' },
    { id: '…', type: 'image',    imageId: '…', legende: '…' }
  ],
  ordre: 1757601600000,
  creeLe: '…', modifieLe: '…', consulteLe: '…'
}
```

Les photos ne sont pas stockées dans le thème : le bloc garde un `imageId` qui
pointe vers le magasin `images`, où la photo est gardée comme Blob après avoir
été ramenée à 1600 px de côté. Un bloc `document` garde de même un
`fichierId` vers ce magasin, le fichier y restant tel quel, avec son `nom`,
son type (`mime`) et sa `taille`.

### Ajouter une icône

Ajouter le tracé SVG dans `TRACES` (`js/ui.js`), sur une grille de 24×24, en
traits (`stroke`) et non en aplats. Le nom devient utilisable partout via
`icone('nom')`, et dans `UI.ICONES` pour l'offrir au choix des domaines.
