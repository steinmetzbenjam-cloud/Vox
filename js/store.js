/*
 * Vox — stockage local.
 * Tout vit dans le navigateur (IndexedDB) : aucune donnée ne part sur un
 * serveur. Les photos sont gardées telles quelles sous forme de Blob.
 */
const Store = (() => {

  const NOM_BASE = 'vox';
  const VERSION  = 1;
  let bdd = null;

  function ouvrir() {
    if (bdd) return Promise.resolve(bdd);
    return new Promise((resoudre, rejeter) => {
      const requete = indexedDB.open(NOM_BASE, VERSION);
      requete.onupgradeneeded = () => {
        const base = requete.result;
        if (!base.objectStoreNames.contains('domaines')) {
          base.createObjectStore('domaines', { keyPath: 'id' });
        }
        if (!base.objectStoreNames.contains('themes')) {
          const t = base.createObjectStore('themes', { keyPath: 'id' });
          t.createIndex('domaine', 'domaineId', { unique: false });
        }
        if (!base.objectStoreNames.contains('images')) {
          base.createObjectStore('images', { keyPath: 'id' });
        }
        if (!base.objectStoreNames.contains('reglages')) {
          base.createObjectStore('reglages', { keyPath: 'cle' });
        }
      };
      requete.onsuccess = () => { bdd = requete.result; resoudre(bdd); };
      requete.onerror   = () => rejeter(requete.error);
    });
  }

  function transaction(magasins, mode) {
    return ouvrir().then(base => base.transaction(magasins, mode));
  }

  function attendre(requete) {
    return new Promise((resoudre, rejeter) => {
      requete.onsuccess = () => resoudre(requete.result);
      requete.onerror   = () => rejeter(requete.error);
    });
  }

  function lire(magasin, methode, ...args) {
    return transaction([magasin], 'readonly')
      .then(tx => attendre(tx.objectStore(magasin)[methode](...args)));
  }

  function ecrire(magasin, methode, ...args) {
    return transaction([magasin], 'readwrite')
      .then(tx => attendre(tx.objectStore(magasin)[methode](...args)));
  }

  const identifiant = () =>
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

  const maintenant = () => new Date().toISOString();

  /* ---------------------------------------------------------- domaines --- */

  const domaines = {
    tous: () => lire('domaines', 'getAll')
      .then(liste => liste.sort((a, b) => a.ordre - b.ordre)),

    obtenir: id => lire('domaines', 'get', id),

    enregistrer(domaine) {
      const complet = Object.assign({
        id: identifiant(),
        nom: 'Sans titre',
        soustitre: '',
        couleur: 'sauge',
        icone: 'livre',
        ordre: Date.now(),
        creeLe: maintenant()
      }, domaine);
      complet.modifieLe = maintenant();
      return ecrire('domaines', 'put', complet).then(() => complet);
    },

    /** Supprime le domaine et tout ce qu'il contient. */
    supprimer(id) {
      return themes.parDomaine(id)
        .then(liste => Promise.all(liste.map(t => themes.supprimer(t.id))))
        .then(() => ecrire('domaines', 'delete', id));
    }
  };

  /* ------------------------------------------------------------ thèmes --- */

  /** Le fichier stocké qu'un bloc désigne : photo ou document joint. */
  function fichierDuBloc(bloc) {
    if (bloc.type === 'image') return bloc.imageId || null;
    if (bloc.type === 'document') return bloc.fichierId || null;
    return null;
  }

  const themes = {
    tous: () => lire('themes', 'getAll'),

    parDomaine(domaineId) {
      return transaction(['themes'], 'readonly')
        .then(tx => attendre(tx.objectStore('themes').index('domaine').getAll(domaineId)))
        .then(liste => liste.sort((a, b) => a.ordre - b.ordre));
    },

    obtenir: id => lire('themes', 'get', id),

    enregistrer(theme) {
      const complet = Object.assign({
        id: identifiant(),
        domaineId: null,
        titre: 'Nouveau thème',
        soustitre: '',
        situations: [],
        favori: false,
        blocs: [],
        ordre: Date.now(),
        creeLe: maintenant(),
        consulteLe: null
      }, theme);
      complet.modifieLe = maintenant();
      return ecrire('themes', 'put', complet).then(() => complet);
    },

    /** Supprime le thème, ses photos et ses documents. */
    supprimer(id) {
      return themes.obtenir(id).then(theme => {
        const photos = (theme && theme.blocs || [])
          .map(fichierDuBloc)
          .filter(Boolean)
          .map(fichier => images.supprimer(fichier));
        return Promise.all(photos).then(() => ecrire('themes', 'delete', id));
      });
    },

    marquerConsulte(id) {
      return themes.obtenir(id).then(theme => {
        if (!theme) return null;
        theme.consulteLe = maintenant();
        return ecrire('themes', 'put', theme).then(() => theme);
      });
    }
  };

  /* ------------------------------------------------------------ photos --- */

  // Le magasin « images » garde tous les fichiers de l'appareil : les photos,
  // et aussi les documents joints (PDF, vidéo…), sous forme de Blob.
  const images = {
    ajouter(blob) {
      const enr = { id: identifiant(), blob, ajouteLe: maintenant() };
      return ecrire('images', 'put', enr).then(() => enr.id);
    },
    obtenir: id => lire('images', 'get', id),
    supprimer: id => ecrire('images', 'delete', id)
  };

  /* ---------------------------------------------------------- réglages --- */

  const reglages = {
    obtenir(cle, defaut) {
      return lire('reglages', 'get', cle)
        .then(r => (r === undefined ? defaut : r.valeur));
    },
    definir: (cle, valeur) => ecrire('reglages', 'put', { cle, valeur })
  };

  /* ------------------------------------------------- sauvegarde / repli --- */

  function blobVersTexte(blob) {
    return new Promise((resoudre, rejeter) => {
      const lecteur = new FileReader();
      lecteur.onload  = () => resoudre(lecteur.result);
      lecteur.onerror = () => rejeter(lecteur.error);
      lecteur.readAsDataURL(blob);
    });
  }

  function texteVersBlob(donnees) {
    return fetch(donnees).then(r => r.blob());
  }

  /** Export complet, photos, documents et réglages compris, dans un seul fichier JSON. */
  function exporter() {
    return Promise.all([
      domaines.tous(), themes.tous(), lire('images', 'getAll'),
      reglages.obtenir('cible', 'app'), reglages.obtenir('taille', 1)
    ]).then(([lesDomaines, lesThemes, lesImages, cible, taille]) =>
      Promise.all(lesImages.map(i =>
        blobVersTexte(i.blob).then(donnees => ({ id: i.id, donnees, ajouteLe: i.ajouteLe }))
      )).then(imagesEncodees => ({
        application: 'vox',
        version: 1,
        exporteLe: maintenant(),
        domaines: lesDomaines,
        themes: lesThemes,
        images: imagesEncodees,
        reglages: { cible, taille }
      }))
    );
  }

  /** Une sauvegarde complète, et pas un simple paquet de thèmes partagés. */
  function estSauvegarde(donnees) {
    return !!donnees && donnees.application === 'vox' && donnees.type !== 'partage' &&
      Array.isArray(donnees.domaines) && Array.isArray(donnees.themes);
  }

  /** Lève une erreur explicite si `donnees` n'est pas une sauvegarde complète. */
  function verifierSauvegarde(donnees) {
    if (!donnees || donnees.application !== 'vox') throw new Error('Ce fichier ne vient pas de Vox.');
    if (donnees.type === 'partage') {
      throw new Error('Ce fichier contient des thèmes partagés, pas une sauvegarde complète. Passez par « Importer un thème » dans un domaine.');
    }
    if (!estSauvegarde(donnees)) throw new Error('Ce fichier n’est pas une sauvegarde complète de Vox.');
  }

  /**
   * Réimporte une sauvegarde.
   * `remplacer` vide la base au préalable ; sinon le contenu est fusionné.
   */
  function importer(donnees, remplacer) {
    // Vérifié avant de vider quoi que ce soit : un paquet de thèmes choisi
    // par erreur ne doit jamais effacer l'appareil.
    try {
      verifierSauvegarde(donnees);
    } catch (erreur) {
      return Promise.reject(erreur);
    }
    const depart = remplacer ? vider() : Promise.resolve();
    return depart
      .then(() => Promise.all((donnees.images || []).map(i =>
        texteVersBlob(i.donnees)
          .then(blob => ecrire('images', 'put', { id: i.id, blob, ajouteLe: i.ajouteLe }))
      )))
      .then(() => Promise.all((donnees.domaines || []).map(d => ecrire('domaines', 'put', d))))
      .then(() => Promise.all((donnees.themes || []).map(t => ecrire('themes', 'put', t))))
      .then(() => {
        // Les réglages voyagent aussi, s'ils sont présents et plausibles.
        const r = donnees.reglages || {};
        const poses = [];
        if (r.cible === 'app' || r.cible === 'web') poses.push(reglages.definir('cible', r.cible));
        if (typeof r.taille === 'number' && r.taille >= 0.9 && r.taille <= 1.5) {
          poses.push(reglages.definir('taille', r.taille));
        }
        return Promise.all(poses);
      })
      .then(() => ({
        domaines: (donnees.domaines || []).length,
        themes: (donnees.themes || []).length,
        images: (donnees.images || []).length
      }));
  }

  function vider() {
    return transaction(['domaines', 'themes', 'images'], 'readwrite').then(tx =>
      Promise.all([
        attendre(tx.objectStore('domaines').clear()),
        attendre(tx.objectStore('themes').clear()),
        attendre(tx.objectStore('images').clear())
      ])
    );
  }

  /**
   * Où en est-on d'une sauvegarde ?
   * Ne compte que ce que l'utilisateur a réellement produit : les thèmes de
   * départ, tant qu'on n'y a pas touché, ne justifient pas un rappel.
   */
  function etatSauvegarde() {
    return Promise.all([reglages.obtenir('derniereSauvegarde', null), themes.tous()])
      .then(([derniere, tous]) => {
        const repere = derniere ? Date.parse(derniere) : 0;
        // `sien` est posé dès qu'un thème sort de l'éditeur, est créé ou est
        // importé. Le contenu de départ, tant qu'on n'y touche pas, ne compte
        // pas : il se retrouve à l'identique sur n'importe quelle installation.
        const siens = tous.filter(t => t.sien);
        const enRetard = siens.filter(t => (Date.parse(t.modifieLe || 0) || 0) > repere);
        return { derniere, enRetard: enRetard.length, total: siens.length };
      });
  }

  return { ouvrir, domaines, themes, images, reglages, exporter, importer, estSauvegarde, verifierSauvegarde, vider,
           etatSauvegarde, identifiant, maintenant, fichierDuBloc };
})();
