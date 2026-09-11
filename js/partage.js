/*
 * Vox — échange de thèmes.
 *
 * Un « paquet » est un JSON autonome contenant un ou plusieurs thèmes détachés
 * de leur domaine, avec leurs photos embarquées. Il voyage de deux façons :
 *   — en fichier .json (photos comprises), par AirDrop, message ou mail ;
 *   — en lien, le paquet étant compressé puis encodé dans l'adresse elle-même.
 *
 * L'import AJOUTE toujours : il ne remplace jamais ce qui existe déjà, et
 * chaque thème reçoit un identifiant neuf. Réimporter deux fois crée deux
 * thèmes plutôt que d'en écraser un.
 */
const Partage = (() => {

  const MARQUE = 'vox';
  const TYPE = 'partage';
  const VERSION = 1;

  /* ------------------------------------------------------ base64 / url --- */

  function octetsVersBase64(octets) {
    let binaire = '';
    const tranche = 0x8000; // découpé, sinon on dépasse la pile des arguments
    for (let i = 0; i < octets.length; i += tranche) {
      binaire += String.fromCharCode.apply(null, octets.subarray(i, i + tranche));
    }
    return btoa(binaire);
  }

  function base64VersOctets(base64) {
    const binaire = atob(base64);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    return octets;
  }

  const versUrl  = b64 => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const depuisUrl = s => {
    const net = s.replace(/-/g, '+').replace(/_/g, '/');
    return net + '='.repeat((4 - net.length % 4) % 4);
  };

  /* ------------------------------------------------------- compression --- */

  const compressionDisponible = typeof CompressionStream !== 'undefined';

  function compresser(octets) {
    const flux = new Blob([octets]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Response(flux).arrayBuffer().then(tampon => new Uint8Array(tampon));
  }

  function decompresser(octets) {
    const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(flux).arrayBuffer().then(tampon => new Uint8Array(tampon));
  }

  /* ------------------------------------------------------- fabrication --- */

  function blobVersDonnees(blob) {
    return new Promise((resoudre, rejeter) => {
      const lecteur = new FileReader();
      lecteur.onload  = () => resoudre(lecteur.result);
      lecteur.onerror = () => rejeter(lecteur.error);
      lecteur.readAsDataURL(blob);
    });
  }

  /** Détache un thème de sa base : plus d'identifiants, photos référencées. */
  function detacher(theme, photos, avecPhotos) {
    const blocs = [];
    for (const bloc of (theme.blocs || [])) {
      if (bloc.type === 'image') {
        if (!avecPhotos || !bloc.imageId) continue; // sans photo, le bloc n'a plus d'objet
        const reference = 'p' + (Object.keys(photos).length + 1);
        photos[reference] = bloc.imageId;
        blocs.push({ type: 'image', reference, legende: bloc.legende || '' });
        continue;
      }
      // Liste blanche : rien d'autre que ces champs ne sort de l'appareil,
      // et rien d'autre n'entre depuis un paquet reçu.
      const copie = { type: bloc.type };
      for (const champ of ['texte', 'reference', 'idee', 'attendu', 'titre', 'url']) {
        if (bloc[champ]) copie[champ] = bloc[champ];
      }
      blocs.push(copie);
    }
    return {
      titre: theme.titre,
      soustitre: theme.soustitre || '',
      situations: (theme.situations || []).slice(),
      blocs
    };
  }

  /**
   * Construit un paquet à partir de thèmes de la base.
   * `avecPhotos` à faux produit un paquet léger, transmissible par lien.
   */
  function fabriquer(themes, options) {
    const reglages = options || {};
    const avecPhotos = reglages.avecPhotos !== false;
    const aChercher = {};
    const detaches = themes.map(t => detacher(t, aChercher, avecPhotos));

    const references = Object.keys(aChercher);
    return Promise.all(references.map(reference =>
      Store.images.obtenir(aChercher[reference])
        .then(enr => (enr && enr.blob ? blobVersDonnees(enr.blob) : null))
        .then(donnees => ({ reference, donnees }))
    )).then(photos => {
      const images = {};
      for (const p of photos) if (p.donnees) images[p.reference] = p.donnees;
      return {
        application: MARQUE,
        type: TYPE,
        version: VERSION,
        exporteLe: new Date().toISOString(),
        titre: reglages.titre || (themes.length === 1 ? themes[0].titre : themes.length + ' thèmes'),
        themes: detaches,
        images
      };
    });
  }

  /** Combien de photos seraient perdues dans un envoi sans photos. */
  function comptePhotos(themes) {
    return themes.reduce((total, t) =>
      total + (t.blocs || []).filter(b => b.type === 'image' && b.imageId).length, 0);
  }

  /* ------------------------------------------------------------ lecture --- */

  const PREFIXE_COMPRESSE = 'VOXZ';
  const PREFIXE_BRUT      = 'VOXP';

  /** Paquet → code texte, à glisser dans un lien. */
  function encoder(paquet) {
    const octets = new TextEncoder().encode(JSON.stringify(paquet));
    if (!compressionDisponible) {
      return Promise.resolve(PREFIXE_BRUT + versUrl(octetsVersBase64(octets)));
    }
    return compresser(octets).then(serres => PREFIXE_COMPRESSE + versUrl(octetsVersBase64(serres)));
  }

  /** Code texte → paquet. Rejette si le code est tronqué ou étranger. */
  function decoder(code) {
    const propre = String(code || '').trim().replace(/\s+/g, '');
    const compresse = propre.startsWith(PREFIXE_COMPRESSE);
    const brut = propre.startsWith(PREFIXE_BRUT);
    if (!compresse && !brut) {
      return Promise.reject(new Error('Ce code ne vient pas de Vox.'));
    }
    let octets;
    try {
      octets = base64VersOctets(depuisUrl(propre.slice(4)));
    } catch (e) {
      return Promise.reject(new Error('Le code est incomplet ou abîmé.'));
    }
    const texte = compresse
      ? decompresser(octets).then(clair => new TextDecoder().decode(clair))
      : Promise.resolve(new TextDecoder().decode(octets));

    return texte
      .then(brut => JSON.parse(brut))
      .then(verifier)
      .catch(erreur => {
        if (erreur && erreur.paquetInvalide) throw erreur;
        throw new Error('Le code est incomplet ou abîmé.');
      });
  }

  /** Vérifie qu'un objet est bien un paquet Vox exploitable. */
  function verifier(paquet) {
    const refuser = message => {
      const erreur = new Error(message);
      erreur.paquetInvalide = true;
      throw erreur;
    };
    if (!paquet || typeof paquet !== 'object') refuser('Fichier illisible.');
    if (paquet.application !== MARQUE) refuser('Ce fichier ne vient pas de Vox.');
    if (paquet.type !== TYPE) {
      if (Array.isArray(paquet.domaines)) {
        refuser('Ceci est une sauvegarde complète. Passez par Réglages → Restaurer une sauvegarde.');
      }
      refuser('Ce fichier ne contient pas de thème à importer.');
    }
    if (!Array.isArray(paquet.themes) || !paquet.themes.length) refuser('Ce paquet ne contient aucun thème.');
    for (const theme of paquet.themes) {
      if (!theme || typeof theme.titre !== 'string' || !Array.isArray(theme.blocs)) {
        refuser('Ce paquet est mal formé.');
      }
    }
    return paquet;
  }

  function lireFichier(fichier) {
    return fichier.text().then(texte => {
      let objet;
      try {
        objet = JSON.parse(texte);
      } catch (e) {
        throw new Error('Fichier illisible : ce n’est pas du JSON.');
      }
      return verifier(objet);
    });
  }

  /* ----------------------------------------------------------- pose --- */

  /**
   * Pose les thèmes d'un paquet dans un domaine.
   * Rien n'est écrasé : chaque thème arrive avec un identifiant neuf.
   */
  function installer(paquet, domaineId) {
    const images = paquet.images || {};
    const references = Object.keys(images);

    return Promise.all(references.map(reference =>
      fetch(images[reference])
        .then(r => r.blob())
        .then(blob => Store.images.ajouter(blob))
        .then(imageId => ({ reference, imageId }))
        .catch(() => ({ reference, imageId: null }))
    )).then(posees => {
      const parReference = new Map(posees.map(p => [p.reference, p.imageId]));
      const depart = Date.now();

      return Promise.all(paquet.themes.map((theme, rang) => {
        const blocs = [];
        for (const bloc of theme.blocs) {
          if (bloc.type === 'image') {
            const imageId = parReference.get(bloc.reference);
            if (!imageId) continue; // photo absente du paquet : on saute le bloc
            blocs.push({ id: Store.identifiant(), type: 'image', imageId, legende: bloc.legende || '' });
            continue;
          }
          blocs.push(Object.assign({ id: Store.identifiant() }, bloc));
        }
        return Store.themes.enregistrer({
          domaineId,
          sien: true, // reçu de quelqu'un : à sauvegarder comme le reste
          titre: theme.titre,
          soustitre: theme.soustitre || '',
          situations: (theme.situations || []).slice(),
          blocs,
          ordre: depart + rang
        });
      }));
    });
  }

  /** Résumé montré avant de confirmer un import. */
  function resumer(paquet) {
    const themes = paquet.themes.length;
    const ecritures = paquet.themes.reduce((n, t) =>
      n + t.blocs.filter(b => b.type === 'ecriture').length, 0);
    const photos = Object.keys(paquet.images || {}).length;
    const morceaux = [themes + (themes > 1 ? ' thèmes' : ' thème')];
    if (ecritures) morceaux.push(ecritures + (ecritures > 1 ? ' écritures' : ' écriture'));
    if (photos) morceaux.push(photos + (photos > 1 ? ' photos' : ' photo'));
    return morceaux.join(' · ');
  }

  /** Adresse complète à envoyer à quelqu'un qui a l'application. */
  function lienPour(code) {
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    return base + '#/i/' + code;
  }

  return { fabriquer, encoder, decoder, lireFichier, installer, resumer,
           lienPour, comptePhotos, verifier };
})();
