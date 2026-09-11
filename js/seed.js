/*
 * Vox — contenu de départ.
 * Posé une seule fois, au tout premier lancement. Ce sont des canevas :
 * tout est modifiable, supprimable, et l'ordre est libre.
 */
const Seed = (() => {

  const domaines = [
    {
      id: 'dom-predication',
      nom: 'Prédication',
      soustitre: 'Répondre aux questions qu’on rencontre',
      couleur: 'sauge',
      icone: 'porte',
      ordre: 100
    },
    {
      id: 'dom-pastoral',
      nom: 'Pastoral',
      soustitre: 'Encourager, consoler, affermir',
      couleur: 'ambre',
      icone: 'coeur',
      ordre: 200
    }
  ];

  // Raccourcis d'écriture pour que les canevas restent lisibles.
  const q  = texte             => ({ type: 'question',  texte });
  const t  = texte             => ({ type: 'texte',     texte });
  const e  = (reference, idee) => ({ type: 'ecriture',  reference, idee: idee || '' });
  const n  = texte             => ({ type: 'note',      texte });

  const themes = [
    /* ------------------------------------------------------ prédication --- */
    {
      id: 'th-souffrance',
      domaineId: 'dom-predication',
      titre: 'Pourquoi Dieu permet-il la souffrance ?',
      soustitre: 'La question la plus fréquente, et la plus douloureuse',
      situations: ['deuil', 'objection', 'première visite'],
      ordre: 100,
      blocs: [
        q('« Si Dieu existe et qu’il est bon, pourquoi tout ce mal ? »'),
        t('Commencer par reconnaître la douleur derrière la question. Souvent, la personne ne cherche pas un raisonnement : elle cherche à savoir si quelqu’un comprend.'),
        e('Deutéronome 32:4', 'Ce que Dieu fait est parfait — donc le mal ne vient pas de lui'),
        e('Jacques 1:13', 'Il n’éprouve personne par le mal'),
        t('Poser alors la vraie question : d’où vient le mal, si ce n’est pas de lui ? Remonter à la contestation du départ.'),
        e('Genèse 3:1-5', 'La mise en doute du droit de Dieu à diriger'),
        e('1 Jean 5:19', 'Le monde entier est au pouvoir du méchant'),
        n('Ne pas enchaîner trop vite. Laisser un silence après Genèse 3.'),
        t('Terminer sur ce que Dieu a promis de faire — c’est ce que la personne retiendra.'),
        e('Révélation 21:3, 4', 'Plus de deuil, plus de cri, plus de douleur')
      ]
    },
    {
      id: 'th-mort',
      domaineId: 'dom-predication',
      titre: 'Que devient-on à la mort ?',
      soustitre: 'Un état, pas un lieu',
      situations: ['deuil', 'enseignement'],
      ordre: 200,
      blocs: [
        q('« Est-ce que mon père me voit, là où il est ? »'),
        t('Beaucoup ont reçu une réponse qui les a fait souffrir davantage. Montrer ce que la Bible dit réellement soulage.'),
        e('Ecclésiaste 9:5', 'Les morts ne savent rien'),
        e('Psaume 146:4', 'Le jour de sa mort, ses pensées périssent'),
        e('Genèse 3:19', 'Retour à la poussière — pas de survie séparée'),
        t('L’illustration que Jésus lui-même a employée : le sommeil. Elle rassure parce qu’on se réveille d’un sommeil.'),
        e('Jean 11:11-14', 'Lazare « s’est endormi »'),
        e('Jean 5:28, 29', 'Ceux qui sont dans les tombes entendront sa voix'),
        e('Actes 24:15', 'Il y aura une résurrection')
      ]
    },
    {
      id: 'th-royaume',
      domaineId: 'dom-predication',
      titre: 'Qu’est-ce que le Royaume de Dieu ?',
      soustitre: 'Un gouvernement, pas un sentiment',
      situations: ['enseignement', 'première visite'],
      ordre: 300,
      blocs: [
        q('« Le Royaume, c’est dans le cœur, non ? »'),
        e('Daniel 2:44', 'Un royaume qui ne sera jamais détruit'),
        e('Matthieu 6:9, 10', 'On prie pour qu’il vienne — donc il n’est pas déjà en nous'),
        t('Un gouvernement se reconnaît à trois choses : un chef, des sujets, un territoire. Les trois sont indiqués.'),
        e('Isaïe 9:6, 7', 'Le chef : le Prince de paix'),
        e('Psaume 37:10, 11', 'Le territoire : la terre, aux humbles'),
        e('Matthieu 24:14', 'L’annonce de ce Royaume, partout')
      ]
    },
    {
      id: 'th-derniers-jours',
      domaineId: 'dom-predication',
      titre: 'Vivons-nous la fin d’une époque ?',
      soustitre: 'Un signe composé, pas un événement isolé',
      situations: ['actualité', 'objection'],
      ordre: 400,
      blocs: [
        q('« On a toujours dit que c’était la fin. »'),
        t('Objection juste. Répondre non par l’intensité des événements, mais par leur simultanéité — c’est ce que Jésus a annoncé.'),
        e('Matthieu 24:3, 7, 8', 'La demande des disciples et le signe donné'),
        e('Luc 21:10, 11', 'Les mêmes faits, rassemblés'),
        e('2 Timothée 3:1-5', 'Ce qui change, ce sont surtout les gens'),
        n('Lire 2 Timothée 3 lentement, et demander : « Est-ce que vous reconnaissez ce que vous voyez autour de vous ? »')
      ]
    },
    {
      id: 'th-famille',
      domaineId: 'dom-predication',
      titre: 'Comment avoir une famille heureuse ?',
      soustitre: 'Un terrain où la Bible est très concrète',
      situations: ['jeunes couples', 'première visite'],
      ordre: 500,
      blocs: [
        q('« La Bible n’a rien à dire sur la vie d’aujourd’hui. »'),
        e('Éphésiens 5:33', 'L’amour d’un côté, le profond respect de l’autre'),
        e('Colossiens 3:13', 'Se supporter et se pardonner — la clé du quotidien'),
        e('Éphésiens 6:4', 'Ne pas exaspérer ses enfants'),
        e('Deutéronome 6:6, 7', 'Parler de ces choses au fil de la journée')
      ]
    },

    /* --------------------------------------------------------- pastoral --- */
    {
      id: 'th-decouragement',
      domaineId: 'dom-pastoral',
      titre: 'Quelqu’un de découragé',
      soustitre: 'Quand on ne se sent plus utile à rien',
      situations: ['visite', 'découragement'],
      ordre: 100,
      blocs: [
        t('Écouter longtemps avant de lire quoi que ce soit. Le premier réconfort, c’est d’être cru.'),
        e('Psaume 34:18', 'Il est près de ceux qui ont le cœur brisé'),
        e('Psaume 94:19', 'Ses consolations apaisent quand les inquiétudes se multiplient'),
        e('1 Pierre 5:7', 'Il se soucie de vous — personnellement'),
        e('Isaïe 41:10', 'Je te tiens fermement'),
        n('Éviter « il ne faut pas ». Préférer « ce que je vois chez vous, c’est… ».'),
        e('Psaume 55:22', 'Jette ton fardeau sur lui — il te soutiendra')
      ]
    },
    {
      id: 'th-deuil',
      domaineId: 'dom-pastoral',
      titre: 'Accompagner un deuil',
      soustitre: 'Les premiers jours, puis les mois d’après',
      situations: ['deuil', 'visite'],
      ordre: 200,
      blocs: [
        t('Ne pas chercher à expliquer. Être présent, nommer la personne disparue, revenir plus tard.'),
        e('Jean 11:35', 'Jésus a pleuré — alors qu’il allait ressusciter Lazare'),
        e('Psaume 147:3', 'Il guérit ceux qui ont le cœur brisé'),
        t('Quand la personne est prête — pas avant — l’espérance.'),
        e('Jean 5:28, 29', 'Ils entendront sa voix'),
        e('Révélation 21:4', 'La mort ne sera plus'),
        n('Noter la date. Repasser autour du premier anniversaire : c’est souvent là que la solitude revient.')
      ]
    },
    {
      id: 'th-eloigne',
      domaineId: 'dom-pastoral',
      titre: 'Quelqu’un qui s’est éloigné',
      soustitre: 'Reprendre contact sans peser',
      situations: ['visite', 'réconfort'],
      ordre: 300,
      blocs: [
        t('Souvent la personne ne s’est pas éloignée par désaccord, mais par honte ou par fatigue. Partir de là.'),
        e('Luc 15:4-7', 'On va chercher la brebis — elle ne revient pas seule'),
        e('Psaume 103:13, 14', 'Il se souvient que nous sommes poussière'),
        e('Jérémie 31:3', 'Je t’ai aimé d’un amour éternel'),
        n('Premier contact : court, chaleureux, sans rendez-vous à fixer.')
      ]
    },
    {
      id: 'th-malade',
      domaineId: 'dom-pastoral',
      titre: 'Visiter un malade',
      soustitre: 'Court, régulier, sans pitié affichée',
      situations: ['maladie', 'visite'],
      ordre: 400,
      blocs: [
        t('Visites brèves et prévues. Parler d’autre chose que de la maladie une partie du temps.'),
        e('Psaume 41:3', 'Jéhovah le soutiendra sur son lit de maladie'),
        e('Isaïe 33:24', 'Aucun habitant ne dira : « Je suis malade »'),
        e('Révélation 21:4', 'Ni douleur ni cri')
      ]
    },
    {
      id: 'th-jeune',
      domaineId: 'dom-pastoral',
      titre: 'Affermir un jeune',
      soustitre: 'Le prendre au sérieux',
      situations: ['jeunes', 'encouragement'],
      ordre: 500,
      blocs: [
        t('Poser des questions et attendre la réponse. Un jeune qui se sent consulté écoute autrement.'),
        e('Ecclésiaste 12:1', 'Pendant la jeunesse — le meilleur moment'),
        e('1 Timothée 4:12', 'Que personne ne méprise ta jeunesse'),
        e('Proverbes 27:11', 'Sois sage et réjouis mon cœur')
      ]
    }
  ];

  /** Pose le contenu de départ si la base est encore vide. */
  function installer() {
    return Store.domaines.tous().then(existants => {
      if (existants.length) return false;
      const horodate = Store.maintenant();
      const poseDomaines = domaines.map(d =>
        Store.domaines.enregistrer(Object.assign({ creeLe: horodate }, d)));
      const poseThemes = themes.map(th =>
        Store.themes.enregistrer(Object.assign({}, th, {
          creeLe: horodate,
          favori: false,
          consulteLe: null,
          blocs: th.blocs.map(b => Object.assign({ id: Store.identifiant() }, b))
        })));
      return Promise.all(poseDomaines.concat(poseThemes)).then(() => true);
    });
  }

  return { installer };
})();
