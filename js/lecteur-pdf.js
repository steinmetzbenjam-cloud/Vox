/*
 * Vox — lecture des PDF, page par page.
 *
 * Safari sur iPhone n'affiche que la première page d'un PDF intégré à une
 * page, et Chrome sur Android ne l'affiche pas du tout. Sur ces appareils,
 * pdf.js (Mozilla, rangé dans assets/pdfjs) dessine lui-même chaque page.
 * Il n'est chargé qu'à la première ouverture d'un PDF, puis gardé en cache
 * pour fonctionner sans réseau.
 *
 * Les pages ne sont dessinées qu'à l'approche de l'écran, et effacées quand
 * on s'en éloigne : un cahier de cinquante pages ne sature pas la mémoire
 * d'un téléphone.
 */
const LecteurPdf = (() => {

  const el = UI.el;
  const BASE = new URL('assets/pdfjs/', document.baseURI).href;
  const ZOOMS = [1, 1.5, 2, 3];

  let chargement = null;

  /** Le lecteur intégré du navigateur ne suffit pas : iPhone, iPad, Android. */
  function necessaire() {
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return ios || navigator.pdfViewerEnabled === false;
  }

  function charger() {
    if (!chargement) {
      chargement = import(BASE + 'pdf.min.mjs').then(pdfjs => {
        pdfjs.GlobalWorkerOptions.workerSrc = BASE + 'pdf.worker.min.mjs';
        return pdfjs;
      });
      chargement.catch(() => { chargement = null; }); // réessayer à la prochaine ouverture
    }
    return chargement;
  }

  /**
   * Affiche toutes les pages de `blob` dans `scene`, qui défile.
   * Renvoie { zoomer(sens), arreter() } ; la promesse `pret` échoue si le
   * document ne peut pas être lu.
   */
  function afficher(blob, scene) {
    let arrete = false;
    let doc = null;
    let observateur = null;
    let zoom = 0;
    const pages = [];

    const feuille = el('div.pdf');
    const avis = el('p.visionneuse__avis', { texte: 'Ouverture du document…' });
    scene.classList.add('visionneuse__scene--pdf');
    scene.appendChild(avis);
    scene.appendChild(feuille);

    function dessiner(entree) {
      if (entree.canvas || entree.enCours) return;
      entree.enCours = true;
      const largeur = entree.boite.clientWidth;
      const densite = Math.min(window.devicePixelRatio || 1, 2);
      const base = entree.page.getViewport({ scale: 1 });
      const vue = entree.page.getViewport({ scale: (largeur * densite) / base.width });
      const toile = el('canvas.pdf__toile');
      toile.width = Math.floor(vue.width);
      toile.height = Math.floor(vue.height);
      entree.tache = entree.page.render({ canvasContext: toile.getContext('2d'), viewport: vue });
      entree.tache.promise.then(() => {
        entree.enCours = false;
        if (arrete || !entree.visible) { toile.width = 0; return; }
        entree.boite.appendChild(toile);
        entree.canvas = toile;
      }).catch(() => { entree.enCours = false; });
    }

    function effacer(entree) {
      if (entree.tache && entree.enCours) entree.tache.cancel();
      if (!entree.canvas) return;
      entree.canvas.width = 0; // rend la mémoire tout de suite, surtout sur iOS
      entree.canvas.remove();
      entree.canvas = null;
    }

    const pret = blob.arrayBuffer()
      .then(octets => charger().then(pdfjs => pdfjs.getDocument({
        data: octets,
        standardFontDataUrl: BASE + 'standard_fonts/',
        isEvalSupported: false // un PDF reçu d'un tiers ne doit rien exécuter
      }).promise))
      .then(leDoc => {
        doc = leDoc;
        if (arrete) { doc.destroy(); return; }
        const promesses = [];
        for (let n = 1; n <= doc.numPages; n++) promesses.push(doc.getPage(n));
        return Promise.all(promesses);
      })
      .then(lesPages => {
        if (!lesPages || arrete) return;
        avis.remove();
        observateur = new IntersectionObserver(entrees => {
          for (const e of entrees) {
            const entree = pages[Number(e.target.dataset.page)];
            entree.visible = e.isIntersecting;
            if (e.isIntersecting) dessiner(entree);
            else effacer(entree);
          }
        }, { root: scene, rootMargin: '150% 50%' });

        lesPages.forEach((page, rang) => {
          const vue = page.getViewport({ scale: 1 });
          const boite = el('div.pdf__page', { 'data-page': rang });
          boite.style.aspectRatio = vue.width + ' / ' + vue.height;
          feuille.appendChild(boite);
          pages.push({ page, boite, canvas: null, visible: false });
          observateur.observe(boite);
        });
      });

    pret.catch(() => { avis.remove(); });

    function zoomer(sens) {
      const suivant = Math.max(0, Math.min(ZOOMS.length - 1, zoom + sens));
      if (suivant === zoom) return;
      // Garder le même endroit du document sous les yeux.
      const repereY = scene.scrollHeight ? scene.scrollTop / scene.scrollHeight : 0;
      zoom = suivant;
      feuille.style.width = (ZOOMS[zoom] * 100) + '%';
      scene.scrollTop = repereY * scene.scrollHeight;
      scene.scrollLeft = (scene.scrollWidth - scene.clientWidth) / 2;
      for (const entree of pages) {
        effacer(entree);
        if (entree.visible) dessiner(entree);
      }
    }

    function arreter() {
      arrete = true;
      if (observateur) observateur.disconnect();
      for (const entree of pages) effacer(entree);
      if (doc) doc.destroy();
    }

    return { pret, zoomer, arreter };
  }

  return { necessaire, afficher };
})();
