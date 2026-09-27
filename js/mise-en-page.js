/*
 * Vox — mise en page des textes.
 *
 * Un texte reste du texte : la mise en forme s'écrit avec quelques signes,
 * proches du Markdown, que la barre d'outils de l'éditeur pose à votre place.
 * Un paquet reçu ne peut donc jamais glisser de HTML dans l'appareil : tout
 * est reconstruit ici, élément par élément, sans innerHTML.
 *
 *   # Titre          ## Sous-titre       ### Intertitre
 *   **gras**         *italique*          ++souligné++
 *   ~~barré~~        ==surligné==        [texte]{rouge}
 *   [texte](https://…)                   ![légende](https://…/image.jpg)
 *   - puce           1. numéro           - [ ] case à cocher
 *   > citation       ---  (trait)        | tableau | à | colonnes |
 *
 * Couleurs : rouge, orange, vert, bleu, violet, gris. Elles suivent le thème
 * clair ou sombre, au lieu d'imposer une teinte illisible sur fond noir.
 */
const MiseEnPage = (() => {

  const el = UI.el;

  const COULEURS = ['rouge', 'orange', 'vert', 'bleu', 'violet', 'gris'];

  /* ------------------------------------------------------ adresses sûres --- */

  /** Seules ces adresses deviennent cliquables : jamais de « javascript: ». */
  function lienSur(url) {
    const propre = String(url || '').trim();
    return /^(https?:|jwlibrary:)/i.test(propre) ? propre : null;
  }

  /** Source d'image acceptée : une adresse web, ou une image embarquée. */
  function imageSure(src) {
    const propre = String(src || '').trim();
    if (/^https?:\/\//i.test(propre)) return propre;
    if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(propre)) return propre;
    return null;
  }

  /* ------------------------------------------------------------ en ligne --- */

  const MOTIF = new RegExp([
    '\\\\([\\\\`*_{}\\[\\]()#+\\-.!|~=>])',                    // 1     échappement
    '!\\[([^\\]]*)\\]\\(([^)\\s]+)\\)',                          // 2, 3  image
    '\\[([^\\]]+)\\]\\{(' + COULEURS.join('|') + ')\\}',        // 4, 5  couleur
    '\\[([^\\]]+)\\]\\(([^)\\s]+)\\)',                          // 6, 7  lien
    '\\*\\*(?=\\S)([\\s\\S]*?\\S)\\*\\*',                       // 8     gras
    '\\+\\+(?=\\S)([\\s\\S]*?\\S)\\+\\+',                       // 9     souligné
    '~~(?=\\S)([\\s\\S]*?\\S)~~',                               // 10    barré
    '==(?=\\S)([\\s\\S]*?\\S)==',                               // 11    surligné
    '\\*(?=[^\\s*])([\\s\\S]*?[^\\s*])\\*',                     // 12    italique
    '(https?:\\/\\/[^\\s<>()\\[\\]]*[^\\s<>()\\[\\].,;:!?»"\'])' // 13    adresse nue
  ].join('|'), 'g');

  function texteSimple(parent, texte) {
    parent.appendChild(document.createTextNode(texte));
  }

  /**
   * Pose une ligne mise en forme dans `parent`. Le texte ordinaire passe par
   * `semer`, qui y repère les références bibliques.
   */
  function enLigne(parent, texte, semer, options) {
    const planter = semer || texteSimple;
    const motif = new RegExp(MOTIF.source, 'g');
    const source = String(texte || '');
    let curseur = 0;
    let m;
    while ((m = motif.exec(source))) {
      if (m.index > curseur) planter(parent, source.slice(curseur, m.index));
      curseur = motif.lastIndex;

      if (m[1] !== undefined) {
        planter(parent, m[1]);
      } else if (m[3] !== undefined) {
        const src = imageSure(m[3]);
        if (src) {
          const image = el('img.mp-image-ligne', { src, alt: m[2] || '', loading: 'lazy' });
          if (options && options.agrandir) {
            image.addEventListener('click', () => options.agrandir(src, m[2]));
          }
          parent.appendChild(image);
        } else if (m[2]) {
          planter(parent, m[2]);
        }
      } else if (m[5] !== undefined) {
        const teinte = el('span.mp-c-' + m[5]);
        enLigne(teinte, m[4], planter, options);
        parent.appendChild(teinte);
      } else if (m[7] !== undefined) {
        const adresse = lienSur(m[7]);
        if (adresse) {
          const lien = el('a.mp-lien', {
            href: adresse,
            rel: 'noopener noreferrer',
            target: /^https?:/i.test(adresse) ? '_blank' : null
          });
          enLigne(lien, m[6], texteSimple, options);
          parent.appendChild(lien);
        } else {
          enLigne(parent, m[6], planter, options);
        }
      } else if (m[8] !== undefined) {
        parent.appendChild(envelopper('strong', m[8], planter, options));
      } else if (m[9] !== undefined) {
        parent.appendChild(envelopper('u', m[9], planter, options));
      } else if (m[10] !== undefined) {
        parent.appendChild(envelopper('s', m[10], planter, options));
      } else if (m[11] !== undefined) {
        parent.appendChild(envelopper('mark.mp-surligne', m[11], planter, options));
      } else if (m[12] !== undefined) {
        parent.appendChild(envelopper('em', m[12], planter, options));
      } else if (m[13] !== undefined) {
        parent.appendChild(el('a.mp-lien', {
          href: m[13], texte: m[13], rel: 'noopener noreferrer', target: '_blank'
        }));
      }
    }
    if (curseur < source.length) planter(parent, source.slice(curseur));
  }

  function envelopper(selecteur, texte, semer, options) {
    const noeud = el(selecteur);
    enLigne(noeud, texte, semer, options);
    return noeud;
  }

  /* -------------------------------------------------------------- blocs --- */

  const LISTE    = /^(\s*)([-*•+]|\d{1,3}[.)])\s+(.*)$/;
  const TITRE    = /^(#{1,6})\s+(.*)$/;
  const TRAIT    = /^(-{3,}|\*{3,}|_{3,})$/;
  const IMAGE    = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
  const SEPARATION_TABLEAU = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

  /**
   * Transforme un texte complet en éléments : titres, paragraphes, listes,
   * tableaux, citations, images. Options :
   *   classe   — classe des paragraphes (« para » par défaut) ;
   *   semer    — pose du texte ordinaire (liens bibliques) ;
   *   agrandir — appelé au toucher d'une image.
   */
  function rendre(texte, options) {
    const reglages = options || {};
    const semer = reglages.semer || texteSimple;
    const classe = reglages.classe || 'para';
    const fragment = document.createDocumentFragment();
    const lignes = String(texte || '').replace(/\r\n?/g, '\n').split('\n');

    let paragraphe = [];
    const vider = () => {
      if (!paragraphe.length) return;
      const p = el('p.' + classe);
      paragraphe.forEach((ligne, rang) => {
        if (rang) p.appendChild(el('br'));
        enLigne(p, ligne, semer, reglages);
      });
      fragment.appendChild(p);
      paragraphe = [];
    };

    let i = 0;
    while (i < lignes.length) {
      const ligne = lignes[i];
      const net = ligne.trim();
      let m;

      if (!net) { vider(); i++; continue; }

      if ((m = net.match(TITRE))) {
        vider();
        const niveau = Math.min(m[1].length, 3);
        // h1 est réservé au titre du thème : les titres du texte commencent à h2.
        const titre = el('h' + (niveau + 1) + '.mp-titre.mp-titre--' + niveau);
        enLigne(titre, m[2], semer, reglages);
        fragment.appendChild(titre);
        i++;
        continue;
      }

      if (TRAIT.test(net)) {
        vider();
        fragment.appendChild(el('hr.mp-trait'));
        i++;
        continue;
      }

      if ((m = net.match(IMAGE))) {
        vider();
        const src = imageSure(m[2]);
        if (src) {
          const image = el('img.figure__image', { src, alt: m[1] || '', loading: 'lazy' });
          if (reglages.agrandir) image.addEventListener('click', () => reglages.agrandir(src, m[1]));
          fragment.appendChild(el('figure.figure', null, [
            image,
            m[1] ? el('figcaption.figure__legende', { texte: m[1] }) : null
          ]));
        }
        i++;
        continue;
      }

      if (net.startsWith('>')) {
        vider();
        const dedans = [];
        while (i < lignes.length && lignes[i].trim().startsWith('>')) {
          dedans.push(lignes[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        const citation = el('blockquote.mp-citation');
        citation.appendChild(rendre(dedans.join('\n'), Object.assign({}, reglages, { classe: 'para' })));
        fragment.appendChild(citation);
        continue;
      }

      if (net.startsWith('|')) {
        vider();
        const rangees = [];
        while (i < lignes.length && lignes[i].trim().startsWith('|')) {
          rangees.push(lignes[i].trim());
          i++;
        }
        fragment.appendChild(tableau(rangees, semer, reglages));
        continue;
      }

      if (LISTE.test(ligne)) {
        vider();
        const items = [];
        while (i < lignes.length && LISTE.test(lignes[i])) {
          items.push(lignes[i]);
          i++;
        }
        fragment.appendChild(liste(items, semer, reglages));
        continue;
      }

      paragraphe.push(ligne);
      i++;
    }
    vider();
    return fragment;
  }

  function cellules(rangee) {
    const interieur = rangee.replace(/^\|/, '').replace(/\|$/, '');
    return interieur.replace(/\\\|/g, '\u0000').split('|')
      .map(c => c.replace(/\u0000/g, '|').trim());
  }

  function tableau(rangees, semer, options) {
    const table = el('table.mp-table');
    let entete = null;
    let corps = rangees;
    if (rangees.length > 1 && SEPARATION_TABLEAU.test(rangees[1])) {
      entete = rangees[0];
      corps = rangees.slice(2);
    }
    if (entete) {
      const tr = el('tr');
      for (const c of cellules(entete)) {
        const th = el('th');
        enLigne(th, c, semer, options);
        tr.appendChild(th);
      }
      table.appendChild(el('thead', null, [tr]));
    }
    const tbody = el('tbody');
    for (const rangee of corps) {
      if (SEPARATION_TABLEAU.test(rangee)) continue;
      const tr = el('tr');
      for (const c of cellules(rangee)) {
        const td = el('td');
        enLigne(td, c, semer, options);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    // Un tableau large défile sur lui-même, sans élargir la page.
    return el('div.mp-tableau', null, [table]);
  }

  function liste(lignes, semer, options) {
    const fragment = document.createDocumentFragment();
    const pile = []; // { niveau, ordonnee, noeud, dernier }

    for (const ligne of lignes) {
      const m = ligne.match(LISTE);
      const niveau = Math.floor(m[1].replace(/\t/g, '  ').length / 2);
      const ordonnee = /\d/.test(m[2]);

      while (pile.length && pile[pile.length - 1].niveau > niveau) pile.pop();
      let haut = pile[pile.length - 1];
      if (haut && haut.niveau === niveau && haut.ordonnee !== ordonnee) {
        pile.pop();
        haut = pile[pile.length - 1];
      }
      if (!haut || haut.niveau < niveau) {
        const noeud = el(ordonnee ? 'ol.mp-liste' : 'ul.mp-liste');
        const depart = parseInt(m[2], 10);
        if (ordonnee && depart !== 1) noeud.setAttribute('start', depart);
        if (haut && haut.dernier) haut.dernier.appendChild(noeud);
        else fragment.appendChild(noeud);
        haut = { niveau, ordonnee, noeud, dernier: null };
        pile.push(haut);
      }

      const li = el('li');
      let contenu = m[3];
      const caseACocher = contenu.match(/^\[([ xX])\]\s+(.*)$/);
      if (caseACocher) {
        li.classList.add('mp-case');
        li.appendChild(el('span.mp-case__boite', { texte: caseACocher[1].trim() ? '☑' : '☐' }));
        contenu = caseACocher[2];
      }
      enLigne(li, contenu, semer, options);
      haut.noeud.appendChild(li);
      haut.dernier = li;
    }
    return fragment;
  }

  /** Le texte sans ses marques : pour un aperçu d'une ligne. */
  function retirer(texte) {
    return String(texte || '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\{[a-z]+\}/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|\+\+|~~|==|\*)/g, '')
      .replace(/^\s*(#{1,6}|>|[-*•+]|\d{1,3}[.)])\s+/gm, '')
      .replace(/\\(.)/g, '$1');
  }

  /* ---------------------------------------------------------- couleurs --- */

  const NOMMEES = {
    red: 'rouge', darkred: 'rouge', maroon: 'rouge', crimson: 'rouge', firebrick: 'rouge',
    orange: 'orange', darkorange: 'orange', brown: 'orange', chocolate: 'orange',
    green: 'vert', darkgreen: 'vert', olive: 'vert', teal: 'vert', seagreen: 'vert',
    blue: 'bleu', navy: 'bleu', darkblue: 'bleu', royalblue: 'bleu', steelblue: 'bleu',
    purple: 'violet', indigo: 'violet', violet: 'violet', magenta: 'violet', fuchsia: 'violet',
    gray: 'gris', grey: 'gris', dimgray: 'gris', dimgrey: 'gris', darkgray: 'gris', darkgrey: 'gris'
  };

  function versRgb(valeur) {
    const v = String(valeur || '').trim().toLowerCase();
    let m;
    if ((m = v.match(/^#?([0-9a-f]{6})$/))) {
      return [0, 2, 4].map(k => parseInt(m[1].slice(k, k + 2), 16));
    }
    if ((m = v.match(/^#([0-9a-f]{3})$/))) {
      return m[1].split('').map(c => parseInt(c + c, 16));
    }
    if ((m = v.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)$/))) {
      if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
      return [m[1], m[2], m[3]].map(Number);
    }
    return null;
  }

  function teinte(valeur) {
    const rgb = versRgb(valeur);
    if (!rgb) return null;
    const [r, g, b] = rgb.map(x => x / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const clarte = (max + min) / 2;
    const ecart = max - min;
    const saturation = ecart === 0 ? 0 : ecart / (1 - Math.abs(2 * clarte - 1));
    let angle = 0;
    if (ecart) {
      if (max === r) angle = 60 * (((g - b) / ecart) % 6);
      else if (max === g) angle = 60 * ((b - r) / ecart + 2);
      else angle = 60 * ((r - g) / ecart + 4);
    }
    if (angle < 0) angle += 360;
    return { angle, saturation, clarte };
  }

  /** La couleur de la palette la plus proche ; rien pour le noir ou le blanc. */
  function couleurProche(valeur) {
    const nom = String(valeur || '').trim().toLowerCase();
    if (NOMMEES[nom]) return NOMMEES[nom];
    const t = teinte(valeur);
    if (!t) return null;
    if (t.saturation < 0.25) return t.clarte > 0.3 && t.clarte < 0.8 ? 'gris' : null;
    if (t.clarte < 0.12 || t.clarte > 0.92) return null;
    const a = t.angle;
    if (a < 15 || a >= 335) return 'rouge';
    if (a < 70) return 'orange';
    if (a < 170) return 'vert';
    if (a < 260) return 'bleu';
    return 'violet';
  }

  /** Un fond de texte qui ressemble à un surlignage (jaune, vert pâle…). */
  function estSurlignage(valeur) {
    const nom = String(valeur || '').trim().toLowerCase();
    if (['yellow', 'lime', 'cyan', 'aqua', 'pink', 'gold'].includes(nom)) return true;
    const t = teinte(valeur);
    return !!t && t.saturation > 0.35 && t.clarte > 0.35 && t.clarte < 0.95;
  }

  /* ------------------------------------------------------- fabrication --- */

  /** Protège les caractères qui passeraient pour des marques. */
  function echapper(texte) {
    return String(texte).replace(/([\\*])/g, '\\$1').replace(/(==|\+\+|~~)/g, m => '\\' + m);
  }

  /**
   * Entoure un morceau de marques, en laissant les espaces à l'extérieur
   * (« ** gras** » ne serait pas reconnu) et ligne par ligne.
   */
  function entourer(texte, ouvre, ferme) {
    const m = String(texte).match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m[2]) return texte;
    const coeur = m[2].split('\n').map(ligne => {
      const l = ligne.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return l[2] ? l[1] + ouvre + l[2] + ferme + l[3] : ligne;
    }).join('\n');
    return m[1] + coeur + m[3];
  }

  /** Applique une mise en forme décrite par un objet à un morceau déjà échappé. */
  function formater(texte, forme, lien) {
    let sortie = texte;
    forme = Object.assign({}, forme);
    // Un lien a déjà son style : son bleu souligné d'origine ne doit pas le masquer.
    if (lien) { forme.couleur = null; forme.souligne = false; }
    if (forme.gras)     sortie = entourer(sortie, '**', '**');
    if (forme.italique) sortie = entourer(sortie, '*', '*');
    if (forme.souligne) sortie = entourer(sortie, '++', '++');
    if (forme.barre)    sortie = entourer(sortie, '~~', '~~');
    if (forme.surligne) sortie = entourer(sortie, '==', '==');
    if (forme.couleur && !/[[\]]/.test(sortie)) sortie = entourer(sortie, '[', ']{' + forme.couleur + '}');
    if (lien && sortie.trim() && !/[[\]\n]/.test(sortie)) {
      const adresse = lien.replace(/\)/g, '%29').replace(/ /g, '%20');
      sortie = sortie.trim() === lien ? lien : entourer(sortie, '[', '](' + adresse + ')');
    }
    return sortie;
  }

  /* --------------------------------------------------- depuis du HTML --- */

  const BLOCS_HTML = new Set([
    'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE',
    'BLOCKQUOTE', 'HR', 'PRE', 'FIGURE', 'FIGCAPTION', 'SECTION', 'ARTICLE',
    'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'NAV', 'DL', 'DT', 'DD', 'ADDRESS', 'CENTER'
  ]);

  const IGNORES_HTML = 'script,style,head,title,meta,link,noscript,template,svg,iframe,object,button,input,select,textarea';

  /**
   * Convertit du HTML (page web, copie depuis Word, Pages ou Google Docs) en
   * texte mis en forme. Options :
   *   imagesEmbarquees — garder les images « data: » (vrai pour un document
   *                      importé, faux pour un collage dans un champ).
   */
  function depuisHtml(source, options) {
    const reglages = options || {};
    const doc = typeof source === 'string'
      ? new DOMParser().parseFromString(source, 'text/html')
      : source;
    doc.querySelectorAll(IGNORES_HTML).forEach(n => n.remove());
    const racine = doc.body || doc.documentElement;

    const sortie = []; // { texte, groupe }
    let groupeCourant = 0;
    const enAttente = []; // images rencontrées au fil d'un paragraphe

    function ligneImage(img) {
      const src = String(img.getAttribute('src') || '').trim();
      if (!src) return null;
      if (/^data:/i.test(src) && !reglages.imagesEmbarquees) return null;
      if (/^(javascript|vbscript|file|blob):/i.test(src)) return null;
      const legende = (img.getAttribute('alt') || img.getAttribute('title') || '')
        .replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim();
      return '![' + legende + '](' + src.replace(/\)/g, '%29').replace(/ /g, '%20') + ')';
    }

    function styleDe(noeud) {
      const s = noeud.style || {};
      return {
        poids: s.fontWeight || '',
        allure: s.fontStyle || '',
        deco: (s.textDecorationLine || s.textDecoration || ''),
        couleur: s.color || noeud.getAttribute('color') || '',
        fond: s.backgroundColor || s.background || ''
      };
    }

    function enLigneDe(noeud) {
      if (noeud.nodeType === 3) {
        return echapper(noeud.data.replace(/[\s\u00a0]+/g, ' '));
      }
      if (noeud.nodeType !== 1) return '';
      const nom = noeud.tagName;
      if (nom === 'BR') return '\n';
      if (nom === 'IMG') {
        const ligne = ligneImage(noeud);
        if (ligne) enAttente.push(ligne);
        return '';
      }
      const dedans = Array.from(noeud.childNodes).map(enLigneDe).join('');
      if (!dedans.trim()) return dedans;

      if (nom === 'A') {
        const adresse = lienSur(noeud.getAttribute('href'));
        if (!adresse) return dedans;
        const nu = dedans.replace(/\[([^\]]+)\]\{[a-z]+\}/g, '$1').replace(/\+\+/g, '');
        return formater(nu, null, adresse);
      }
      const s = styleDe(noeud);
      const normal = /^(normal|400|lighter|[1-3]00)$/i.test(s.poids);
      const forme = {
        gras: !normal && (/^(B|STRONG)$/.test(nom) || /^(bold|bolder|[6-9]00)$/i.test(s.poids)),
        italique: /^(I|EM|CITE|DFN|VAR)$/.test(nom) || /italic|oblique/i.test(s.allure),
        souligne: /^(U|INS)$/.test(nom) || /underline/i.test(s.deco),
        barre: /^(S|STRIKE|DEL)$/.test(nom) || /line-through/i.test(s.deco),
        surligne: nom === 'MARK' || (!!s.fond && estSurlignage(s.fond)),
        couleur: s.couleur ? couleurProche(s.couleur) : null
      };
      if (/normal/i.test(s.allure) && /^(I|EM)$/.test(nom)) forme.italique = false;
      return formater(dedans, forme, null);
    }

    function nettoyer(texte) {
      return texte.split('\n').map(l => l.replace(/ {2,}/g, ' ').trim()).join('\n')
        .replace(/\n{3,}/g, '\n\n').trim();
    }

    function pousser(texte, groupe) {
      if (texte && texte.trim()) sortie.push({ texte, groupe: groupe || null });
    }

    function viderImages() {
      while (enAttente.length) pousser(enAttente.shift());
    }

    function contientBloc(noeud) {
      return !!noeud.querySelector && !!noeud.querySelector(Array.from(BLOCS_HTML).join(','));
    }

    function conteneur(parent) {
      let tampon = '';
      const vider = () => {
        pousser(nettoyer(tampon));
        tampon = '';
        viderImages();
      };
      for (const noeud of Array.from(parent.childNodes)) {
        if (noeud.nodeType === 3) { tampon += enLigneDe(noeud); continue; }
        if (noeud.nodeType !== 1) continue;
        if (BLOCS_HTML.has(noeud.tagName)) { vider(); bloc(noeud); continue; }
        if (noeud.tagName === 'IMG') { vider(); pousser(ligneImage(noeud)); continue; }
        if (contientBloc(noeud)) { vider(); conteneur(noeud); continue; }
        tampon += enLigneDe(noeud);
      }
      vider();
    }

    function listeHtml(noeud, niveau, groupe) {
      let rang = parseInt(noeud.getAttribute('start') || '1', 10) || 1;
      const ordonnee = noeud.tagName === 'OL';
      for (const li of Array.from(noeud.children)) {
        if (li.tagName !== 'LI') {
          if (li.tagName === 'UL' || li.tagName === 'OL') listeHtml(li, niveau + 1, groupe);
          continue;
        }
        const sous = [];
        let texte = '';
        for (const enfant of Array.from(li.childNodes)) {
          if (enfant.nodeType === 1 && (enfant.tagName === 'UL' || enfant.tagName === 'OL')) sous.push(enfant);
          else texte += enLigneDe(enfant);
        }
        const net = nettoyer(texte).replace(/\n+/g, ' ');
        const puce = ordonnee ? (rang++) + '. ' : '- ';
        if (net) pousser('  '.repeat(niveau) + puce + net, groupe);
        viderImages();
        for (const s of sous) listeHtml(s, niveau + 1, groupe);
      }
    }

    function bloc(noeud) {
      const nom = noeud.tagName;
      if (/^H[1-6]$/.test(nom)) {
        const niveau = Math.min(parseInt(nom[1], 10), 3);
        const texte = nettoyer(enLigneDe(noeud)).replace(/\n+/g, ' ');
        if (texte) pousser('#'.repeat(niveau) + ' ' + texte);
        viderImages();
        return;
      }
      if (nom === 'UL' || nom === 'OL') { listeHtml(noeud, 0, ++groupeCourant); return; }
      if (nom === 'LI') { pousser('- ' + nettoyer(enLigneDe(noeud)).replace(/\n+/g, ' ')); viderImages(); return; }
      if (nom === 'HR') { pousser('---'); return; }
      if (nom === 'PRE') { pousser(echapper(noeud.textContent.replace(/\n+$/, ''))); return; }
      if (nom === 'FIGCAPTION') {
        const texte = nettoyer(enLigneDe(noeud));
        if (texte) pousser(entourer(texte, '*', '*'));
        return;
      }
      if (nom === 'DT') { pousser(entourer(nettoyer(enLigneDe(noeud)), '**', '**')); return; }
      if (nom === 'BLOCKQUOTE') {
        const avant = sortie.length;
        conteneur(noeud);
        const dedans = sortie.splice(avant).map(e => e.texte).join('\n\n');
        pousser(dedans.split('\n').map(l => '> ' + l).join('\n'));
        return;
      }
      if (nom === 'TABLE') { tableHtml(noeud); return; }
      conteneur(noeud);
    }

    function tableHtml(table) {
      const rangees = Array.from(table.querySelectorAll('tr'))
        .filter(tr => tr.closest('table') === table);
      const grille = rangees.map(tr => Array.from(tr.children)
        .filter(c => c.tagName === 'TD' || c.tagName === 'TH')
        .map(c => nettoyer(enLigneDe(c)).replace(/\n+/g, ' ').replace(/\|/g, '\\|')));
      viderImages();
      const largeur = Math.max(0, ...grille.map(r => r.length));
      if (!largeur) return;
      if (largeur === 1) {
        // Tableau de mise en page : ses cases sont de simples paragraphes.
        for (const r of grille) pousser(r[0]);
        return;
      }
      const lignes = grille.map(r => {
        while (r.length < largeur) r.push('');
        return '| ' + r.join(' | ') + ' |';
      });
      lignes.splice(1, 0, '| ' + new Array(largeur).fill('---').join(' | ') + ' |');
      pousser(lignes.join('\n'));
    }

    conteneur(racine);
    return assembler(sortie);
  }

  /** Relie les morceaux : une ligne blanche entre blocs, aucune dans une liste. */
  function assembler(morceaux) {
    let texte = '';
    morceaux.forEach((m, rang) => {
      if (rang) {
        const precedent = morceaux[rang - 1];
        texte += m.groupe && m.groupe === precedent.groupe ? '\n' : '\n\n';
      }
      texte += m.texte;
    });
    return texte;
  }

  return {
    COULEURS, rendre, enLigne, retirer, lienSur, imageSure,
    couleurProche, estSurlignage, echapper, entourer, formater,
    depuisHtml, assembler
  };
})();
