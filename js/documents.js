/*
 * Vox — import de documents.
 *
 * Transforme un document ordinaire en thème, en gardant sa mise en page :
 *   — Word (.docx) : titres, gras, italique, souligné, couleurs, surlignage,
 *     listes, tableaux, liens et images ;
 *   — Markdown (.md) : tel quel, c'est déjà la syntaxe de Vox ;
 *   — page web (.html) : même conversion qu'un copier-coller ;
 *   — texte (.txt).
 *
 * Le résultat est un paquet Vox ordinaire : l'aperçu, le choix du domaine et
 * la pose passent par le même chemin qu'un thème reçu.
 *
 * Les images d'un Markdown ou d'une page web enregistrée sont des fichiers à
 * côté du document : il suffit de les choisir en même temps que lui.
 */
const Documents = (() => {

  const DOCUMENT = /\.(docx|md|markdown|mdown|txt|text|html?)$/i;
  const IMAGE    = /\.(png|jpe?g|gif|webp|avif|heic)$/i;

  const estDocument = fichier => DOCUMENT.test(fichier.name);
  const estImage    = fichier => /^image\//.test(fichier.type) || IMAGE.test(fichier.name);

  /* ------------------------------------------------------------ lecture --- */

  /** Fichiers choisis → paquet Vox prêt à l'aperçu. */
  function lire(fichiers) {
    const liste = Array.from(fichiers || []);
    const principal = liste.find(estDocument);
    if (!principal) {
      return Promise.reject(new Error('Aucun document reconnu. Vox lit les fichiers Word (.docx), Markdown (.md), HTML et texte.'));
    }
    const annexes = new Map();
    for (const f of liste) if (f !== principal && estImage(f)) annexes.set(f.name.toLowerCase(), f);

    const extension = principal.name.split('.').pop().toLowerCase();
    const nom = principal.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();

    let conversion;
    if (extension === 'docx') {
      conversion = depuisWord(principal);
    } else if (/^html?$/.test(extension)) {
      conversion = principal.text().then(html => ({
        texte: MiseEnPage.depuisHtml(html, { imagesEmbarquees: true })
      }));
    } else {
      conversion = principal.text().then(texte => ({ texte }));
    }

    return conversion.then(res => construire(res.texte, res.internes || new Map(), annexes, nom));
  }

  /* --------------------------------------------------- texte → thème --- */

  function blobVersDonnees(blob) {
    return new Promise((resoudre, rejeter) => {
      const lecteur = new FileReader();
      lecteur.onload  = () => resoudre(lecteur.result);
      lecteur.onerror = () => rejeter(lecteur.error);
      lecteur.readAsDataURL(blob);
    });
  }

  const sansMarques = texte => MiseEnPage.retirer(texte).replace(/\s+/g, ' ').trim();

  /**
   * Découpe le texte en blocs : un bloc Texte par grande partie (chaque titre
   * de premier ou deuxième niveau en ouvre un nouveau), un bloc Photo par image.
   */
  async function construire(texte, internes, annexes, nom) {
    const images = {};
    const blocs = [];
    let titre = null;
    let manquantes = 0;
    let illisibles = 0;

    async function poser(blob, legende) {
      try {
        const reduite = await Photos.reduire(blob);
        const reference = 'p' + (Object.keys(images).length + 1);
        images[reference] = await blobVersDonnees(reduite);
        return { type: 'image', reference, legende };
      } catch (e) {
        illisibles++;
        return null;
      }
    }

    async function imageDe(src, legende) {
      if (src.startsWith('vox-img:')) {
        const blob = internes.get(src);
        if (!blob) { illisibles++; return null; }
        return poser(blob, legende);
      }
      if (/^data:image\//i.test(src)) {
        const blob = await fetch(src).then(r => r.blob()).catch(() => null);
        if (!blob) { illisibles++; return null; }
        return poser(blob, legende);
      }
      if (/^https?:\/\//i.test(src)) return { type: 'image', url: src, legende };
      let base = src.split(/[?#]/)[0];
      try { base = decodeURIComponent(base); } catch (e) { /* nom tel quel */ }
      const fichier = annexes.get(base.split('/').pop().toLowerCase());
      if (fichier) return poser(fichier, legende);
      manquantes++;
      return null;
    }

    let tampon = [];
    const vider = () => {
      const net = tampon.join('\n').replace(/^\s*\n/, '').replace(/\s+$/, '');
      if (net.trim()) blocs.push({ type: 'texte', texte: net });
      tampon = [];
    };

    const lignes = String(texte || '').replace(/\r\n?/g, '\n').split('\n');
    for (const ligne of lignes) {
      const net = ligne.trim();

      const image = net.match(/^!\[([^\]]*)\]\(\s*<?([^)>\s]+)>?(?:\s+"[^"]*")?\s*\)$/);
      if (image) {
        vider();
        const bloc = await imageDe(image[2], image[1]);
        if (bloc) blocs.push(bloc);
        continue;
      }

      const entete = net.match(/^(#{1,6})\s+(.*)$/);
      if (entete) {
        const rien = !blocs.length && !tampon.join('').trim();
        if (!titre && entete[1].length === 1 && rien) {
          titre = sansMarques(entete[2]);
          continue;
        }
        if (entete[1].length <= 2) vider();
        tampon.push(entete[1].length > 3 ? '### ' + entete[2] : net);
        continue;
      }

      tampon.push(ligne);
    }
    vider();

    if (!blocs.length) throw new Error('Ce document est vide.');

    // Une courte ligne juste sous le titre (une date, un thème) sert de sous-titre.
    let soustitre = '';
    const premier = blocs[0];
    if (premier.type === 'texte' && !premier.texte.includes('\n')
        && !/^(#|[-*•+>|]|\d+[.)])/.test(premier.texte) && premier.texte.length <= 90) {
      soustitre = sansMarques(premier.texte);
      blocs.shift();
    }

    const avertissements = [];
    if (manquantes) {
      avertissements.push(manquantes + (manquantes > 1 ? ' images introuvables' : ' image introuvable')
        + ' : choisissez les fichiers images en même temps que le document.');
    }
    if (illisibles) {
      avertissements.push(illisibles + (illisibles > 1 ? ' images laissées' : ' image laissée')
        + ' de côté : format que le navigateur ne sait pas afficher (EMF, WMF, TIFF…).');
    }

    const titreFinal = titre || nom || 'Document importé';
    return {
      application: 'vox',
      type: 'partage',
      version: 1,
      titre: titreFinal,
      themes: [{ titre: titreFinal, soustitre, situations: [], blocs }],
      images,
      avertissements
    };
  }

  /* ---------------------------------------------------------------- zip --- */

  function decompresser(octets) {
    if (typeof DecompressionStream === 'undefined') {
      return Promise.reject(new Error('Ce navigateur ne sait pas ouvrir les fichiers Word. Mettez l’appareil à jour, ou enregistrez le document en HTML.'));
    }
    const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(flux).arrayBuffer().then(tampon => new Uint8Array(tampon));
  }

  /** Lecture minimale d'une archive zip : un .docx n'est rien d'autre. */
  function ouvrirZip(octets) {
    const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
    let fin = -1;
    for (let i = octets.length - 22; i >= Math.max(0, octets.length - 65557); i--) {
      if (vue.getUint32(i, true) === 0x06054b50) { fin = i; break; }
    }
    if (fin < 0) throw new Error('Ce fichier Word est illisible.');

    const nombre = vue.getUint16(fin + 10, true);
    let position = vue.getUint32(fin + 16, true);
    const entrees = new Map();
    const decodeur = new TextDecoder();
    for (let k = 0; k < nombre; k++) {
      if (vue.getUint32(position, true) !== 0x02014b50) break;
      const methode = vue.getUint16(position + 10, true);
      const taille  = vue.getUint32(position + 20, true);
      const lNom    = vue.getUint16(position + 28, true);
      const lExtra  = vue.getUint16(position + 30, true);
      const lNote   = vue.getUint16(position + 32, true);
      const locale  = vue.getUint32(position + 42, true);
      const nom = decodeur.decode(octets.subarray(position + 46, position + 46 + lNom));
      entrees.set(nom, { methode, taille, locale });
      position += 46 + lNom + lExtra + lNote;
    }

    return {
      lire(nom) {
        const e = entrees.get(nom);
        if (!e) return Promise.resolve(null);
        const debut = e.locale + 30 + vue.getUint16(e.locale + 26, true) + vue.getUint16(e.locale + 28, true);
        const brut = octets.subarray(debut, debut + e.taille);
        if (e.methode === 0) return Promise.resolve(brut);
        if (e.methode === 8) return decompresser(brut);
        return Promise.resolve(null);
      }
    };
  }

  /* --------------------------------------------------------------- Word --- */

  const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

  const enfant  = (n, nom) => (n ? Array.from(n.childNodes).find(c => c.nodeName === nom) || null : null);
  const enfants = (n, nom) => (n ? Array.from(n.childNodes).filter(c => c.nodeName === nom) : []);
  const val     = n => (n ? n.getAttribute('w:val') : null);
  const actif   = (rPr, nom) => {
    const n = enfant(rPr, nom);
    return !!n && !/^(0|false|off|none)$/i.test(val(n) || '');
  };

  function chemin(cible) {
    if (cible.startsWith('/')) return cible.slice(1);
    const parties = ('word/' + cible).split('/');
    const net = [];
    for (const p of parties) {
      if (p === '..') net.pop();
      else if (p && p !== '.') net.push(p);
    }
    return net.join('/');
  }

  async function depuisWord(fichier) {
    const zip = ouvrirZip(new Uint8Array(await fichier.arrayBuffer()));
    const xml = async nom => {
      const octets = await zip.lire(nom);
      return octets ? new DOMParser().parseFromString(new TextDecoder().decode(octets), 'application/xml') : null;
    };

    const principal = await xml('word/document.xml');
    const corps = principal && principal.getElementsByTagName('w:body')[0];
    if (!corps) throw new Error('Ce fichier Word est illisible.');

    // Liens et images sont rangés à part, désignés par un identifiant.
    const relations = new Map();
    const rels = await xml('word/_rels/document.xml.rels');
    if (rels) {
      for (const r of Array.from(rels.getElementsByTagName('Relationship'))) {
        relations.set(r.getAttribute('Id'), {
          cible: r.getAttribute('Target') || '',
          externe: r.getAttribute('TargetMode') === 'External'
        });
      }
    }

    // Niveau de titre de chaque style (« Heading 2 », « Titre 2 », « Title »…).
    const titres = new Map();
    const styles = await xml('word/styles.xml');
    if (styles) {
      for (const s of Array.from(styles.getElementsByTagName('w:style'))) {
        const id = s.getAttribute('w:styleId');
        const nom = (val(enfant(s, 'w:name')) || '').toLowerCase();
        const plan = enfant(enfant(s, 'w:pPr'), 'w:outlineLvl');
        let niveau = 0;
        const m = nom.match(/(?:heading|titre)\s*(\d)/);
        if (m) niveau = parseInt(m[1], 10);
        else if (nom === 'title' || nom === 'titre') niveau = 1;
        else if (nom === 'subtitle' || nom === 'sous-titre') niveau = 2;
        else if (plan && val(plan) !== null && parseInt(val(plan), 10) < 9) niveau = parseInt(val(plan), 10) + 1;
        if (niveau) titres.set(id, niveau);
      }
    }

    // Format des listes : numérotée ou à puces, par liste et par niveau.
    const formats = new Map();
    const numerotation = await xml('word/numbering.xml');
    if (numerotation) {
      const abstraits = new Map();
      for (const a of Array.from(numerotation.getElementsByTagName('w:abstractNum'))) {
        const niveaux = new Map();
        for (const lvl of enfants(a, 'w:lvl')) {
          niveaux.set(lvl.getAttribute('w:ilvl'), val(enfant(lvl, 'w:numFmt')) || 'bullet');
        }
        abstraits.set(a.getAttribute('w:abstractNumId'), niveaux);
      }
      for (const n of Array.from(numerotation.getElementsByTagName('w:num'))) {
        formats.set(n.getAttribute('w:numId'), abstraits.get(val(enfant(n, 'w:abstractNumId'))) || new Map());
      }
    }

    const internes = new Map();
    let rangImage = 0;

    async function image(rid) {
      const r = relations.get(rid);
      if (!r || r.externe) return null;
      const cle = 'vox-img:' + (++rangImage);
      const nom = chemin(r.cible);
      const type = MIME[nom.split('.').pop().toLowerCase()];
      if (type) {
        const octets = await zip.lire(nom);
        if (octets) internes.set(cle, new Blob([octets], { type }));
      }
      return cle; // sans contenu, la clé sera comptée comme illisible
    }

    /* — contenu d'un paragraphe : morceaux de texte et leur mise en forme — */

    async function morceaux(noeud, lien, sortie, images) {
      for (const n of Array.from(noeud.childNodes)) {
        const nom = n.nodeName;
        if (nom === 'w:r') {
          await course(n, lien, sortie, images);
        } else if (nom === 'w:hyperlink') {
          const r = relations.get(n.getAttribute('r:id'));
          const adresse = r && r.externe ? MiseEnPage.lienSur(r.cible) : null;
          await morceaux(n, adresse || lien, sortie, images);
        } else if (['w:ins', 'w:smartTag', 'w:fldSimple', 'w:customXml', 'w:sdt', 'w:sdtContent'].includes(nom)) {
          await morceaux(n, lien, sortie, images);
        }
      }
    }

    async function course(r, lien, sortie, images) {
      const rPr = enfant(r, 'w:rPr');
      const souligne = enfant(rPr, 'w:u');
      const surligne = enfant(rPr, 'w:highlight');
      const teinte = val(enfant(rPr, 'w:color'));
      const forme = {
        gras: actif(rPr, 'w:b'),
        italique: actif(rPr, 'w:i'),
        souligne: !!souligne && !/^none$/i.test(val(souligne) || ''),
        barre: actif(rPr, 'w:strike') || actif(rPr, 'w:dstrike'),
        surligne: !!surligne && !/^none$/i.test(val(surligne) || ''),
        couleur: teinte && teinte !== 'auto' ? MiseEnPage.couleurProche('#' + teinte) : null
      };
      for (const n of Array.from(r.childNodes)) {
        const nom = n.nodeName;
        if (nom === 'w:t') sortie.push({ texte: n.textContent, forme, lien });
        else if (nom === 'w:tab') sortie.push({ texte: ' ', forme, lien });
        else if ((nom === 'w:br' && n.getAttribute('w:type') !== 'page') || nom === 'w:cr') {
          sortie.push({ texte: '\n', forme, lien });
        } else if (nom === 'w:drawing' || nom === 'w:pict' || nom === 'mc:AlternateContent') {
          // Une image peut figurer deux fois (version récente et version de
          // repli) : on ne garde que la première trouvée.
          const blip = n.getElementsByTagName('a:blip')[0];
          const vml = n.getElementsByTagName('v:imagedata')[0];
          const rid = blip ? blip.getAttribute('r:embed') : vml ? vml.getAttribute('r:id') : null;
          if (rid) images.push(await image(rid));
        }
      }
    }

    const memeForme = (a, b) => a.lien === b.lien
      && ['gras', 'italique', 'souligne', 'barre', 'surligne', 'couleur'].every(k => a.forme[k] === b.forme[k]);

    async function paragraphe(p) {
      const sortie = [];
      const images = [];
      await morceaux(p, null, sortie, images);
      // Word découpe souvent une même mise en forme en plusieurs morceaux.
      const fusion = [];
      for (const m of sortie) {
        const dernier = fusion[fusion.length - 1];
        if (dernier && memeForme(dernier, m)) dernier.texte += m.texte;
        else fusion.push(Object.assign({}, m));
      }
      const texte = fusion
        .map(m => MiseEnPage.formater(MiseEnPage.echapper(m.texte), m.forme, m.lien))
        .join('')
        .split('\n').map(l => l.replace(/\s+$/, '')).join('\n');
      return { texte, images: images.filter(Boolean) };
    }

    /* — parcours du corps — */

    const resultat = []; // { texte, groupe }
    const compteurs = new Map();
    let groupeListe = 0;
    let dansListe = false;

    async function blocParagraphe(p) {
      const pPr = enfant(p, 'w:pPr');
      const style = val(enfant(pPr, 'w:pStyle'));
      const plan = enfant(pPr, 'w:outlineLvl');
      let niveau = titres.get(style) || 0;
      if (!niveau && plan && parseInt(val(plan), 10) < 9) niveau = parseInt(val(plan), 10) + 1;
      const numPr = enfant(pPr, 'w:numPr');
      const { texte, images } = await paragraphe(p);
      const net = texte.trim();

      if (numPr && !niveau && net) {
        const numId = val(enfant(numPr, 'w:numId'));
        const ilvl = parseInt(val(enfant(numPr, 'w:ilvl')) || '0', 10);
        if (numId && numId !== '0') {
          const format = (formats.get(numId) || new Map()).get(String(ilvl)) || 'bullet';
          const ordonnee = !/^(bullet|none)$/.test(format);
          const cle = numId + ':' + ilvl;
          const rang = (compteurs.get(cle) || 0) + 1;
          compteurs.set(cle, rang);
          // Un niveau qui reprend remet à zéro les sous-niveaux.
          for (const k of Array.from(compteurs.keys())) {
            const [id, n] = k.split(':');
            if (id === numId && parseInt(n, 10) > ilvl) compteurs.delete(k);
          }
          if (!dansListe) { groupeListe++; dansListe = true; }
          resultat.push({
            texte: '  '.repeat(ilvl) + (ordonnee ? rang + '. ' : '- ') + net.replace(/\n+/g, ' '),
            groupe: 'liste' + groupeListe
          });
          for (const cle2 of images) resultat.push({ texte: '![](' + cle2 + ')' });
          return;
        }
      }

      dansListe = false;
      if (net) {
        if (niveau) {
          // Un titre entièrement en gras l'est déjà par nature.
          const propre = net.replace(/\n+/g, ' ').replace(/^\*\*([\s\S]*)\*\*$/, '$1');
          resultat.push({ texte: '#'.repeat(Math.min(niveau, 3)) + ' ' + propre });
        } else {
          resultat.push({ texte: net });
        }
      }
      for (const cle of images) resultat.push({ texte: '![](' + cle + ')' });
    }

    async function blocTableau(tbl) {
      dansListe = false;
      const grille = [];
      const images = [];
      for (const tr of enfants(tbl, 'w:tr')) {
        const rangee = [];
        for (const tc of enfants(tr, 'w:tc')) {
          const parties = [];
          for (const p of Array.from(tc.getElementsByTagName('w:p'))) {
            const contenu = await paragraphe(p);
            if (contenu.texte.trim()) parties.push(contenu.texte.trim().replace(/\n+/g, ' '));
            images.push(...contenu.images);
          }
          rangee.push(parties.join(' ').replace(/\|/g, '\\|'));
        }
        grille.push(rangee);
      }
      const largeur = Math.max(0, ...grille.map(r => r.length));
      if (largeur === 1) {
        for (const r of grille) if (r[0]) resultat.push({ texte: r[0] });
      } else if (largeur > 1) {
        const lignes = grille.map(r => {
          while (r.length < largeur) r.push('');
          return '| ' + r.join(' | ') + ' |';
        });
        lignes.splice(1, 0, '| ' + new Array(largeur).fill('---').join(' | ') + ' |');
        resultat.push({ texte: lignes.join('\n') });
      }
      for (const cle of images) resultat.push({ texte: '![](' + cle + ')' });
    }

    async function parcourir(conteneur) {
      for (const n of Array.from(conteneur.childNodes)) {
        if (n.nodeName === 'w:p') await blocParagraphe(n);
        else if (n.nodeName === 'w:tbl') await blocTableau(n);
        else if (n.nodeName === 'w:sdt') {
          const contenu = enfant(n, 'w:sdtContent');
          if (contenu) await parcourir(contenu);
        }
      }
    }

    await parcourir(corps);
    return { texte: MiseEnPage.assembler(resultat), internes };
  }

  return { lire, estDocument };
})();
