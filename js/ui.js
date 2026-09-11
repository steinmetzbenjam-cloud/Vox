/*
 * Vox — briques d'interface : création d'éléments, icônes, dialogues.
 */
const UI = (() => {

  /** el('div.carte', { onclick }, [enfants…]) */
  function el(selecteur, attributs, enfants) {
    const parties = selecteur.split(/(?=[.#])/);
    const noeud = document.createElement(parties[0] || 'div');
    for (const partie of parties.slice(1)) {
      if (partie[0] === '.') noeud.classList.add(partie.slice(1));
      else if (partie[0] === '#') noeud.id = partie.slice(1);
    }
    if (attributs) {
      for (const [cle, valeur] of Object.entries(attributs)) {
        if (valeur === null || valeur === undefined || valeur === false) continue;
        if (cle === 'texte') noeud.textContent = valeur;
        else if (cle === 'html') noeud.innerHTML = valeur;
        else if (cle.startsWith('on') && typeof valeur === 'function') {
          noeud.addEventListener(cle.slice(2), valeur);
        } else if (cle === 'valeur') noeud.value = valeur;
        else noeud.setAttribute(cle, valeur === true ? '' : valeur);
      }
    }
    for (const enfant of [].concat(enfants || [])) {
      if (enfant === null || enfant === undefined || enfant === false) continue;
      noeud.appendChild(typeof enfant === 'string' ? document.createTextNode(enfant) : enfant);
    }
    return noeud;
  }

  const TRACES = {
    retour:     ['M15 5l-7 7 7 7'],
    croix:      ['M6 6l12 12', 'M18 6L6 18'],
    plus:       ['M12 5v14', 'M5 12h14'],
    crayon:     ['M4 20h4L18 10l-4-4L4 16z', 'M13 7l4 4'],
    etoile:     ['M12 3.5l2.6 5.4 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z'],
    loupe:      ['M11 4a7 7 0 100 14 7 7 0 000-14z', 'M20 20l-4.2-4.2'],
    reglages:   ['M4 7h9', 'M17 7h3', 'M4 12h3', 'M11 12h9', 'M4 17h11', 'M19 17h1',
                 'M15 7a2 2 0 10-.01 0z', 'M9 12a2 2 0 10-.01 0z', 'M17 17a2 2 0 10-.01 0z'],
    agrandir:   ['M4 9V4h5', 'M20 9V4h-5', 'M4 15v5h5', 'M20 15v5h-5'],
    reduire:    ['M9 4v5H4', 'M15 4v5h5', 'M9 20v-5H4', 'M15 20v-5h5'],
    photo:      ['M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2z',
                 'M8.5 10a1.5 1.5 0 10-.01 0z', 'M21 16l-5-5-4 4-2-2-4 4'],
    poubelle:   ['M5 7h14', 'M10 11v6', 'M14 11v6', 'M6.5 7l.8 13h9.4l.8-13', 'M9.5 7V4h5v3'],
    haut:       ['M12 19V6', 'M6 12l6-6 6 6'],
    bas:        ['M12 5v13', 'M18 12l-6 6-6-6'],
    livre:      ['M12 6s-2.2-2-6.5-2V17c4.3 0 6.5 2 6.5 2s2.2-2 6.5-2V4c-4.3 0-6.5 2-6.5 2z', 'M12 6v13'],
    porte:      ['M5 21h9V3H5z', 'M11.2 12h.01', 'M14 5.2l4 1.8v10l-4 1.8'],
    coeur:      ['M12 20s-7-4.4-7-9a4 4 0 017-2.7A4 4 0 0119 11c0 4.6-7 9-7 9z'],
    texte:      ['M5 7h14', 'M5 12h14', 'M5 17h9'],
    question:   ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M9.3 9.3A2.8 2.8 0 0113.6 12c-.8.7-1.6 1.2-1.6 2.3', 'M12 17.2h.01'],
    note:       ['M6 4h8l4.5 4.5V20H6z', 'M14 4v5h4.5'],
    externe:    ['M14 4h6v6', 'M20 4l-8.5 8.5', 'M18 14.5V19a1 1 0 01-1 1H6a1 1 0 01-1-1V8a1 1 0 011-1h4.5'],
    check:      ['M5 13l4.5 4.5L19 7'],
    telecharger:['M12 4v10', 'M8 10.5l4 4 4-4', 'M5 19h14'],
    televerser: ['M12 18V8', 'M8 11.5l4-4 4 4', 'M5 19h14'],
    etiquette:  ['M4 11V5a1 1 0 011-1h6l9 9-7 7z', 'M8.5 8h.01'],
    envoyer:    ['M12 3.5v11', 'M8 7.5l4-4 4 4',
                 'M7 11H5.5a1 1 0 00-1 1v7.5a1 1 0 001 1h13a1 1 0 001-1V12a1 1 0 00-1-1H17'],
    lien:       ['M10.8 13.2a3.6 3.6 0 005.4.4l2-2a3.6 3.6 0 00-5.1-5.1l-1.1 1.1',
                 'M13.2 10.8a3.6 3.6 0 00-5.4-.4l-2 2a3.6 3.6 0 005.1 5.1l1.1-1.1']
  };

  function icone(nom, classe) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'ic' + (classe ? ' ' + classe : ''));
    svg.setAttribute('aria-hidden', 'true');
    for (const d of (TRACES[nom] || [])) {
      const trace = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      trace.setAttribute('d', d);
      svg.appendChild(trace);
    }
    return svg;
  }

  /* ------------------------------------------------------------ toast --- */

  let minuterieToast = null;

  function annoncer(message, genre) {
    const boite = document.getElementById('toast');
    boite.textContent = message;
    boite.className = 'toast' + (genre ? ' toast--' + genre : '');
    boite.hidden = false;
    clearTimeout(minuterieToast);
    // Laisser un cadre repeindre avant d'animer, sinon la transition saute.
    requestAnimationFrame(() => boite.classList.add('toast--visible'));
    minuterieToast = setTimeout(() => {
      boite.classList.remove('toast--visible');
      setTimeout(() => { boite.hidden = true; }, 250);
    }, 2600);
  }

  /* --------------------------------------------------------- dialogues --- */

  function fermerModale() {
    const boite = document.getElementById('modale');
    boite.hidden = true;
    boite.innerHTML = '';
    document.body.classList.remove('sans-defilement');
  }

  function ouvrirModale(contenu, options) {
    const boite = document.getElementById('modale');
    boite.innerHTML = '';
    const fond = el('div.modale__fond', {
      onclick: () => { if (!options || options.fermable !== false) fermerModale(); }
    });
    const panneau = el('div.modale__panneau', { role: 'dialog', 'aria-modal': 'true' }, contenu);
    boite.appendChild(fond);
    boite.appendChild(panneau);
    boite.hidden = false;
    document.body.classList.add('sans-defilement');
    return panneau;
  }

  function confirmer(titre, message, motValider) {
    return new Promise(resoudre => {
      const conclure = reponse => { fermerModale(); resoudre(reponse); };
      ouvrirModale([
        el('h2.modale__titre', { texte: titre }),
        message ? el('p.modale__texte', { texte: message }) : null,
        el('div.modale__actions', null, [
          el('button.bouton.bouton--discret', { type: 'button', texte: 'Annuler', onclick: () => conclure(false) }),
          el('button.bouton.bouton--danger', { type: 'button', texte: motValider || 'Supprimer', onclick: () => conclure(true) })
        ])
      ]);
    });
  }

  /** Petite saisie en modale (remplace prompt(), pénible en application installée). */
  function demander(titre, valeurInitiale, options) {
    const reglages = options || {};
    return new Promise(resoudre => {
      const champ = reglages.multiligne
        ? el('textarea.champ.champ--zone', { rows: 4 })
        : el('input.champ', { type: 'text' });
      champ.value = valeurInitiale || '';
      if (reglages.repere) champ.setAttribute('placeholder', reglages.repere);

      const conclure = reponse => { fermerModale(); resoudre(reponse); };
      const valider = () => {
        const valeur = champ.value.trim();
        conclure(valeur ? valeur : null);
      };
      if (!reglages.multiligne) {
        champ.addEventListener('keydown', ev => { if (ev.key === 'Enter') valider(); });
      }

      ouvrirModale([
        el('h2.modale__titre', { texte: titre }),
        reglages.aide ? el('p.modale__texte', { texte: reglages.aide }) : null,
        champ,
        el('div.modale__actions', null, [
          el('button.bouton.bouton--discret', { type: 'button', texte: 'Annuler', onclick: () => conclure(null) }),
          el('button.bouton.bouton--plein', { type: 'button', texte: 'Valider', onclick: valider })
        ])
      ]);
      setTimeout(() => champ.focus(), 60);
    });
  }

  /* ------------------------------------------------------------ divers --- */

  const COULEURS = ['sauge', 'ambre', 'ardoise', 'brique', 'prune', 'ocean'];
  const ICONES   = ['porte', 'coeur', 'livre', 'etoile', 'note', 'question'];

  function dateCourte(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** « 3 écritures · 2 photos » — le résumé affiché sous chaque thème. */
  function resumeBlocs(blocs) {
    const liste = blocs || [];
    const ecritures = liste.filter(b => b.type === 'ecriture').length;
    const photos    = liste.filter(b => b.type === 'image').length;
    const morceaux = [];
    if (ecritures) morceaux.push(ecritures + (ecritures > 1 ? ' écritures' : ' écriture'));
    if (photos)    morceaux.push(photos + (photos > 1 ? ' photos' : ' photo'));
    if (!morceaux.length) morceaux.push('vide');
    return morceaux.join(' · ');
  }

  return { el, icone, annoncer, ouvrirModale, fermerModale, confirmer, demander,
           COULEURS, ICONES, dateCourte, resumeBlocs };
})();
