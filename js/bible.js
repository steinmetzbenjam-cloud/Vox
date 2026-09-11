/*
 * Vox — module biblique.
 * Reconnaît les références écrites en clair dans un texte et fabrique les
 * liens qui ouvrent JW Library directement au bon verset.
 */
const Bible = (() => {

  const LIVRES = [
    { n:  1, nom: 'Genèse',            abr: ['gen', 'ge', 'gn'] },
    { n:  2, nom: 'Exode',             abr: ['ex', 'exo'] },
    { n:  3, nom: 'Lévitique',         abr: ['lev', 'le', 'lv'] },
    { n:  4, nom: 'Nombres',           abr: ['nomb', 'nb', 'no'] },
    { n:  5, nom: 'Deutéronome',       abr: ['deut', 'dt', 'de'] },
    { n:  6, nom: 'Josué',             abr: ['jos', 'js'] },
    { n:  7, nom: 'Juges',             abr: ['jug', 'jg'] },
    { n:  8, nom: 'Ruth',              abr: ['ru', 'rt'] },
    { n:  9, nom: '1 Samuel',          abr: ['1 sam', '1sam', '1 s', '1s'] },
    { n: 10, nom: '2 Samuel',          abr: ['2 sam', '2sam', '2 s', '2s'] },
    { n: 11, nom: '1 Rois',            abr: ['1 r', '1r', '1 roi'] },
    { n: 12, nom: '2 Rois',            abr: ['2 r', '2r', '2 roi'] },
    { n: 13, nom: '1 Chroniques',      abr: ['1 chron', '1chron', '1 ch', '1ch'] },
    { n: 14, nom: '2 Chroniques',      abr: ['2 chron', '2chron', '2 ch', '2ch'] },
    { n: 15, nom: 'Esdras',            abr: ['esd', 'esr'] },
    { n: 16, nom: 'Néhémie',           abr: ['neh', 'ne'] },
    { n: 17, nom: 'Esther',            abr: ['est', 'esth'] },
    { n: 18, nom: 'Job',               abr: ['jb'] },
    { n: 19, nom: 'Psaumes',           abr: ['psaume', 'ps', 'psa'] },
    { n: 20, nom: 'Proverbes',         abr: ['prov', 'pr', 'prv'] },
    { n: 21, nom: 'Ecclésiaste',       abr: ['eccl', 'ec', 'ecc'] },
    { n: 22, nom: 'Chant de Salomon',  abr: ['cantique des cantiques', 'cantique', 'ct', 'chant'] },
    { n: 23, nom: 'Isaïe',             abr: ['is', 'isa', 'esaie'] },
    { n: 24, nom: 'Jérémie',           abr: ['jer', 'jr'] },
    { n: 25, nom: 'Lamentations',      abr: ['lam', 'lm'] },
    { n: 26, nom: 'Ézéchiel',          abr: ['ezech', 'ez', 'eze'] },
    { n: 27, nom: 'Daniel',            abr: ['dan', 'dn', 'da'] },
    { n: 28, nom: 'Osée',              abr: ['os', 'ose'] },
    { n: 29, nom: 'Joël',              abr: ['joe', 'jl'] },
    { n: 30, nom: 'Amos',              abr: ['am'] },
    { n: 31, nom: 'Abdias',            abr: ['abd', 'ab'] },
    { n: 32, nom: 'Jonas',             abr: ['jon', 'jon'] },
    { n: 33, nom: 'Michée',            abr: ['mich', 'mi', 'mic'] },
    { n: 34, nom: 'Nahoum',            abr: ['nahum', 'nah', 'na'] },
    { n: 35, nom: 'Habacuc',           abr: ['habaquq', 'hab', 'ha'] },
    { n: 36, nom: 'Sophonie',          abr: ['soph', 'sph', 'so'] },
    { n: 37, nom: 'Aggée',             abr: ['ag', 'agg'] },
    { n: 38, nom: 'Zacharie',          abr: ['zach', 'za', 'zac'] },
    { n: 39, nom: 'Malachie',          abr: ['mal', 'ml'] },
    { n: 40, nom: 'Matthieu',          abr: ['matth', 'mat', 'mt'] },
    { n: 41, nom: 'Marc',              abr: ['mc', 'mr'] },
    { n: 42, nom: 'Luc',               abr: ['lc', 'lu'] },
    { n: 43, nom: 'Jean',              abr: ['jn', 'jean'] },
    { n: 44, nom: 'Actes',             abr: ['act', 'ac'] },
    { n: 45, nom: 'Romains',           abr: ['rom', 'rm', 'ro'] },
    { n: 46, nom: '1 Corinthiens',     abr: ['1 cor', '1cor', '1 co', '1co'] },
    { n: 47, nom: '2 Corinthiens',     abr: ['2 cor', '2cor', '2 co', '2co'] },
    { n: 48, nom: 'Galates',           abr: ['gal', 'ga'] },
    { n: 49, nom: 'Éphésiens',         abr: ['eph', 'ep'] },
    { n: 50, nom: 'Philippiens',       abr: ['phil', 'ph', 'php'] },
    { n: 51, nom: 'Colossiens',        abr: ['col', 'cl'] },
    { n: 52, nom: '1 Thessaloniciens', abr: ['1 thess', '1thess', '1 th', '1th'] },
    { n: 53, nom: '2 Thessaloniciens', abr: ['2 thess', '2thess', '2 th', '2th'] },
    { n: 54, nom: '1 Timothée',        abr: ['1 tim', '1tim', '1 tm', '1tm'] },
    { n: 55, nom: '2 Timothée',        abr: ['2 tim', '2tim', '2 tm', '2tm'] },
    { n: 56, nom: 'Tite',              abr: ['tit', 'tt'] },
    { n: 57, nom: 'Philémon',          abr: ['philem', 'phm'] },
    { n: 58, nom: 'Hébreux',           abr: ['heb', 'he', 'hebr'] },
    { n: 59, nom: 'Jacques',           abr: ['jacq', 'jc', 'jq'] },
    { n: 60, nom: '1 Pierre',          abr: ['1 pi', '1pi', '1 p', '1p'] },
    { n: 61, nom: '2 Pierre',          abr: ['2 pi', '2pi', '2 p', '2p'] },
    { n: 62, nom: '1 Jean',            abr: ['1 jn', '1jn', '1 j', '1j'] },
    { n: 63, nom: '2 Jean',            abr: ['2 jn', '2jn', '2 j', '2j'] },
    { n: 64, nom: '3 Jean',            abr: ['3 jn', '3jn', '3 j', '3j'] },
    { n: 65, nom: 'Jude',              abr: ['jud', 'jd'] },
    { n: 66, nom: 'Révélation',        abr: ['apocalypse', 'apoc', 'rev', 're', 'ap'] }
  ];

  const PAR_NUMERO = new Map(LIVRES.map(l => [l.n, l]));

  /*
   * Normalisation qui conserve la longueur de la chaîne : chaque caractère
   * accentué est remplacé par un seul caractère. Indispensable, car on se sert
   * ensuite des index obtenus pour découper le texte d'origine.
   */
  const ACCENTS = {
    'à':'a','á':'a','â':'a','ä':'a','ã':'a','å':'a',
    'è':'e','é':'e','ê':'e','ë':'e',
    'ì':'i','í':'i','î':'i','ï':'i',
    'ò':'o','ó':'o','ô':'o','ö':'o','õ':'o','ø':'o','œ':'o',
    'ù':'u','ú':'u','û':'u','ü':'u',
    'ç':'c','ñ':'n','ÿ':'y','æ':'a'
  };

  function normaliser(texte) {
    let sortie = '';
    const bas = texte.toLowerCase();
    for (const c of bas) sortie += (ACCENTS[c] || c);
    return sortie;
  }

  // Toutes les graphies reconnues, la plus longue d'abord : « 1 corinthiens »
  // doit l'emporter sur « 1 co », sinon on tronquerait la référence.
  const GRAPHIES = (() => {
    const liste = [];
    for (const livre of LIVRES) {
      liste.push({ cle: normaliser(livre.nom), n: livre.n });
      for (const a of livre.abr) liste.push({ cle: normaliser(a), n: livre.n });
    }
    liste.sort((a, b) => b.cle.length - a.cle.length);
    return liste;
  })();

  const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Un point final facultatif (« Matth. »), des espaces souples, et la graphie
  // doit occuper la toute fin du fragment examiné.
  const RE_LIVRE_FIN = new RegExp(
    '(?:^|[^a-z0-9])(' + GRAPHIES.map(g => echapper(g.cle)).join('|') + ')\\s*\\.?\\s*$'
  );

  const NUMERO_PAR_GRAPHIE = new Map(GRAPHIES.map(g => [g.cle, g.n]));

  // « 24:14 », « 24.14 », « 24:14-16 », « 24:14, 15 » …
  const RE_CHAPITRE_VERSET = /(\d{1,3})\s*[:.]\s*(\d{1,3})((?:\s*[-–—]\s*\d{1,3})?(?:\s*,\s*\d{1,3})*)/g;

  const FENETRE_LIVRE = 26; // caractères examinés en amont pour trouver le nom

  /**
   * Repère toutes les références contenues dans `texte`.
   * Renvoie des objets { livre, chapitre, versets[], debut, fin, brut }
   * triés par position, sans chevauchement.
   */
  function reperer(texte) {
    if (!texte) return [];
    const plat = normaliser(texte);
    const trouvees = [];

    RE_CHAPITRE_VERSET.lastIndex = 0;
    let m;
    while ((m = RE_CHAPITRE_VERSET.exec(plat)) !== null) {
      const debutCV = m.index;
      const amont = plat.slice(Math.max(0, debutCV - FENETRE_LIVRE), debutCV);
      const trouve = RE_LIVRE_FIN.exec(amont);
      if (!trouve) continue;

      const graphie = trouve[1];
      const numero = NUMERO_PAR_GRAPHIE.get(graphie);
      if (!numero) continue;

      // Position réelle du nom du livre dans le texte d'origine.
      const debutLivre = Math.max(0, debutCV - FENETRE_LIVRE) + trouve.index +
        (trouve[0].length - trouve[0].replace(/^[^a-z0-9]/, '').length);

      const versets = [parseInt(m[2], 10)];
      const suite = m[3] || '';
      const portee = suite.match(/[-–—]\s*(\d{1,3})/);
      if (portee) versets.push(parseInt(portee[1], 10));
      for (const sup of suite.matchAll(/,\s*(\d{1,3})/g)) versets.push(parseInt(sup[1], 10));

      trouvees.push({
        livre: numero,
        chapitre: parseInt(m[1], 10),
        versets,
        continu: !!portee,
        debut: debutLivre,
        fin: debutCV + m[0].length,
        brut: texte.slice(debutLivre, debutCV + m[0].length)
      });
    }
    return trouvees;
  }

  const deuxChiffres = n => String(n).padStart(3, '0');

  /** Code JW Library d'un verset : livre (2) + chapitre (3) + verset (3). */
  function code(livre, chapitre, verset) {
    return String(livre).padStart(2, '0') + deuxChiffres(chapitre) + deuxChiffres(verset);
  }

  function plage(ref) {
    const premier = Math.min.apply(null, ref.versets);
    const dernier = Math.max.apply(null, ref.versets);
    const debut = code(ref.livre, ref.chapitre, premier);
    if (premier === dernier) return debut;
    return debut + '-' + code(ref.livre, ref.chapitre, dernier);
  }

  /** Lien qui ouvre directement l'application JW Library. */
  function lienApplication(ref) {
    return 'jwlibrary:///finder?bible=' + plage(ref) + '&pub=nwtsty&wtlocale=F';
  }

  /** Lien de repli : jw.org bascule vers l'app si elle est installée. */
  function lienWeb(ref) {
    return 'https://www.jw.org/finder?wtlocale=F&prefer=lang&pub=nwtsty&bible=' + plage(ref);
  }

  /** « Matthieu 24:14-16 » à partir d'une référence structurée. */
  function formater(ref) {
    const livre = PAR_NUMERO.get(ref.livre);
    const nom = livre ? livre.nom : '?';
    const v = ref.versets.slice().sort((a, b) => a - b);
    let suffixe;
    if (v.length === 1) suffixe = String(v[0]);
    else if (ref.continu) suffixe = v[0] + '-' + v[v.length - 1];
    else suffixe = v.join(', ');
    return nom + ' ' + ref.chapitre + ':' + suffixe;
  }

  /** Analyse une saisie libre du type « Mt 24:14 » ; null si rien de valable. */
  function analyser(saisie) {
    const refs = reperer(String(saisie || ''));
    return refs.length ? refs[0] : null;
  }

  function nomLivre(n) {
    const l = PAR_NUMERO.get(n);
    return l ? l.nom : '';
  }

  return { LIVRES, reperer, analyser, formater, lienApplication, lienWeb, nomLivre, normaliser };
})();
