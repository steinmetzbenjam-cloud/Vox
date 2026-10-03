/*
 * Vox — état global, photos, routeur, démarrage.
 */

const Etat = {
  cible: 'app',   // « app » : JW Library ; « web » : jw.org
  couleurSoulignage: 'jaune', // la dernière couleur choisie pour souligner
  taille: 1,      // échelle du texte en lecture
  blocVise: null  // { theme, rang, id } : le bloc où reprendre, entre lecture et éditeur
};

/* ---------------------------------------------------------------- photos --- */

const Photos = (() => {
  // Les URL d'objet sont libérées à chaque changement d'écran, sinon les
  // photos restent en mémoire pendant toute la session.
  let enCours = [];

  function attacher(balise, imageId) {
    if (!imageId) return;
    Store.images.obtenir(imageId).then(enr => {
      if (!enr || !enr.blob) return;
      const url = URL.createObjectURL(enr.blob);
      enCours.push(url);
      balise.src = url;
    });
  }

  function liberer() {
    for (const url of enCours) URL.revokeObjectURL(url);
    enCours = [];
  }

  const COTE_MAX = 1600;

  /** Ramène une photo à une taille raisonnable avant de la stocker. */
  function reduire(fichier) {
    return new Promise((resoudre, rejeter) => {
      const url = URL.createObjectURL(fichier);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        const facteur = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
        if (facteur === 1 && fichier.size < 900 * 1024) {
          resoudre(fichier);
          return;
        }
        const toile = document.createElement('canvas');
        toile.width  = Math.round(image.width  * facteur);
        toile.height = Math.round(image.height * facteur);
        toile.getContext('2d').drawImage(image, 0, 0, toile.width, toile.height);
        toile.toBlob(
          blob => (blob ? resoudre(blob) : rejeter(new Error('Conversion impossible'))),
          'image/jpeg',
          0.85
        );
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        rejeter(new Error('Image illisible'));
      };
      image.src = url;
    });
  }

  return { attacher, liberer, reduire };
})();

/* --------------------------------------------------------------- version --- */

/**
 * Quelle version de Vox tourne sur cet appareil ?
 * Le numéro vit dans sw.js. Le service worker qui a servi la page au
 * démarrage est interrogé tout de suite : c'est la version du code en cours.
 * S'il est remplacé pendant la session, une version plus récente attend
 * simplement la prochaine ouverture.
 */
const Version = (() => {
  let enCours = null;
  let enAttente = null;
  const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : null;

  function demander(travailleur) {
    return new Promise(resoudre => {
      if (!travailleur) { resoudre(null); return; }
      const canal = new MessageChannel();
      const delai = setTimeout(() => resoudre(null), 2000);
      canal.port1.onmessage = ev => { clearTimeout(delai); resoudre(ev.data); };
      travailleur.postMessage('version', [canal.port2]);
    });
  }

  // Sans service worker (premier lancement, ouverture en file://), on lit le
  // numéro directement dans sw.js.
  function lireFichier() {
    return fetch('sw.js', { cache: 'no-store' })
      .then(r => r.text())
      .then(texte => {
        const version = texte.match(/const VERSION = '([^']+)'/);
        const date = texte.match(/const DATE_VERSION = '([^']+)'/);
        return version ? { version: version[1], date: date ? date[1] : null } : null;
      })
      .catch(() => null);
  }

  const pret = demander(sw && sw.controller)
    .then(v => v || lireFichier())
    .then(v => { enCours = v; });

  if (sw) {
    sw.addEventListener('controllerchange', () => {
      demander(sw.controller).then(v => {
        if (v && enCours && v.version !== enCours.version) enAttente = v;
      });
    });
  }

  return { lire: () => pret.then(() => ({ enCours, enAttente })) };
})();

/* --------------------------------------------------------------- routeur --- */

