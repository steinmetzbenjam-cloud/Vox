/*
 * Vox — état global, photos, routeur, démarrage.
 */

const Etat = {
  cible: 'app',   // « app » : JW Library ; « web » : jw.org
  taille: 1       // échelle du texte en lecture
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

/* --------------------------------------------------------------- routeur --- */

const Routeur = (() => {

  const ECRANS = [
    { motif: /^#?\/?$/,                     rendre: (c) => Vues.accueil(c) },
    { motif: /^#\/recherche$/,              rendre: (c) => Vues.recherche(c) },
    { motif: /^#\/reglages$/,               rendre: (c) => Vues.reglages(c) },
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
