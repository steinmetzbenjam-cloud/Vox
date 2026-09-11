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

Un thème se compose de blocs qu'on empile dans l'ordre voulu :

| Bloc | À quoi il sert |
|---|---|
| **Question** | L'objection ou la question posée, mise en évidence |
| **Texte** | Le raisonnement. Les références écrites dedans deviennent cliquables |
| **Écriture** | Une référence isolée, avec l'idée à retenir |
| **Photo** | Une photo du texte, d'une publication, d'une note manuscrite |
| **Aparté** | Un rappel pour soi : « ne pas enchaîner trop vite » |

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

## Vos données

Tout est enregistré dans le navigateur de l'appareil (IndexedDB), photos
comprises. Rien n'est envoyé nulle part.

Conséquence : **si vous effacez les données du navigateur, tout disparaît.**
`Réglages → Exporter une sauvegarde` produit un fichier `.json` unique qui
contient les thèmes *et* les photos, et qui se restaure sur n'importe quel
appareil. C'est aussi la façon de passer d'un téléphone à un autre.

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

Pas de framework, pas d'étape de compilation, pas de dépendance. Six fichiers
JavaScript chargés dans l'ordre :

```
index.html              coquille
manifest.webmanifest    installation sur l'écran d'accueil
sw.js                   cache hors ligne
css/app.css             toute la mise en forme (clair + sombre)
js/bible.js             les 66 livres, analyse des références, liens JW Library
js/store.js             IndexedDB : domaines, thèmes, photos, réglages, export
js/seed.js              les thèmes de départ (posés au premier lancement)
js/ui.js                éléments, icônes, modales, notifications
js/vues.js              les écrans
js/app.js               état, photos, routeur, démarrage
assets/                 icônes
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
été ramenée à 1600 px de côté.

### Ajouter une icône

Ajouter le tracé SVG dans `TRACES` (`js/ui.js`), sur une grille de 24×24, en
traits (`stroke`) et non en aplats. Le nom devient utilisable partout via
`icone('nom')`, et dans `UI.ICONES` pour l'offrir au choix des domaines.