const Routeur = (() => {

  const ECRANS = [
    { motif: /^#?\/?$/,                     rendre: (c) => Vues.accueil(c) },
    { motif: /^#\/recherche$/,              rendre: (c) => Vues.recherche(c) },
    { motif: /^#\/i\/([A-Za-z0-9_-]+)$/,     rendre: (c, m) => Vues.importer(c, null, m[1]) },
    { motif: /^#\/importer$/,               rendre: (c) => Vues.importer(c, null, null) },
    { motif: /^#\/importer\/([^/]+)$/,      rendre: (c, m) => Vues.importer(c, m[1], null) },
    { motif: /^#\/reglages$/,               rendre: (c) => Vues.reglages(c) },
    { motif: /^#\/synchroniser$/,           rendre: (c) => Vues.synchroniser(c) },
    { motif: /^#\/d\/([^/]+)$/,             rendre: (c, m) => Vues.domaine(c, m[1]) },
    { motif: /^#\/t\/([^/]+)\/modifier$/,   rendre: (c, m) => Vues.editeur(c, m[1]) },
    { motif: /^#\/t\/([^/]+)$/,             rendre: (c, m) => Vues.theme(c, m[1]) }
  ];

  let dernierChemin = null;

  function rendre() {
    const chemin = location.hash || '#/';
    const conteneur = document.getElementById('app');

    UI.fermerModale();
    Photos.liberer();
    conteneur.innerHTML = '';
    // On ne quitte le plein écran qu'en changeant réellement d'écran.
    if (chemin !== dernierChemin) document.body.classList.remove('immersif');

    const ecran = ECRANS.find(e => e.motif.test(chemin));
    if (!ecran) {
      location.hash = '#/';
      return;
    }

    const correspondance = chemin.match(ecran.motif);
    const suite = ecran.rendre(conteneur, correspondance);

    if (chemin !== dernierChemin) window.scrollTo(0, 0);
    dernierChemin = chemin;

    Promise.resolve(suite).catch(erreur => {
      console.error(erreur);
      UI.annoncer('Quelque chose n’a pas pu s’afficher', 'erreur');
    });
  }

  /** Redessine l'écran courant (après une modification de données). */
  function rafraichir() {
    dernierChemin = null;
    rendre();
  }

  function demarrer() {
    window.addEventListener('hashchange', rendre);
    rendre();
  }

  return { demarrer, rafraichir, rendre };
})();

/* -------------------------------------------------------------- démarrage --- */

function preparerImmersion() {
  // En plein écran, toutes les commandes disparaissent : une bande invisible
  // en haut de l'écran permet d'en sortir d'une simple pression.
  const sortie = UI.el('button.sortie-immersion', {
    type: 'button',
    'aria-label': 'Quitter le plein écran',
    onclick: () => Vues.basculerImmersion()
  });
  document.body.appendChild(sortie);

  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && document.body.classList.contains('immersif')) {
      Vues.basculerImmersion();
    }
  });
}

function demarrer() {
  return Store.ouvrir()
    .then(() => Promise.all([
      Store.reglages.obtenir('cible', 'app'),
      Store.reglages.obtenir('taille', 1)
    ]))
    .then(([cible, taille]) => {
      Etat.cible = cible;
      Etat.taille = taille;
      document.documentElement.style.setProperty('--echelle', taille);
      return Seed.installer();
    })
    .then(() => {
      preparerImmersion();
      Routeur.demarrer();
      document.body.classList.add('prete');
    })
    .catch(erreur => {
      console.error(erreur);
      document.getElementById('app').appendChild(
        UI.el('div.vide', null, [
          UI.el('p.vide__texte', {
            texte: 'Vox n’a pas pu ouvrir sa base locale. Vérifiez que la navigation privée est désactivée.'
          })
        ])
      );
    });
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Sans service worker l'application fonctionne, simplement pas hors ligne.
    });
  });
}

document.addEventListener('DOMContentLoaded', demarrer);
