/*
 * Vox — les écrans.
 * Accueil → domaine → thème (lecture plein écran) → éditeur.
 */
const Vues = (() => {

  const el = UI.el;
  const icone = UI.icone;

  const JOUR = 24 * 60 * 60 * 1000;

  /* =====================================================================
   *  Fragments partagés
   * ===================================================================== */

  function entete(options) {
    const gauche = el('div.entete__cote');
    if (options.retour) {
      gauche.appendChild(el('button.rond', {
        type: 'button', 'aria-label': 'Retour', onclick: options.retour
      }, [icone('retour')]));
    }
    const droite = el('div.entete__cote.entete__cote--fin', null, options.actions || []);
    return el('header.entete' + (options.collante ? '.entete--collante' : ''), null, [
      gauche,
      el('div.entete__titre', { texte: options.titre || '' }),
      droite
    ]);
  }

  function boutonAction(nom, libelle, action, actif) {
    return el('button.rond' + (actif ? '.rond--actif' : ''), {
      type: 'button', 'aria-label': libelle, title: libelle, onclick: action
    }, [icone(nom)]);
  }

  /** Lien vers JW Library (ou jw.org selon le réglage). */
  function lienReference(ref, variante) {
    const cible = Etat.cible === 'web' ? Bible.lienWeb(ref) : Bible.lienApplication(ref);
    return el('a.ref' + (variante ? '.ref--' + variante : ''), {
      href: cible,
      texte: Bible.formater(ref),
      rel: 'noopener'
    });
  }

  /**
   * N'accepte qu'une adresse sûre. Les paquets viennent parfois de tiers :
   * un « javascript: » glissé dans un bloc ne doit jamais devenir cliquable.
   */
  const lienSur = MiseEnPage.lienSur;

  /** Découpe un texte libre et transforme les références rencontrées en liens. */
  function semerLiens(parent, texte) {
    const refs = Bible.reperer(texte);
    let curseur = 0;
    for (const ref of refs) {
      if (ref.debut < curseur) continue;
      if (ref.debut > curseur) {
        parent.appendChild(document.createTextNode(texte.slice(curseur, ref.debut)));
      }
      parent.appendChild(lienReference(ref, 'ligne'));
      curseur = ref.fin;
    }
    if (curseur < texte.length) {
      parent.appendChild(document.createTextNode(texte.slice(curseur)));
    }
  }

  /** Texte mis en page (titres, gras, listes…), références bibliques cliquables. */
  function texteEnrichi(texte, classeParagraphe) {
    return MiseEnPage.rendre(texte, {
      classe: classeParagraphe || 'para',
      semer: semerLiens,
      agrandir: (src, legende) => agrandirPhoto({ url: src, legende })
    });
  }

  function vide(message, action) {
    return el('div.vide', null, [
      el('p.vide__texte', { texte: message }),
      action || null
    ]);
  }

  /* — reprendre là où l'on en est, entre la lecture et l'éditeur — */

  const HAUT_UTILE = 76; // sous l'en-tête

  /** Le bloc en haut de l'écran, ou null si l'on est encore sur le titre. */
  function blocEnVue(conteneur, leTheme) {
    if (window.scrollY < 40) return null;
    for (const noeud of conteneur.querySelectorAll('[data-rang]')) {
      if (noeud.getBoundingClientRect().bottom > HAUT_UTILE) {
        const rang = Number(noeud.dataset.rang);
        const bloc = (leTheme.blocs || [])[rang];
        return { theme: leTheme.id, rang, id: bloc && bloc.id };
      }
    }
    return null;
  }

  /** Le rang visé pour ce thème, s'il y en a un ; consommé une seule fois. */
  function rangVise(leTheme) {
    const vise = Etat.blocVise;
    Etat.blocVise = null;
    if (!vise || vise.theme !== leTheme.id) return null;
    const blocs = leTheme.blocs || [];
    const parId = vise.id ? blocs.findIndex(b => b.id === vise.id) : -1;
    if (parId >= 0) return parId;
    return vise.rang < blocs.length ? vise.rang : null;
  }

  function ramenerA(noeud) {
    if (!noeud) return;
    const haut = noeud.getBoundingClientRect().top + window.scrollY - HAUT_UTILE;
    window.scrollTo(0, Math.max(0, haut));
  }

  /* =====================================================================
   *  Accueil — les domaines
   * ===================================================================== */

  function accueil(conteneur) {
    return Promise.all([
      Store.domaines.tous(),
      Store.themes.tous(),
      Store.etatSauvegarde(),
      Store.reglages.obtenir('rappelReporteLe', null)
    ]).then(([domaines, themes, sauvegarde, reporte]) => {
      const parDomaine = new Map();
      for (const t of themes) {
        parDomaine.set(t.domaineId, (parDomaine.get(t.domaineId) || 0) + 1);
      }

      conteneur.appendChild(el('header.accueil__entete', null, [
        el('div', null, [
          el('h1.marque', { texte: 'Vox' }),
          el('p.marque__note', { texte: 'Vos préparations, à portée de main' })
        ]),
        el('div.entete__cote.entete__cote--fin', null, [
          boutonAction('loupe', 'Rechercher', () => { location.hash = '#/recherche'; }),
          boutonAction('reglages', 'Réglages', () => { location.hash = '#/reglages'; })
        ])
      ]));

      // Rappel discret : seulement s'il y a vraiment quelque chose à perdre,
      // et jamais pendant la semaine qui suit un « Plus tard ».
      const enSommeil = reporte && (Date.now() - Date.parse(reporte)) < 7 * JOUR;
      if (sauvegarde.enRetard && !enSommeil) {
        const rappel = el('div.rappel', null, [
          el('div.rappel__texte', null, [
            el('strong', { texte: sauvegarde.derniere ? 'À sauvegarder' : 'Rien n’est sauvegardé' }),
            el('span', {
              texte: sauvegarde.enRetard + (sauvegarde.enRetard > 1 ? ' thèmes n’existent' : ' thème n’existe')
                + ' que sur cet appareil.'
            })
          ]),
          el('div.rappel__actions', null, [
            el('button.bouton.bouton--plein', {
              type: 'button', texte: 'Sauvegarder',
              onclick: () => { location.hash = '#/reglages'; }
            }),
            el('button.bouton.bouton--discret', {
              type: 'button', texte: 'Plus tard',
              onclick: () => Store.reglages.definir('rappelReporteLe', Store.maintenant())
                .then(() => rappel.remove())
            })
          ])
        ]);
        conteneur.appendChild(rappel);
      }

      const recents = themes
        .filter(t => t.consulteLe)
        .sort((a, b) => b.consulteLe.localeCompare(a.consulteLe))
        .slice(0, 3);

      if (recents.length) {
        conteneur.appendChild(el('h2.section', { texte: 'Reprendre' }));
        const bande = el('div.bande');
        for (const t of recents) {
          bande.appendChild(el('button.puce', {
            type: 'button', onclick: () => { location.hash = '#/t/' + t.id; }
          }, [
            el('span.puce__titre', { texte: t.titre }),
            el('span.puce__note', { texte: UI.dateCourte(t.consulteLe) })
          ]));
        }
        conteneur.appendChild(bande);
      }

      conteneur.appendChild(el('h2.section', { texte: 'Domaines' }));

      if (!domaines.length) {
        conteneur.appendChild(vide('Aucun domaine pour l’instant.'));
      }

      const grille = el('div.grille');
      for (const d of domaines) {
        const nombre = parDomaine.get(d.id) || 0;
        grille.appendChild(el('button.domaine.domaine--' + d.couleur, {
          type: 'button', onclick: () => { location.hash = '#/d/' + d.id; }
        }, [
          el('span.domaine__icone', null, [icone(d.icone)]),
          el('span.domaine__nom', { texte: d.nom }),
          d.soustitre ? el('span.domaine__note', { texte: d.soustitre }) : null,
          el('span.domaine__compte', {
            texte: nombre + (nombre > 1 ? ' thèmes' : ' thème')
          })
        ]));
      }

      grille.appendChild(el('button.domaine.domaine--ajout', {
        type: 'button', onclick: () => nouveauDomaine()
      }, [
        el('span.domaine__icone', null, [icone('plus')]),
        el('span.domaine__nom', { texte: 'Nouveau domaine' }),
        el('span.domaine__note', { texte: 'Enseignement, réunions, études…' })
      ]));

      conteneur.appendChild(grille);
    });
  }

  function nouveauDomaine() {
    return UI.demander('Nouveau domaine', '', {
      repere: 'Enseignement, Réunions…',
      aide: 'Un domaine regroupe des thèmes : par exemple « Prédication » ou « Pastoral ».'
    }).then(nom => {
      if (!nom) return;
      const rang = Math.floor(Math.random() * UI.COULEURS.length);
      return Store.domaines.enregistrer({
        nom,
        couleur: UI.COULEURS[rang],
        icone: 'livre',
        ordre: Date.now()
      }).then(d => { location.hash = '#/d/' + d.id; });
    });
  }

  /* =====================================================================
   *  Domaine — la liste des thèmes
   * ===================================================================== */

  function domaine(conteneur, id) {
    return Promise.all([Store.domaines.obtenir(id), Store.themes.parDomaine(id)])
      .then(([leDomaine, themes]) => {
        if (!leDomaine) {
          conteneur.appendChild(vide('Ce domaine n’existe plus.'));
          return;
        }

        conteneur.appendChild(entete({
          retour: () => { location.hash = '#/'; },
          titre: leDomaine.nom,
          actions: [
            boutonAction('crayon', 'Modifier le domaine', () => modifierDomaine(leDomaine))
          ]
        }));

        if (leDomaine.soustitre) {
          conteneur.appendChild(el('p.chapeau', { texte: leDomaine.soustitre }));
        }

        // Filtre par situation : « deuil », « objection », « visite »…
        const situations = [...new Set(themes.flatMap(t => t.situations || []))].sort();
        let filtre = null;
        const liste = el('div.liste');

        function dessinerListe() {
          liste.innerHTML = '';
          const visibles = filtre
            ? themes.filter(t => (t.situations || []).includes(filtre))
            : themes;

          if (!visibles.length) {
            liste.appendChild(vide(filtre
              ? 'Aucun thème pour cette situation.'
              : 'Aucun thème ici pour le moment.'));
            return;
          }

          const ordonnes = visibles.slice().sort((a, b) => {
            if (!!b.favori !== !!a.favori) return b.favori ? 1 : -1;
            return a.ordre - b.ordre;
          });

          for (const t of ordonnes) {
            const fiche = el('div.fiche', null, [
              el('button.fiche__corps', {
                type: 'button', onclick: () => { location.hash = '#/t/' + t.id; }
              }, [
                el('span.fiche__titre', { texte: t.titre }),
                t.soustitre ? el('span.fiche__note', { texte: t.soustitre }) : null,
                el('span.fiche__meta', { texte: UI.resumeBlocs(t.blocs) })
              ]),
              el('button.rond.rond--fiche' + (t.favori ? '.rond--etoile' : ''), {
                type: 'button',
                'aria-label': t.favori ? 'Retirer des favoris' : 'Mettre en favori',
                onclick: () => {
                  t.favori = !t.favori;
                  Store.themes.enregistrer(t).then(dessinerListe);
                }
              }, [icone('etoile')])
            ]);
            liste.appendChild(glissiere(fiche, () => supprimerTheme(t)));
          }
        }

        function supprimerTheme(t) {
          return UI.confirmer(
            'Supprimer « ' + t.titre + ' » ?',
            'La préparation, ses photos et ses documents seront perdus.'
          ).then(oui => {
            if (!oui) return false;
            return Store.themes.supprimer(t.id).then(() => {
              themes.splice(themes.indexOf(t), 1);
              dessinerListe();
              UI.annoncer('Thème supprimé');
              return true;
            });
          });
        }

        if (situations.length) {
          const barre = el('div.filtres');
          const poser = (libelle, valeur) => {
            const bouton = el('button.filtre', {
              type: 'button',
              texte: libelle,
              onclick: () => {
                filtre = valeur;
                barre.querySelectorAll('.filtre').forEach(b => b.classList.remove('filtre--actif'));
                bouton.classList.add('filtre--actif');
                dessinerListe();
              }
            });
            if (valeur === filtre) bouton.classList.add('filtre--actif');
            barre.appendChild(bouton);
          };
          poser('Tout', null);
          situations.forEach(s => poser(s, s));
          conteneur.appendChild(barre);
        }

        dessinerListe();
        conteneur.appendChild(liste);

        conteneur.appendChild(el('button.bouton.bouton--plein.bouton--large', {
          type: 'button',
          onclick: () => Store.themes.enregistrer({
            domaineId: id,
            titre: 'Nouveau thème',
            ordre: Date.now(),
            blocs: [],
            sien: true
          }).then(t => { location.hash = '#/t/' + t.id + '/modifier'; })
        }, [icone('plus'), 'Nouveau thème']));

        conteneur.appendChild(el('button.bouton.bouton--discret.bouton--large', {
          type: 'button',
          onclick: () => { location.hash = '#/importer/' + id; }
        }, [icone('televerser'), 'Importer un thème']));
      });
  }

  /**
   * Une fiche qu'on fait glisser vers la gauche pour découvrir « Supprimer ».
   * Le défilement vertical reste libre : le geste n'est pris qu'une fois
   * clairement horizontal. Glisser jusqu'au bout supprime aussitôt (après
   * confirmation).
   */
  const LARGEUR_ACTION = 92;
  let glissiereOuverte = null;

  function glissiere(fiche, supprimer) {
    const bouton = el('button.glissiere__action', {
      type: 'button', tabindex: -1, 'aria-hidden': 'true',
      onclick: () => { fermer(); supprimer(); }
    }, [icone('poubelle'), el('span', { texte: 'Supprimer' })]);
    const cadre = el('div.glissiere', null, [bouton, fiche]);

    let decalage = 0;
    let depart = null; // { x, y, decalage, sens }
    let avaleClic = false;
    let masquage = null;

    function poser(valeur, anime) {
      decalage = valeur;
      fiche.classList.toggle('fiche--anime', !!anime);
      fiche.style.transform = valeur ? 'translateX(' + valeur + 'px)' : '';
      const ouverte = valeur < 0;
      // Le rouge n'existe que pendant le geste : au repos, rien ne dépasse des coins.
      clearTimeout(masquage);
      if (ouverte) cadre.classList.add('glissiere--active');
      else masquage = setTimeout(() => cadre.classList.remove('glissiere--active'), anime ? 240 : 0);
      bouton.tabIndex = ouverte ? 0 : -1;
      bouton.setAttribute('aria-hidden', ouverte ? 'false' : 'true');
    }

    function ouvrir() {
      if (glissiereOuverte && glissiereOuverte !== fermer) glissiereOuverte();
      glissiereOuverte = fermer;
      poser(-LARGEUR_ACTION, true);
    }

    function fermer() {
      if (glissiereOuverte === fermer) glissiereOuverte = null;
      poser(0, true);
    }

    fiche.addEventListener('pointerdown', ev => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      // Sur iOS, un glissement n'est suivi d'aucun clic : on repart de zéro.
      avaleClic = false;
      if (glissiereOuverte && glissiereOuverte !== fermer) glissiereOuverte();
      depart = { x: ev.clientX, y: ev.clientY, decalage, sens: null, id: ev.pointerId };
    });

    fiche.addEventListener('pointermove', ev => {
      if (!depart || ev.pointerId !== depart.id) return;
      const dx = ev.clientX - depart.x;
      const dy = ev.clientY - depart.y;
      if (!depart.sens) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        depart.sens = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        if (depart.sens === 'horizontal') fiche.setPointerCapture(ev.pointerId);
      }
      if (depart.sens !== 'horizontal') return;
      const largeur = fiche.offsetWidth;
      poser(Math.max(-largeur, Math.min(0, depart.decalage + dx)), false);
    });

    function lacher(ev) {
      if (!depart || ev.pointerId !== depart.id) return;
      const glisse = depart.sens === 'horizontal';
      depart = null;
      if (!glisse) return;
      avaleClic = true; // le geste ne doit pas ouvrir le thème
      if (decalage < -fiche.offsetWidth * 0.6) {
        poser(-fiche.offsetWidth, true);
        Promise.resolve(supprimer()).then(fait => { if (!fait) fermer(); });
      } else if (decalage < -LARGEUR_ACTION / 2) {
        ouvrir();
      } else {
        fermer();
      }
    }
    fiche.addEventListener('pointerup', lacher);
    fiche.addEventListener('pointercancel', lacher);

    // Un toucher sur une fiche ouverte la referme au lieu d'ouvrir le thème.
    fiche.addEventListener('click', ev => {
      if (avaleClic || decalage < 0) {
        ev.stopPropagation();
        ev.preventDefault();
        if (!avaleClic) fermer();
      }
      avaleClic = false;
    }, true);

    return cadre;
  }

  /* =====================================================================
   *  Partage et import
   * ===================================================================== */

  /** Feuille de partage : fichier complet, ou lien si la taille le permet. */
  function partagerThemes(themes) {
    const nomFichier = (themes.length === 1
      ? themes[0].titre.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40)
      : 'themes') + '.vox.json';

    const photos = Partage.comptePhotos(themes);
    const documents = Partage.compteDocuments(themes);
    const joints = [
      photos ? photos + (photos > 1 ? ' photos' : ' photo') : '',
      documents ? documents + (documents > 1 ? ' documents' : ' document') : ''
    ].filter(Boolean).join(' et ');

    function envoyerFichier() {
      Partage.fabriquer(themes, { avecPhotos: true }).then(paquet => {
        const contenu = JSON.stringify(paquet, null, 2);
        const fichier = new File([contenu], nomFichier, { type: 'application/json' });
        // Sur téléphone, la feuille de partage native (AirDrop, messages, mail)
        // est de loin le chemin le plus court ; ailleurs, un téléchargement.
        if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
          navigator.share({ files: [fichier], title: paquet.titre })
            .catch(() => {});
          UI.fermerModale();
          return;
        }
        const lien = el('a', {
          href: URL.createObjectURL(new Blob([contenu], { type: 'application/json' })),
          download: nomFichier
        });
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
        setTimeout(() => URL.revokeObjectURL(lien.href), 4000);
        UI.fermerModale();
        UI.annoncer('Fichier enregistré');
      });
    }

    function copierLien() {
      Partage.fabriquer(themes, { avecPhotos: false })
        .then(Partage.encoder)
        .then(code => {
          const adresse = Partage.lienPour(code);
          if (adresse.length > 8000) {
            UI.annoncer('Trop long pour un lien — envoyez le fichier', 'erreur');
            return;
          }
          const copie = navigator.clipboard && navigator.clipboard.writeText
            ? navigator.clipboard.writeText(adresse)
            : Promise.reject();
          copie.then(() => {
            UI.fermerModale();
            UI.annoncer('Lien copié');
          }).catch(() => {
            // Presse-papiers refusé : on montre le lien pour une copie à la main.
            UI.fermerModale();
            const champ = el('textarea.champ.champ--zone', { rows: 4, readonly: true });
            champ.value = adresse;
            UI.ouvrirModale([
              el('h2.modale__titre', { texte: 'Lien à envoyer' }),
              el('p.modale__texte', { texte: 'Copiez ce lien et envoyez-le.' }),
              champ,
              el('div.modale__actions', null, [
                el('button.bouton.bouton--plein', { type: 'button', texte: 'Fermer', onclick: UI.fermerModale })
              ])
            ]);
            champ.select();
          });
        })
        .catch(() => UI.annoncer('Lien impossible à fabriquer', 'erreur'));
    }

    UI.ouvrirModale([
      el('h2.modale__titre', { texte: themes.length === 1 ? 'Partager ce thème' : 'Partager ces thèmes' }),
      el('p.modale__texte', {
        texte: 'La personne doit avoir Vox. L\u2019import s\u2019ajoute chez elle sans rien remplacer.'
      }),
      el('button.bouton.bouton--plein.bouton--large', { type: 'button', onclick: envoyerFichier },
         [icone('envoyer'), 'Envoyer le fichier']),
      el('p.aide', {
        texte: joints
          ? 'Le fichier contient tout, y compris ' + joints + '.'
          : 'Le fichier contient tout le thème.'
      }),
      el('button.bouton.bouton--discret.bouton--large', { type: 'button', onclick: copierLien },
         [icone('lien'), 'Copier un lien']),
      el('p.aide', {
        texte: joints
          ? 'Le lien s\u2019ouvre d\u2019une seule touche, mais laisse de côté ' + joints + '.'
          : 'Le lien s\u2019ouvre d\u2019une seule touche, dans un message ou un mail.'
      })
    ]);
  }

  /**
   * Écran d'import. `code` vient d'un lien reçu ; sinon on propose le fichier
   * ou le collage manuel.
   */
  function importer(conteneur, domaineVise, code) {
    conteneur.appendChild(entete({
      retour: () => { location.hash = domaineVise ? '#/d/' + domaineVise : '#/'; },
      titre: 'Importer un thème'
    }));

    const zone = el('div.liste');
    conteneur.appendChild(zone);

    return Store.domaines.tous().then(domaines => {

      /* Aperçu du paquet, puis choix du domaine d'accueil. */
      function proposer(paquet) {
        zone.innerHTML = '';
        zone.appendChild(el('div.fiche', null, [
          el('div.fiche__corps', null, [
            el('span.fiche__titre', { texte: paquet.titre || 'Thème reçu' }),
            el('span.fiche__meta', { texte: Partage.resumer(paquet) })
          ])
        ]));

        // Ce qu'un document importé n'a pas pu garder, dit franchement.
        for (const avertissement of (paquet.avertissements || [])) {
          zone.appendChild(el('p.aide.aide--alerte', { texte: avertissement }));
        }

        // Pour un thème unique, la carte ci-dessus le nomme déjà.
        if (paquet.themes.length > 1) {
          zone.appendChild(el('ul.apercu', null, paquet.themes.map(t =>
            el('li.apercu__ligne', { texte: t.titre }))));
        }

        if (!domaines.length) {
          zone.appendChild(vide('Créez d\u2019abord un domaine pour y ranger ce thème.'));
          return;
        }

        zone.appendChild(el('h2.section', { texte: 'Ranger dans' }));
        let choisi = domaineVise && domaines.some(d => d.id === domaineVise)
          ? domaineVise : domaines[0].id;

        const choix = el('div.filtres');
        for (const d of domaines) {
          const bouton = el('button.filtre' + (d.id === choisi ? '.filtre--actif' : ''), {
            type: 'button', texte: d.nom,
            onclick: () => {
              choisi = d.id;
              choix.querySelectorAll('.filtre').forEach(b => b.classList.remove('filtre--actif'));
              bouton.classList.add('filtre--actif');
            }
          });
          choix.appendChild(bouton);
        }
        zone.appendChild(choix);

        zone.appendChild(el('button.bouton.bouton--plein.bouton--large', {
          type: 'button',
          onclick: () => Partage.installer(paquet, choisi).then(poses => {
            UI.annoncer(poses.length > 1 ? poses.length + ' thèmes importés' : 'Thème importé');
            location.hash = poses.length === 1 ? '#/t/' + poses[0].id : '#/d/' + choisi;
          }).catch(() => UI.annoncer('Import impossible', 'erreur'))
        }, [icone('check'), paquet.themes.length > 1 ? 'Tout importer' : 'Importer']));
      }

      function echouer(erreur) {
        zone.innerHTML = '';
        zone.appendChild(vide(erreur.message || 'Import impossible.'));
        offrirSources();
      }

      function offrirSources() {
        const choixFichier = el('input', {
          type: 'file',
          multiple: true,
          accept: 'application/json,.json,.docx,.md,.markdown,.txt,.html,.htm,text/*,image/*,'
            + 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          hidden: true
        });
        choixFichier.addEventListener('change', () => {
          const fichiers = Array.from(choixFichier.files || []);
          if (!fichiers.length) return;
          // Un paquet Vox passe en priorité ; sinon, un document à convertir.
          const paquet = fichiers.find(f => /\.json$/i.test(f.name) || f.type === 'application/json');
          const lecture = paquet ? Partage.lireFichier(paquet) : Documents.lire(fichiers);
          zone.innerHTML = '';
          zone.appendChild(vide('Lecture du document…'));
          lecture.then(proposer).catch(echouer)
            .then(() => { choixFichier.value = ''; });
        });
        zone.appendChild(choixFichier);

        zone.appendChild(el('button.bouton.bouton--plein.bouton--large', {
          type: 'button', onclick: () => choixFichier.click()
        }, [icone('televerser'), 'Choisir un fichier']));

        zone.appendChild(el('button.bouton.bouton--discret.bouton--large', {
          type: 'button',
          onclick: () => UI.demander('Coller un lien ou un code', '', {
            multiligne: true,
            repere: 'https://…/#/i/VOXZ…',
            aide: 'Collez ici le lien reçu, ou le code seul.'
          }).then(saisie => {
            if (!saisie) return;
            const trouve = saisie.match(/(VOX[ZP][A-Za-z0-9\-_]+)/);
            if (!trouve) {
              UI.annoncer('Aucun code Vox là-dedans', 'erreur');
              return;
            }
            Partage.decoder(trouve[1]).then(proposer).catch(echouer);
          })
        }, [icone('lien'), 'Coller un lien']));

        zone.appendChild(el('p.aide', {
          texte: 'Vox lit les thèmes Vox (.json) et les documents : Word (.docx), Markdown (.md), '
            + 'page web (.html) ou texte. Titres, gras, couleurs, listes, tableaux, liens et images '
            + 'sont conservés. Pour un Markdown ou une page web, choisissez ses images en même temps.'
        }));
        zone.appendChild(el('p.aide', {
          texte: 'Un thème importé s\u2019ajoute : rien de ce que vous avez déjà n\u2019est remplacé.'
        }));
      }

      if (code) {
        return Partage.decoder(code).then(proposer).catch(echouer);
      }
      offrirSources();
    });
  }

  function modifierDomaine(leDomaine) {
    const champNom = el('input.champ', { type: 'text' });
    champNom.value = leDomaine.nom;
    const champNote = el('input.champ', { type: 'text', placeholder: 'Sous-titre (facultatif)' });
    champNote.value = leDomaine.soustitre || '';

    let couleur = leDomaine.couleur;
    const nuancier = el('div.nuancier');
    for (const c of UI.COULEURS) {
      const pastille = el('button.nuance.nuance--' + c + (c === couleur ? '.nuance--choisie' : ''), {
        type: 'button', 'aria-label': c,
        onclick: () => {
          couleur = c;
          nuancier.querySelectorAll('.nuance').forEach(p => p.classList.remove('nuance--choisie'));
          pastille.classList.add('nuance--choisie');
        }
      });
      nuancier.appendChild(pastille);
    }

    let glyphe = leDomaine.icone;
    const choixIcones = el('div.nuancier');
    for (const g of UI.ICONES) {
      const bouton = el('button.nuance.nuance--glyphe' + (g === glyphe ? '.nuance--choisie' : ''), {
        type: 'button', 'aria-label': g,
        onclick: () => {
          glyphe = g;
          choixIcones.querySelectorAll('.nuance').forEach(p => p.classList.remove('nuance--choisie'));
          bouton.classList.add('nuance--choisie');
        }
      }, [icone(g)]);
      choixIcones.appendChild(bouton);
    }

    UI.ouvrirModale([
      el('h2.modale__titre', { texte: 'Modifier le domaine' }),
      champNom,
      champNote,
      el('p.modale__etiquette', { texte: 'Couleur' }), nuancier,
      el('p.modale__etiquette', { texte: 'Icône' }), choixIcones,
      el('div.modale__actions', null, [
        el('button.bouton.bouton--danger', {
          type: 'button', texte: 'Supprimer',
          onclick: () => {
            UI.fermerModale();
            UI.confirmer(
              'Supprimer « ' + leDomaine.nom + ' » ?',
              'Tous les thèmes qu’il contient seront supprimés aussi. C’est définitif.'
            ).then(oui => {
              if (!oui) return;
              Store.domaines.supprimer(leDomaine.id).then(() => {
                UI.annoncer('Domaine supprimé');
                location.hash = '#/';
              });
            });
          }
        }),
        el('button.bouton.bouton--plein', {
          type: 'button', texte: 'Enregistrer',
          onclick: () => {
            leDomaine.nom = champNom.value.trim() || leDomaine.nom;
            leDomaine.soustitre = champNote.value.trim();
            leDomaine.couleur = couleur;
            leDomaine.icone = glyphe;
            Store.domaines.enregistrer(leDomaine).then(() => {
              UI.fermerModale();
              Routeur.rafraichir();
            });
          }
        })
      ])
    ]);
  }

  /* =====================================================================
   *  Thème — la lecture plein écran
   * ===================================================================== */

  function theme(conteneur, id) {
    return Store.themes.obtenir(id).then(leTheme => {
      if (!leTheme) {
        conteneur.appendChild(vide('Ce thème n’existe plus.'));
        return;
      }
      Store.themes.marquerConsulte(id);

      conteneur.appendChild(entete({
        retour: () => { location.hash = '#/d/' + leTheme.domaineId; },
        titre: '',
        actions: [
          boutonAction('etoile', 'Favori', function () {
            leTheme.favori = !leTheme.favori;
            Store.themes.enregistrer(leTheme).then(() => Routeur.rafraichir());
          }, leTheme.favori),
          boutonAction('agrandir', 'Plein écran', basculerImmersion),
          boutonAction('envoyer', 'Partager', () => partagerThemes([leTheme])),
          boutonAction('crayon', 'Modifier', modifierIci)
        ]
      }));

      // Modifier à l'endroit où l'on lit, sans remonter en haut du thème.
      function modifierIci() {
        Etat.blocVise = blocEnVue(conteneur, leTheme);
        location.hash = '#/t/' + id + '/modifier';
      }
      conteneur.appendChild(el('div.flottants', null, [
        el('button.flottant.flottant--second', {
          type: 'button', 'aria-label': 'Retour à la liste des thèmes', title: 'Retour à la liste des thèmes',
          onclick: () => { location.hash = '#/d/' + leTheme.domaineId; }
        }, [icone('liste')]),
        el('button.flottant', {
          type: 'button', 'aria-label': 'Modifier ici', title: 'Modifier ici', onclick: modifierIci
        }, [icone('crayon')])
      ]));

      const lecture = el('article.lecture');
      lecture.appendChild(el('h1.lecture__titre', { texte: leTheme.titre }));
      if (leTheme.soustitre) {
        lecture.appendChild(el('p.lecture__note', { texte: leTheme.soustitre }));
      }
      if ((leTheme.situations || []).length) {
        lecture.appendChild(el('div.etiquettes', null,
          leTheme.situations.map(s => el('span.etiquette', { texte: s }))));
      }

      if (!(leTheme.blocs || []).length) {
        lecture.appendChild(vide(
          'Ce thème est encore vide.',
          el('button.bouton.bouton--plein', {
            type: 'button', texte: 'Le préparer maintenant',
            onclick: () => { location.hash = '#/t/' + id + '/modifier'; }
          })
        ));
      }

      (leTheme.blocs || []).forEach((bloc, rang) => {
        const noeud = rendreBloc(bloc);
        noeud.dataset.rang = rang;
        lecture.appendChild(noeud);
      });

      conteneur.appendChild(lecture);

      // Retour de l'éditeur : on revient au bloc qu'on était en train de modifier.
      const rang = rangVise(leTheme);
      if (rang !== null) {
        requestAnimationFrame(() => ramenerA(lecture.querySelector('[data-rang="' + rang + '"]')));
      }

      // Passage au thème voisin sans repasser par la liste.
      return Store.themes.parDomaine(leTheme.domaineId).then(fratrie => {
        const position = fratrie.findIndex(t => t.id === id);
        const precedent = position > 0 ? fratrie[position - 1] : null;
        const suivant = position >= 0 && position < fratrie.length - 1 ? fratrie[position + 1] : null;
        if (!precedent && !suivant) return;
        conteneur.appendChild(el('nav.voisins', null, [
          precedent ? el('button.voisin', {
            type: 'button', onclick: () => { location.hash = '#/t/' + precedent.id; }
          }, [
            el('span.voisin__sens', { texte: 'Précédent' }),
            el('span.voisin__titre', { texte: precedent.titre })
          ]) : el('span'),
          suivant ? el('button.voisin.voisin--fin', {
            type: 'button', onclick: () => { location.hash = '#/t/' + suivant.id; }
          }, [
            el('span.voisin__sens', { texte: 'Suivant' }),
            el('span.voisin__titre', { texte: suivant.titre })
          ]) : el('span')
        ]));
      });
    });
  }

  function rendreBloc(bloc) {
    if (bloc.type === 'question') {
      const boite = el('blockquote.question');
      boite.appendChild(texteEnrichi(bloc.texte, 'question__texte'));
      // Ce qu'on espère entendre : un pense-bête, pas une phrase à lire.
      if (bloc.attendu) boite.appendChild(texteEnrichi(bloc.attendu, 'question__attendu'));
      return boite;
    }

    if (bloc.type === 'media') {
      const adresse = lienSur(bloc.url);
      const lecteur = adresse ? lecteurPour(adresse) : null;
      if (lecteur) return rendreLecteur(bloc, adresse, lecteur);
      const dedans = [
        el('span.media__icone', null, [icone('media')]),
        el('span.media__texte', null, [
          el('span.media__titre', { texte: bloc.titre || 'Document' }),
          bloc.idee ? el('span.media__note', { texte: bloc.idee }) : null
        ])
      ];
      if (!adresse) {
        // Sans adresse exploitable, la carte reste lisible mais inerte.
        return el('div.media.media--inerte', null, dedans.concat([
          bloc.url ? el('span.media__brut', { texte: bloc.url }) : null
        ]));
      }
      return el('a.media', {
        href: adresse,
        rel: 'noopener noreferrer',
        target: /^https?:/i.test(adresse) ? '_blank' : null
      }, dedans);
    }

    if (bloc.type === 'note') {
      return el('aside.apparte', null, [
        icone('note', 'ic--apparte'),
        el('div.apparte__corps', null, [texteEnrichi(bloc.texte, 'apparte__texte')])
      ]);
    }

    if (bloc.type === 'ecriture') {
      const ref = Bible.analyser(bloc.reference || '');
      const boite = el('div.ecriture');
      if (ref) {
        boite.appendChild(el('div.ecriture__ligne', null, [
          lienReference(ref, 'forte'),
          el('a.ecriture__web', {
            href: Bible.lienWeb(ref),
            target: '_blank',
            rel: 'noopener',
            'aria-label': 'Ouvrir sur jw.org',
            title: 'Ouvrir sur jw.org'
          }, [icone('externe')])
        ]));
      } else {
        boite.appendChild(el('span.ref.ref--morte', { texte: bloc.reference || 'Référence incomplète' }));
      }
      if (bloc.idee) boite.appendChild(el('p.ecriture__idee', { texte: bloc.idee }));
      return boite;
    }

    if (bloc.type === 'document') {
      const dedans = [
        el('span.media__icone', null, [icone('fichier')]),
        el('span.media__texte', null, [
          el('span.media__titre', { texte: bloc.titre || bloc.nom || 'Document' }),
          el('span.media__note', { texte: [decrireFichier(bloc), bloc.idee].filter(Boolean).join(' · ') })
        ])
      ];
      if (!bloc.fichierId) return el('div.media.media--inerte', null, dedans);
      return el('button.media.document', {
        type: 'button', onclick: () => ouvrirDocument(bloc)
      }, dedans.concat([el('span.document__ouvrir', null, [icone('agrandir')])]));
    }

    if (bloc.type === 'image') {
      const figure = el('figure.figure');
      const image = el('img.figure__image', { alt: bloc.legende || 'Photo du texte' });
      afficherImage(image, bloc);
      image.addEventListener('click', () => agrandirPhoto(bloc));
      figure.appendChild(image);
      if (bloc.legende) figure.appendChild(el('figcaption.figure__legende', { texte: bloc.legende }));
      return figure;
    }

    const boite = el('div.paragraphe');
    boite.appendChild(texteEnrichi(bloc.texte, 'para'));
    return boite;
  }

  /** Une photo vient de l'appareil (imageId) ou d'une adresse en ligne (url). */
  function afficherImage(balise, bloc) {
    if (bloc.imageId) {
      Photos.attacher(balise, bloc.imageId);
      return;
    }
    const src = MiseEnPage.imageSure(bloc.url);
    if (src) balise.src = src;
  }

  /**
   * Ce qu'une adresse permet de lire sur place : vidéo YouTube ou Vimeo,
   * fichier vidéo ou audio, image. null : une simple carte cliquable.
   */
  function lecteurPour(adresse) {
    if (!/^https?:/i.test(adresse)) return null;
    let m = adresse.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) return { genre: 'cadre', src: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0&playsinline=1' };
    m = adresse.match(/^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d+)/i);
    if (m) return { genre: 'cadre', src: 'https://player.vimeo.com/video/' + m[1] };
    const chemin = adresse.split(/[?#]/)[0].toLowerCase();
    if (/\.(mp4|m4v|mov|webm)$/.test(chemin)) return { genre: 'video', src: adresse };
    if (/\.(mp3|m4a|aac|wav|ogg|oga)$/.test(chemin)) return { genre: 'audio', src: adresse };
    if (/\.(jpe?g|png|gif|webp|avif)$/.test(chemin)) return { genre: 'image', src: adresse };
    return null;
  }

  function rendreLecteur(bloc, adresse, lecteur) {
    let support;
    if (lecteur.genre === 'cadre') {
      support = el('div.lecteur__boite', null, [
        el('iframe.lecteur__cadre', {
          src: lecteur.src,
          title: bloc.titre || 'Vidéo',
          loading: 'lazy',
          allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
          allowfullscreen: true,
          referrerpolicy: 'strict-origin-when-cross-origin'
        })
      ]);
    } else if (lecteur.genre === 'video') {
      support = el('video.lecteur__video', { src: lecteur.src, controls: true, playsinline: true, preload: 'metadata' });
    } else if (lecteur.genre === 'audio') {
      support = el('audio.lecteur__audio', { src: lecteur.src, controls: true, preload: 'metadata' });
    } else {
      support = el('img.figure__image', { src: lecteur.src, alt: bloc.titre || '', loading: 'lazy' });
      support.addEventListener('click', () => agrandirPhoto({ url: lecteur.src, legende: bloc.titre }));
    }
    return el('figure.lecteur', null, [
      support,
      el('figcaption.lecteur__legende', null, [
        bloc.titre ? el('span.lecteur__titre', { texte: bloc.titre }) : null,
        bloc.idee ? el('span.lecteur__note', { texte: bloc.idee }) : null,
        el('a.lecteur__ouvrir', {
          href: adresse, target: '_blank', rel: 'noopener noreferrer'
        }, ['Ouvrir', icone('externe')])
      ])
    ]);
  }

  function agrandirPhoto(bloc) {
    const image = el('img.loupe__image', { alt: bloc.legende || '' });
    afficherImage(image, bloc);
    const panneau = UI.ouvrirModale([
      el('button.loupe__fermer', { type: 'button', 'aria-label': 'Fermer', onclick: UI.fermerModale }, [icone('croix')]),
      image
    ]);
    panneau.classList.add('modale__panneau--loupe');
  }

  /* — documents joints — */

  const GENRES_FICHIERS = [
    [/pdf$/i, /\.pdf$/i, 'PDF'],
    [/^image\//i, /\.(jpe?g|png|gif|webp|heic|avif)$/i, 'Image'],
    [/^video\//i, /\.(mp4|m4v|mov|webm)$/i, 'Vidéo'],
    [/^audio\//i, /\.(mp3|m4a|aac|wav|ogg)$/i, 'Son'],
    [/word/i, /\.docx?$/i, 'Word'],
    [/presentation|powerpoint/i, /\.pptx?$/i, 'PowerPoint'],
    [/sheet|excel/i, /\.xlsx?$/i, 'Excel'],
    [/^text\//i, /\.(txt|md)$/i, 'Texte']
  ];

  function genreFichier(mime, nom) {
    for (const [parType, parNom, libelle] of GENRES_FICHIERS) {
      if ((mime && parType.test(mime)) || (nom && parNom.test(nom))) return libelle;
    }
    const extension = String(nom || '').match(/\.([a-z0-9]{1,5})$/i);
    return extension ? extension[1].toUpperCase() : 'Document';
  }

  function taillelisible(octets) {
    if (!octets) return '';
    if (octets < 1024 * 1024) return Math.max(1, Math.round(octets / 1024)) + ' ko';
    return (octets / (1024 * 1024)).toFixed(1).replace('.', ',') + ' Mo';
  }

  function decrireFichier(bloc) {
    if (!bloc.fichierId) return 'Document absent';
    return [genreFichier(bloc.mime, bloc.nom), taillelisible(bloc.taille)].filter(Boolean).join(' · ');
  }

  /**
   * Ouvre un document joint en plein écran, par-dessus le thème. Ce que le
   * navigateur sait montrer (PDF, image, vidéo, son, texte) s'affiche sur
   * place ; le reste se confie à une autre application.
   */
  function ouvrirDocument(bloc) {
    const titre = bloc.titre || bloc.nom || 'Document';
    const scene = el('div.visionneuse__scene');
    const reglage = el('div.visionneuse__reglage');
    let url = null;
    let blob = null;
    let lecteur = null;

    function ouvrirAilleurs() {
      if (!blob) return;
      const nom = bloc.nom || titre;
      const fichier = new File([blob], nom, { type: blob.type || bloc.mime || '' });
      if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
        navigator.share({ files: [fichier], title: titre }).catch(() => {});
        return;
      }
      const lien = el('a', { href: url, download: nom, hidden: true });
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
    }

    const visionneuse = el('div.visionneuse', { role: 'dialog', 'aria-modal': 'true', 'aria-label': titre }, [
      el('div.visionneuse__barre', null, [
        el('button.rond', { type: 'button', 'aria-label': 'Fermer', title: 'Fermer', onclick: fermer }, [icone('croix')]),
        el('span.visionneuse__titre', { texte: titre }),
        reglage,
        el('button.rond', {
          type: 'button', 'aria-label': 'Ouvrir avec une autre application',
          title: 'Ouvrir avec une autre application', onclick: ouvrirAilleurs
        }, [icone('envoyer')])
      ]),
      scene
    ]);

    function surTouche(ev) {
      if (ev.key === 'Escape' && !document.fullscreenElement) fermer();
    }

    function fermer() {
      if (lecteur) lecteur.arreter();
      visionneuse.remove();
      if (url) URL.revokeObjectURL(url);
      document.body.classList.remove('sans-defilement');
      document.removeEventListener('keydown', surTouche);
      window.removeEventListener('hashchange', fermer);
      if (document.fullscreenElement === visionneuse && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }

    document.body.appendChild(visionneuse);
    document.body.classList.add('sans-defilement');
    document.addEventListener('keydown', surTouche);
    window.addEventListener('hashchange', fermer);
    // Demandé tout de suite, pendant que le toucher compte encore comme un geste.
    if (visionneuse.requestFullscreen) visionneuse.requestFullscreen().catch(() => {});

    Store.images.obtenir(bloc.fichierId).then(enr => {
      if (!enr || !enr.blob) {
        scene.appendChild(el('p.visionneuse__avis', { texte: 'Ce document n’est plus sur cet appareil.' }));
        return;
      }
      blob = enr.blob;
      url = URL.createObjectURL(blob);
      const genre = genreFichier(blob.type || bloc.mime, bloc.nom);
      let support = null;
      if (genre === 'PDF' && LecteurPdf.necessaire()) {
        // iPhone, iPad, Android : pdf.js dessine chaque page.
        lecteur = LecteurPdf.afficher(blob, scene);
        reglage.append(
          el('button.rond', { type: 'button', 'aria-label': 'Réduire', title: 'Réduire', onclick: () => lecteur.zoomer(-1) }, [icone('moins')]),
          el('button.rond', { type: 'button', 'aria-label': 'Agrandir', title: 'Agrandir', onclick: () => lecteur.zoomer(1) }, [icone('plus')])
        );
        lecteur.pret.catch(() => {
          reglage.innerHTML = '';
          scene.appendChild(el('div.visionneuse__avis', null, [
            icone('fichier'),
            el('p', { texte: 'Ce PDF n’a pas pu être affiché ici. Ouvrez-le avec une autre application.' }),
            el('button.bouton.bouton--plein', { type: 'button', onclick: ouvrirAilleurs }, [icone('envoyer'), 'Ouvrir avec…'])
          ]));
        });
        return;
      }
      if (genre === 'PDF') {
        support = el('iframe.visionneuse__cadre', { src: url, title: titre });
      } else if (genre === 'Texte') {
        support = el('iframe.visionneuse__cadre.visionneuse__cadre--texte', { src: url, title: titre });
      } else if (genre === 'Image') {
        support = el('img.visionneuse__image', { src: url, alt: titre });
      } else if (genre === 'Vidéo') {
        support = el('video.visionneuse__video', { src: url, controls: true, playsinline: true });
      } else if (genre === 'Son') {
        support = el('audio.visionneuse__son', { src: url, controls: true });
      }
      if (support) {
        scene.appendChild(support);
        return;
      }
      scene.appendChild(el('div.visionneuse__avis', null, [
        icone('fichier'),
        el('p', { texte: 'Vox ne sait pas afficher un document ' + genre + '. Ouvrez-le avec une autre application.' }),
        el('button.bouton.bouton--plein', { type: 'button', onclick: ouvrirAilleurs }, [icone('envoyer'), 'Ouvrir avec…'])
      ]));
    }).catch(() => {
      scene.appendChild(el('p.visionneuse__avis', { texte: 'Ce document n’a pas pu être lu.' }));
    });
  }

  function basculerImmersion() {
    const actif = document.body.classList.toggle('immersif');
    if (actif && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (!actif && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    if (actif) UI.annoncer('Touchez le haut de l’écran pour revenir');
  }

  /* =====================================================================
   *  Éditeur
   * ===================================================================== */

  const TYPES_BLOCS = [
    { type: 'question', libelle: 'Question',  glyphe: 'question' },
    { type: 'texte',    libelle: 'Texte',     glyphe: 'texte' },
    { type: 'ecriture', libelle: 'Écriture',  glyphe: 'livre' },
    { type: 'image',    libelle: 'Photo',     glyphe: 'photo' },
    { type: 'document', libelle: 'Document',  glyphe: 'fichier' },
    { type: 'media',    libelle: 'Vidéo, lien', glyphe: 'media' },
    { type: 'note',     libelle: 'Aparté',    glyphe: 'note' }
  ];

  /* — barre de mise en forme d'un champ de texte — */

  const PREFIXE_LIGNE = /^(#{1,6}\s+|\s*(?:[-*•+]|\d{1,3}[.)])\s+(?:\[[ xX]\]\s+)?|>\s?)/;

  /**
   * Barre posée au-dessus d'une zone de texte : elle écrit les marques de mise
   * en page à la place de l'utilisateur. Le collage depuis Word, Pages ou une
   * page web garde aussi titres, gras, listes, tableaux et liens.
   */
  function outilsTexte(zone) {
    let debut = 0;
    let fin = 0;
    const noter = () => { debut = zone.selectionStart; fin = zone.selectionEnd; };
    for (const ev of ['select', 'keyup', 'mouseup', 'touchend', 'input', 'focus']) {
      zone.addEventListener(ev, noter);
    }

    function appliquer(valeur, a, b) {
      zone.value = valeur;
      zone.focus();
      zone.setSelectionRange(a, b);
      noter();
      zone.dispatchEvent(new Event('input'));
    }

    function entourer(ouvre, ferme) {
      const v = zone.value;
      const a = debut;
      const b = fin;
      // Déjà entouré : on retire les marques.
      if (v.slice(a - ouvre.length, a) === ouvre && v.slice(b, b + ferme.length) === ferme) {
        appliquer(v.slice(0, a - ouvre.length) + v.slice(a, b) + v.slice(b + ferme.length),
          a - ouvre.length, b - ouvre.length);
        return;
      }
      const choisi = v.slice(a, b);
      const coeur = choisi.trim();
      if (!coeur) {
        appliquer(v.slice(0, a) + ouvre + ferme + v.slice(b), a + ouvre.length, a + ouvre.length);
        return;
      }
      const avant = choisi.match(/^\s*/)[0];
      const apres = choisi.match(/\s*$/)[0];
      const depart = a + avant.length + ouvre.length;
      appliquer(v.slice(0, a) + avant + ouvre + coeur + ferme + apres + v.slice(b),
        depart, depart + coeur.length);
    }

    function colorer(couleur) {
      const v = zone.value;
      let a = debut;
      let b = fin;
      // Une couleur déjà posée autour de la sélection est d'abord retirée.
      const autour = v.slice(b).match(new RegExp('^\\]\\{(' + MiseEnPage.COULEURS.join('|') + ')\\}'));
      let valeur = v;
      if (v[a - 1] === '[' && autour) {
        valeur = v.slice(0, a - 1) + v.slice(a, b) + v.slice(b + autour[0].length);
        a -= 1;
        b -= 1;
      } else {
        const choisi = v.slice(a, b).replace(/\[([^\]]+)\]\{[a-z]+\}/g, '$1');
        valeur = v.slice(0, a) + choisi + v.slice(b);
        b = a + choisi.length;
      }
      if (!couleur) {
        appliquer(valeur, a, b);
        return;
      }
      zone.value = valeur;
      debut = a;
      fin = b;
      entourer('[', ']{' + couleur + '}');
    }

    function prefixer(prefixe) {
      const v = zone.value;
      const a = v.lastIndexOf('\n', debut - 1) + 1;
      let b = v.indexOf('\n', fin);
      if (b < 0) b = v.length;
      const lignes = v.slice(a, b).split('\n');
      const marque = rang => (prefixe === '1. ' ? (rang + 1) + '. ' : prefixe);
      const deja = lignes.every((l, rang) => !l.trim() || (prefixe === '1. '
        ? /^\s*\d{1,3}[.)]\s/.test(l) : l.startsWith(prefixe)));
      let rang = 0;
      const nouvelles = lignes.map(l => {
        if (!l.trim()) return l;
        const nue = l.replace(PREFIXE_LIGNE, '');
        return deja ? nue : marque(rang++) + nue;
      });
      const bloc = nouvelles.join('\n');
      appliquer(v.slice(0, a) + bloc + v.slice(b), a, a + bloc.length);
    }

    const OUVRE_CADRE = new RegExp('^:::\\s*(' + MiseEnPage.COULEURS.join('|') + ')\\s*$');

    /**
     * Encadre en couleur les lignes sélectionnées (ou la ligne du curseur).
     * Déjà encadrées : la couleur change, ou le cadre disparaît (null).
     */
    function encadrer(couleur) {
      const v = zone.value;
      const a = v.lastIndexOf('\n', debut - 1) + 1;
      const finSelection = fin > debut && v[fin - 1] === '\n' ? fin - 1 : fin;
      let b = v.indexOf('\n', finSelection);
      if (b < 0) b = v.length;
      const contenu = v.slice(a, b);

      const debutPrecedente = a > 0 ? v.lastIndexOf('\n', a - 2) + 1 : -1;
      const precedente = a > 0 ? v.slice(debutPrecedente, a - 1) : null;
      let finSuivante = b < v.length ? v.indexOf('\n', b + 1) : -1;
      if (b < v.length && finSuivante < 0) finSuivante = v.length;
      const suivante = b < v.length ? v.slice(b + 1, finSuivante) : null;

      if (precedente !== null && suivante !== null &&
          OUVRE_CADRE.test(precedente.trim()) && /^:::\s*$/.test(suivante.trim())) {
        if (!couleur) {
          appliquer(v.slice(0, debutPrecedente) + contenu + v.slice(finSuivante),
            debutPrecedente, debutPrecedente + contenu.length);
          return;
        }
        const ouvre = ':::' + couleur + '\n';
        appliquer(v.slice(0, debutPrecedente) + ouvre + contenu + '\n:::' + v.slice(finSuivante),
          debutPrecedente + ouvre.length, debutPrecedente + ouvre.length + contenu.length);
        return;
      }
      if (!couleur) return;
      const ouvre = ':::' + couleur + '\n';
      appliquer(v.slice(0, a) + ouvre + contenu + '\n:::' + v.slice(b),
        a + ouvre.length, a + ouvre.length + contenu.length);
    }

    function inserer(texte) {
      const v = zone.value;
      const avant = debut && v[debut - 1] !== '\n' ? '\n' : '';
      const apres = v[fin] && v[fin] !== '\n' ? '\n' : '';
      const ajout = avant + texte + apres;
      appliquer(v.slice(0, debut) + ajout + v.slice(fin), debut + ajout.length, debut + ajout.length);
    }

    function lien() {
      const [a, b] = [debut, fin];
      UI.demander('Adresse du lien', 'https://', {
        repere: 'https://www.jw.org/…',
        aide: 'Le texte sélectionné deviendra cliquable.'
      }).then(adresse => {
        const sure = adresse && lienSur(adresse);
        if (!sure) {
          if (adresse) UI.annoncer('Adresse non valable (https://…)', 'erreur');
          return;
        }
        debut = a;
        fin = b;
        if (a === b) {
          const v = zone.value;
          appliquer(v.slice(0, a) + sure + v.slice(b), a, a + sure.length);
        } else {
          entourer('[', '](' + sure.replace(/\)/g, '%29').replace(/ /g, '%20') + ')');
        }
      });
    }

    function image() {
      const [a, b] = [debut, fin];
      UI.demander('Adresse de l’image', 'https://', {
        repere: 'https://…/image.jpg',
        aide: 'Une image en ligne, placée dans le texte. Pour une photo de l’appareil, ajoutez plutôt un bloc Photo.'
      }).then(adresse => {
        const sure = adresse && MiseEnPage.imageSure(adresse);
        if (!sure) {
          if (adresse) UI.annoncer('Adresse non valable (https://…)', 'erreur');
          return;
        }
        debut = a;
        fin = b;
        inserer('![](' + sure.replace(/\)/g, '%29').replace(/ /g, '%20') + ')');
      });
    }

    // Aperçu : le rendu final, sous la zone, mis à jour à la frappe.
    const apercu = el('div.apercu-texte', { hidden: true });
    const dessinerApercu = () => {
      if (apercu.hidden) return;
      apercu.innerHTML = '';
      apercu.appendChild(texteEnrichi(zone.value, 'para'));
    };
    zone.addEventListener('input', dessinerApercu);

    const nuancier = (classe, legende, choisir) => {
      const rangee = el('div.outils__couleurs', { hidden: true }, [
        el('span.outils__legende', { texte: legende }),
        ...MiseEnPage.COULEURS.map(c => el('button.pastille.pastille--' + c + classe, {
          type: 'button', 'aria-label': c, title: c,
          onclick: () => { rangee.hidden = true; choisir(c); }
        })),
        el('button.pastille.pastille--aucune' + classe, {
          type: 'button', 'aria-label': 'Aucun', title: 'Aucun',
          onclick: () => { rangee.hidden = true; choisir(null); }
        })
      ]);
      for (const bouton of rangee.querySelectorAll('button')) {
        bouton.addEventListener('mousedown', ev => ev.preventDefault());
      }
      return rangee;
    };
    const couleurs = nuancier('', 'Couleur du texte', colorer);
    const cadres = nuancier('.pastille--cadre', 'Encadrer', encadrer);
    const basculer = (montre, cache) => { cache.hidden = true; montre.hidden = !montre.hidden; };

    const outil = (contenu, libelle, action, classe) => {
      const bouton = el('button.outil' + (classe ? '.' + classe : ''), {
        type: 'button', 'aria-label': libelle, title: libelle,
        onclick: action
      }, contenu);
      // Garder la sélection : sur ordinateur, le clic ne vole pas le focus.
      bouton.addEventListener('mousedown', ev => ev.preventDefault());
      return bouton;
    };

    const boutonApercu = outil(['Aperçu'], 'Voir le rendu', () => {
      apercu.hidden = !apercu.hidden;
      boutonApercu.classList.toggle('outil--actif', !apercu.hidden);
      dessinerApercu();
    }, 'outil--mot');

    const barre = el('div.outils', null, [
      outil(['Titre'], 'Titre', () => prefixer('# '), 'outil--mot'),
      outil(['Sous-titre'], 'Sous-titre', () => prefixer('## '), 'outil--mot'),
      outil([el('b', { texte: 'G' })], 'Gras', () => entourer('**', '**')),
      outil([el('i', { texte: 'I' })], 'Italique', () => entourer('*', '*')),
      outil([el('u', { texte: 'S' })], 'Souligné', () => entourer('++', '++')),
      outil([el('s', { texte: 'ab' })], 'Barré', () => entourer('~~', '~~')),
      outil([el('mark.mp-surligne', { texte: 'ab' })], 'Surligner', () => entourer('==', '==')),
      outil([el('span.outil__couleur', { texte: 'A' })], 'Couleur', () => basculer(couleurs, cadres)),
      outil([icone('cadre')], 'Encadrer en couleur', () => basculer(cadres, couleurs)),
      outil(['•'], 'Liste à puces', () => prefixer('- ')),
      outil(['1.'], 'Liste numérotée', () => prefixer('1. ')),
      outil(['❝'], 'Citation', () => prefixer('> ')),
      outil([icone('lien')], 'Lien', lien),
      outil([icone('photo')], 'Image en ligne', image),
      boutonApercu
    ]);

    // Collage riche : la mise en forme d'origine est convertie, pas perdue.
    zone.addEventListener('paste', ev => {
      const donnees = ev.clipboardData;
      const html = donnees && donnees.getData('text/html');
      if (!html) return;
      const converti = MiseEnPage.depuisHtml(html, { imagesEmbarquees: false });
      if (!converti.trim()) return;
      ev.preventDefault();
      zone.setRangeText(converti, zone.selectionStart, zone.selectionEnd, 'end');
      zone.dispatchEvent(new Event('input'));
    });

    return { barre: el('div.outils__cadre', null, [barre, couleurs, cadres]), apercu };
  }

  function editeur(conteneur, id) {
    return Store.themes.obtenir(id).then(brouillon => {
      if (!brouillon) {
        conteneur.appendChild(vide('Ce thème n’existe plus.'));
        return;
      }

      let minuterie = null;
      const temoin = el('span.temoin', { texte: '' });

      // Enregistrement continu : on ne peut pas perdre une préparation.
      function enregistrer() {
        clearTimeout(minuterie);
        brouillon.sien = true; // passé par l'éditeur : c'est le travail de l'utilisateur
        temoin.textContent = '…';
        minuterie = setTimeout(() => {
          Store.themes.enregistrer(brouillon).then(() => {
            temoin.textContent = 'Enregistré';
            setTimeout(() => { temoin.textContent = ''; }, 1800);
          });
        }, 500);
      }

      // En quittant, la lecture reprend au bloc qu'on avait sous les yeux.
      function terminer() {
        clearTimeout(minuterie);
        Etat.blocVise = blocEnVue(pile, brouillon);
        Store.themes.enregistrer(brouillon).then(() => { location.hash = '#/t/' + id; });
      }

      conteneur.appendChild(entete({
        retour: terminer,
        titre: 'Préparation',
        collante: true,
        actions: [temoin, boutonAction('check', 'Terminé', terminer)]
      }));

      const champTitre = el('input.champ.champ--titre', { type: 'text', placeholder: 'Titre du thème' });
      champTitre.value = brouillon.titre;
      champTitre.addEventListener('input', () => {
        brouillon.titre = champTitre.value;
        enregistrer();
      });

      const champNote = el('input.champ', { type: 'text', placeholder: 'Sous-titre (facultatif)' });
      champNote.value = brouillon.soustitre || '';
      champNote.addEventListener('input', () => {
        brouillon.soustitre = champNote.value;
        enregistrer();
      });

      conteneur.appendChild(el('div.editeur__tete', null, [champTitre, champNote]));

      /* — situations — */
      const rangeeSituations = el('div.etiquettes.etiquettes--modifiables');
      function dessinerSituations() {
        rangeeSituations.innerHTML = '';
        for (const s of (brouillon.situations || [])) {
          rangeeSituations.appendChild(el('span.etiquette', null, [
            s,
            el('button.etiquette__retrait', {
              type: 'button', 'aria-label': 'Retirer',
              onclick: () => {
                brouillon.situations = brouillon.situations.filter(x => x !== s);
                dessinerSituations();
                enregistrer();
              }
            }, [icone('croix')])
          ]));
        }
        rangeeSituations.appendChild(el('button.etiquette.etiquette--ajout', {
          type: 'button',
          onclick: () => UI.demander('Situation', '', {
            repere: 'deuil, visite, objection…',
            aide: 'Une étiquette pour retrouver ce thème selon la situation rencontrée.'
          }).then(valeur => {
            if (!valeur) return;
            brouillon.situations = brouillon.situations || [];
            if (!brouillon.situations.includes(valeur)) brouillon.situations.push(valeur);
            dessinerSituations();
            enregistrer();
          })
        }, [icone('plus'), 'Situation']));
      }
      dessinerSituations();
      conteneur.appendChild(rangeeSituations);

      /* — blocs — */
      const pile = el('div.pile');

      function dessinerBlocs() {
        pile.innerHTML = '';
        brouillon.blocs = brouillon.blocs || [];
        if (!brouillon.blocs.length) {
          pile.appendChild(vide('Ajoutez une question, un raisonnement, une écriture ou une photo.'));
        }
        brouillon.blocs.forEach((bloc, index) => {
          pile.appendChild(carteBloc(bloc, index));
        });
      }

      function deplacer(index, sens) {
        const cible = index + sens;
        if (cible < 0 || cible >= brouillon.blocs.length) return;
        const [retire] = brouillon.blocs.splice(index, 1);
        brouillon.blocs.splice(cible, 0, retire);
        dessinerBlocs();
        enregistrer();
      }

      function supprimerBloc(index) {
        const fichier = Store.fichierDuBloc(brouillon.blocs[index]);
        const suite = fichier ? Store.images.supprimer(fichier) : Promise.resolve();
        suite.then(() => {
          brouillon.blocs.splice(index, 1);
          dessinerBlocs();
          enregistrer();
        });
      }

      function zoneTexte(valeur, repere, surChangement) {
        const zone = el('textarea.champ.champ--zone', { rows: 3, placeholder: repere });
        zone.value = valeur || '';
        const ajuster = () => {
          zone.style.height = 'auto';
          zone.style.height = zone.scrollHeight + 'px';
        };
        zone.addEventListener('input', () => { ajuster(); surChangement(zone.value); });
        setTimeout(ajuster, 0);
        return zone;
      }

      function carteBloc(bloc, index) {
        const modele = TYPES_BLOCS.find(t => t.type === bloc.type) || TYPES_BLOCS[1];
        const corps = el('div.bloc__corps');

        if (bloc.type === 'ecriture') {
          const apercu = el('span.bloc__apercu');
          const champRef = el('input.champ', { type: 'text', placeholder: 'Matthieu 24:14' });
          champRef.value = bloc.reference || '';
          const verifier = () => {
            const ref = Bible.analyser(champRef.value);
            apercu.textContent = ref ? Bible.formater(ref) : 'Référence non reconnue';
            apercu.className = 'bloc__apercu' + (ref ? ' bloc__apercu--bon' : ' bloc__apercu--flou');
          };
          champRef.addEventListener('input', () => {
            bloc.reference = champRef.value;
            verifier();
            enregistrer();
          });
          verifier();
          corps.appendChild(champRef);
          corps.appendChild(apercu);
          corps.appendChild(zoneTexte(bloc.idee, 'L’idée à retenir (facultatif)', v => {
            bloc.idee = v;
            enregistrer();
          }));

        } else if (bloc.type === 'image') {
          const apercu = el('div.bloc__photo');
          if (bloc.imageId || MiseEnPage.imageSure(bloc.url)) {
            const image = el('img', { alt: '' });
            afficherImage(image, bloc);
            apercu.appendChild(image);
          }
          const choix = el('input', { type: 'file', accept: 'image/*', hidden: true });
          choix.addEventListener('change', () => {
            const fichier = choix.files && choix.files[0];
            if (!fichier) return;
            Photos.reduire(fichier)
              .then(blob => Store.images.ajouter(blob))
              .then(imageId => {
                const ancien = bloc.imageId;
                bloc.imageId = imageId;
                delete bloc.url;
                enregistrer();
                dessinerBlocs();
                if (ancien) Store.images.supprimer(ancien);
              })
              .catch(() => UI.annoncer('Photo illisible', 'erreur'));
          });
          corps.appendChild(apercu);
          corps.appendChild(choix);
          corps.appendChild(el('button.bouton.bouton--discret', {
            type: 'button',
            texte: bloc.imageId ? 'Remplacer la photo' : 'Choisir une photo',
            onclick: () => choix.click()
          }));
          if (!bloc.imageId) {
            // Ou une image en ligne, sans rien stocker sur l'appareil.
            const champUrl = el('input.champ', {
              type: 'url', placeholder: '… ou l’adresse d’une image en ligne (https://…)',
              autocapitalize: 'off', spellcheck: 'false'
            });
            champUrl.value = bloc.url || '';
            champUrl.addEventListener('change', () => {
              bloc.url = champUrl.value.trim();
              enregistrer();
              dessinerBlocs();
            });
            corps.appendChild(champUrl);
          }
          corps.appendChild(zoneTexte(bloc.legende, 'Légende (facultatif)', v => {
            bloc.legende = v;
            enregistrer();
          }));

        } else if (bloc.type === 'document') {
          const choix = el('input', { type: 'file', hidden: true });
          choix.addEventListener('change', () => {
            const fichier = choix.files && choix.files[0];
            if (!fichier) return;
            const lourd = fichier.size > 25 * 1024 * 1024;
            const accord = lourd
              ? UI.confirmer('Document volumineux',
                'Ce fichier fait ' + taillelisible(fichier.size) + ' : il alourdira les sauvegardes et les envois. L’ajouter quand même ?',
                'Ajouter')
              : Promise.resolve(true);
            accord.then(oui => {
              if (!oui) return;
              // Un Blob plutôt qu'un File : seul le contenu et son type sont gardés.
              return Store.images.ajouter(fichier.slice(0, fichier.size, fichier.type))
                .then(fichierId => {
                  const ancien = bloc.fichierId;
                  Object.assign(bloc, {
                    fichierId, nom: fichier.name, mime: fichier.type, taille: fichier.size
                  });
                  if (!bloc.titre) bloc.titre = fichier.name.replace(/\.[^.]+$/, '');
                  enregistrer();
                  dessinerBlocs();
                  if (ancien) Store.images.supprimer(ancien);
                });
            }).catch(() => UI.annoncer('Document illisible', 'erreur'));
          });

          if (bloc.fichierId) {
            corps.appendChild(el('button.media.document.document--editeur', {
              type: 'button', onclick: () => ouvrirDocument(bloc)
            }, [
              el('span.media__icone', null, [icone('fichier')]),
              el('span.media__texte', null, [
                el('span.media__titre', { texte: bloc.nom || 'Document' }),
                el('span.media__note', { texte: decrireFichier(bloc) + ' · toucher pour voir' })
              ])
            ]));
          }
          corps.appendChild(choix);
          corps.appendChild(el('button.bouton.bouton--discret', {
            type: 'button',
            texte: bloc.fichierId ? 'Remplacer le document' : 'Choisir un document (PDF, image, vidéo…)',
            onclick: () => choix.click()
          }));

          const champTitreDoc = el('input.champ', { type: 'text', placeholder: 'Titre affiché — « Cahier, page 4 »' });
          champTitreDoc.value = bloc.titre || '';
          champTitreDoc.addEventListener('input', () => {
            bloc.titre = champTitreDoc.value;
            enregistrer();
          });
          corps.appendChild(champTitreDoc);
          corps.appendChild(zoneTexte(bloc.idee, 'Ce qu’on en retient (facultatif)', v => {
            bloc.idee = v;
            enregistrer();
          }));

        } else if (bloc.type === 'media') {
          const champTitre = el('input.champ', { type: 'text', placeholder: 'Titre — « Vidéo : … », « Cahier, page 4 »' });
          champTitre.value = bloc.titre || '';
          champTitre.addEventListener('input', () => {
            bloc.titre = champTitre.value;
            enregistrer();
          });

          const avis = el('span.bloc__apercu');
          const champUrl = el('input.champ', { type: 'url', placeholder: 'https://… (YouTube, vidéo .mp4, jw.org, article)', autocapitalize: 'off', spellcheck: 'false' });
          champUrl.value = bloc.url || '';
          const verifierUrl = () => {
            if (!champUrl.value.trim()) {
              avis.textContent = 'Sans adresse, la carte s’affiche sans être cliquable.';
              avis.className = 'bloc__apercu';
              return;
            }
            const bon = lienSur(champUrl.value);
            const lecteur = bon && lecteurPour(bon);
            const genres = {
              cadre: 'Vidéo lue directement dans Vox',
              video: 'Vidéo lue directement dans Vox',
              audio: 'Son lu directement dans Vox',
              image: 'Image affichée dans Vox'
            };
            avis.textContent = !bon ? 'Seules les adresses http, https et jwlibrary sont ouvertes.'
              : lecteur ? genres[lecteur.genre] : 'Lien valide — affiché en carte cliquable';
            avis.className = 'bloc__apercu' + (bon ? ' bloc__apercu--bon' : ' bloc__apercu--flou');
          };
          champUrl.addEventListener('input', () => {
            bloc.url = champUrl.value;
            verifierUrl();
            enregistrer();
          });
          verifierUrl();

          corps.appendChild(champTitre);
          corps.appendChild(champUrl);
          corps.appendChild(avis);
          corps.appendChild(zoneTexte(bloc.idee, 'Ce qu’on en retient (facultatif)', v => {
            bloc.idee = v;
            enregistrer();
          }));

        } else {
          const reperes = {
            question: 'La question posée — à l’auditoire, ou à soi-même',
            note: 'Un rappel pour vous-même',
            texte: 'Le raisonnement. Les références écrites ici deviennent cliquables.'
          };
          const zone = zoneTexte(bloc.texte, reperes[bloc.type] || reperes.texte, v => {
            bloc.texte = v;
            enregistrer();
          });
          const outils = outilsTexte(zone);
          corps.appendChild(outils.barre);
          corps.appendChild(zone);
          corps.appendChild(outils.apercu);
          if (bloc.type === 'question') {
            corps.appendChild(zoneTexte(bloc.attendu, 'Réponse attendue, relance (facultatif)', v => {
              bloc.attendu = v;
              enregistrer();
            }));
          }
        }

        return el('section.bloc', { 'data-rang': index }, [
          el('div.bloc__barre', null, [
            el('span.bloc__genre', null, [icone(modele.glyphe), modele.libelle]),
            el('div.bloc__outils', null, [
              el('button.rond.rond--menu', { type: 'button', 'aria-label': 'Monter', onclick: () => deplacer(index, -1) }, [icone('haut')]),
              el('button.rond.rond--menu', { type: 'button', 'aria-label': 'Descendre', onclick: () => deplacer(index, 1) }, [icone('bas')]),
              el('button.rond.rond--menu.rond--danger', {
                type: 'button', 'aria-label': 'Supprimer',
                onclick: () => UI.confirmer('Supprimer ce bloc ?', null).then(oui => { if (oui) supprimerBloc(index); })
              }, [icone('poubelle')])
            ])
          ]),
          corps
        ]);
      }

      dessinerBlocs();
      conteneur.appendChild(pile);

      // Venu du crayon au milieu d'un thème : on ouvre au bloc qu'on lisait.
      const rang = rangVise(brouillon);
      if (rang !== null) {
        setTimeout(() => {
          const carte = pile.querySelector('[data-rang="' + rang + '"]');
          ramenerA(carte);
          if (carte) carte.classList.add('bloc--vise');
        }, 30);
      }

      const palette = el('div.palette');
      for (const modele of TYPES_BLOCS) {
        palette.appendChild(el('button.palette__bouton', {
          type: 'button',
          onclick: () => {
            brouillon.blocs = brouillon.blocs || [];
            brouillon.blocs.push({ id: Store.identifiant(), type: modele.type });
            dessinerBlocs();
            enregistrer();
            const cartes = pile.querySelectorAll('.bloc');
            const derniere = cartes[cartes.length - 1];
            if (derniere) {
              derniere.scrollIntoView({ behavior: 'smooth', block: 'center' });
              const saisie = derniere.querySelector('textarea, input');
              if (saisie) saisie.focus();
            }
          }
        }, [icone(modele.glyphe), el('span', { texte: modele.libelle })]));
      }
      conteneur.appendChild(el('h2.section', { texte: 'Ajouter' }));
      conteneur.appendChild(palette);

      conteneur.appendChild(el('button.bouton.bouton--danger.bouton--large', {
        type: 'button', texte: 'Supprimer ce thème',
        onclick: () => UI.confirmer(
          'Supprimer « ' + brouillon.titre + ' » ?',
          'La préparation, ses photos et ses documents seront perdus.'
        ).then(oui => {
          if (!oui) return;
          const retour = brouillon.domaineId;
          clearTimeout(minuterie);
          Store.themes.supprimer(id).then(() => {
            UI.annoncer('Thème supprimé');
            location.hash = '#/d/' + retour;
          });
        })
      }));
    });
  }

  /* =====================================================================
   *  Recherche
   * ===================================================================== */

  function recherche(conteneur) {
    conteneur.appendChild(entete({
      retour: () => { location.hash = '#/'; },
      titre: 'Rechercher'
    }));

    const champ = el('input.champ.champ--recherche', {
      type: 'search',
      placeholder: 'Un mot, une situation, une référence…',
      autocomplete: 'off'
    });
    conteneur.appendChild(champ);

    const resultats = el('div.liste');
    conteneur.appendChild(resultats);

    return Promise.all([Store.themes.tous(), Store.domaines.tous()]).then(([themes, domaines]) => {
      const nomDomaine = new Map(domaines.map(d => [d.id, d.nom]));

      // Un seul texte plat par thème : titre, étiquettes et contenu des blocs.
      const index = themes.map(t => {
        const morceaux = [t.titre, t.soustitre || ''].concat(t.situations || []);
        for (const bloc of (t.blocs || [])) {
          morceaux.push(bloc.texte || '', bloc.reference || '', bloc.idee || '', bloc.legende || '',
            bloc.titre || '', bloc.nom || '');
        }
        return { theme: t, plat: Bible.normaliser(morceaux.join(' ')) };
      });

      function chercher() {
        const requete = Bible.normaliser(champ.value.trim());
        resultats.innerHTML = '';
        if (requete.length < 2) {
          resultats.appendChild(vide('Tapez au moins deux lettres.'));
          return;
        }
        const mots = requete.split(/\s+/);
        const trouves = index.filter(entree => mots.every(m => entree.plat.includes(m)));
        if (!trouves.length) {
          resultats.appendChild(vide('Rien trouvé.'));
          return;
        }
        for (const { theme: t } of trouves) {
          resultats.appendChild(el('div.fiche', null, [
            el('button.fiche__corps', {
              type: 'button', onclick: () => { location.hash = '#/t/' + t.id; }
            }, [
              el('span.fiche__titre', { texte: t.titre }),
              el('span.fiche__note', { texte: nomDomaine.get(t.domaineId) || '' }),
              el('span.fiche__meta', { texte: UI.resumeBlocs(t.blocs) })
            ])
          ]));
        }
      }

      champ.addEventListener('input', chercher);
      chercher();
      setTimeout(() => champ.focus(), 60);
    });
  }

  /* =====================================================================
   *  Réglages
   * ===================================================================== */

  function ilYA(iso) {
    const jours = Math.floor((Date.now() - Date.parse(iso)) / JOUR);
    if (jours <= 0) return 'aujourd’hui';
    if (jours === 1) return 'hier';
    if (jours < 31) return 'il y a ' + jours + ' jours';
    const mois = Math.round(jours / 30);
    return 'il y a ' + mois + (mois > 1 ? ' mois' : ' mois');
  }

  function decrireSauvegarde(etat) {
    if (!etat.derniere) {
      return etat.enRetard
        ? 'Jamais sauvegardé — ' + etat.enRetard + (etat.enRetard > 1 ? ' thèmes vous appartiennent' : ' thème vous appartient') + ' et n’existent que sur cet appareil.'
        : 'Jamais sauvegardé.';
    }
    const quand = 'Dernière sauvegarde ' + ilYA(etat.derniere) + '.';
    if (!etat.enRetard) return quand + ' Rien de nouveau depuis.';
    return quand + ' ' + etat.enRetard + (etat.enRetard > 1 ? ' thèmes modifiés' : ' thème modifié') + ' depuis.';
  }

  function reglages(conteneur) {
    conteneur.appendChild(entete({
      retour: () => { location.hash = '#/'; },
      titre: 'Réglages'
    }));

    /* — où ouvrir les références — */
    conteneur.appendChild(el('h2.section', { texte: 'Références bibliques' }));
    const choixCible = el('div.filtres');
    const poserCible = (libelle, valeur, aide) => {
      const bouton = el('button.filtre' + (Etat.cible === valeur ? '.filtre--actif' : ''), {
        type: 'button', texte: libelle, title: aide,
        onclick: () => {
          Etat.cible = valeur;
          Store.reglages.definir('cible', valeur);
          choixCible.querySelectorAll('.filtre').forEach(b => b.classList.remove('filtre--actif'));
          bouton.classList.add('filtre--actif');
          UI.annoncer('Les références ouvriront ' + libelle);
        }
      });
      choixCible.appendChild(bouton);
    };
    poserCible('JW Library', 'app', 'Ouvre directement l’application installée');
    poserCible('jw.org', 'web', 'Passe par le site, utile si l’application n’est pas installée');
    conteneur.appendChild(choixCible);
    conteneur.appendChild(el('p.aide', {
      texte: 'JW Library doit être installée sur cet appareil pour que les liens s’ouvrent dans l’application.'
    }));

    /* — taille du texte — */
    conteneur.appendChild(el('h2.section', { texte: 'Confort de lecture' }));
    const curseur = el('input.curseur', {
      type: 'range', min: '90', max: '150', step: '5'
    });
    curseur.value = String(Math.round(Etat.taille * 100));
    const exemple = el('p.exemple', { texte: 'Examinant soigneusement les Écritures.' });
    const appliquer = () => {
      Etat.taille = Number(curseur.value) / 100;
      document.documentElement.style.setProperty('--echelle', Etat.taille);
    };
    curseur.addEventListener('input', appliquer);
    curseur.addEventListener('change', () => Store.reglages.definir('taille', Etat.taille));
    conteneur.appendChild(curseur);
    conteneur.appendChild(exemple);

    /* — sauvegarde — */
    conteneur.appendChild(el('h2.section', { texte: 'Sauvegarde' }));

    const etatLigne = el('p.aide', { texte: 'Vérification…' });
    conteneur.appendChild(etatLigne);
    Store.etatSauvegarde().then(etat => {
      etatLigne.textContent = decrireSauvegarde(etat);
      etatLigne.className = 'aide' + (etat.enRetard ? ' aide--alerte' : '');
    });

    conteneur.appendChild(el('p.aide', {
      texte: 'Vos préparations ne vivent que sur cet appareil. Le fichier exporté contient tout, photos comprises, et se restaure sur n’importe quel téléphone.'
    }));

    // Safari n'autorise navigator.share() que dans la foulée immédiate d'une
    // pression. On prépare donc le fichier dès l'ouverture de cet écran, pour
    // que le bouton n'ait plus rien à attendre au moment du geste.
    let fichierPret = null;
    const preparation = Store.exporter().then(donnees => {
      const contenu = JSON.stringify(donnees, null, 2);
      const nom = 'vox-' + new Date().toISOString().slice(0, 10) + '.json';
      fichierPret = { contenu, nom, fichier: new File([contenu], nom, { type: 'application/json' }) };
      return fichierPret;
    }).catch(() => null);

    function marquerFait() {
      return Store.reglages.definir('derniereSauvegarde', Store.maintenant())
        .then(() => Store.etatSauvegarde())
        .then(etat => {
          etatLigne.textContent = decrireSauvegarde(etat);
          etatLigne.className = 'aide';
        });
    }

    function telecharger(pret) {
      const lien = el('a', {
        href: URL.createObjectURL(new Blob([pret.contenu], { type: 'application/json' })),
        download: pret.nom
      });
      document.body.appendChild(lien);
      lien.click();
      document.body.removeChild(lien);
      setTimeout(() => URL.revokeObjectURL(lien.href), 4000);
      return marquerFait().then(() => UI.annoncer('Sauvegarde enregistrée'));
    }

    conteneur.appendChild(el('button.bouton.bouton--plein.bouton--large', {
      type: 'button',
      onclick: () => {
        const lancer = pret => {
          if (!pret) {
            UI.annoncer('Sauvegarde impossible à préparer', 'erreur');
            return;
          }
          if (navigator.canShare && navigator.canShare({ files: [pret.fichier] })) {
            navigator.share({ files: [pret.fichier], title: 'Sauvegarde Vox' })
              .then(marquerFait)
              .catch(erreur => {
                // L'utilisateur a fermé la feuille : ce n'est pas un échec.
                if (erreur && erreur.name === 'AbortError') return;
                telecharger(pret);
              });
            return;
          }
          telecharger(pret);
        };
        // Prêt dans l'immense majorité des cas ; sinon on attend, quitte à
        // retomber sur le téléchargement si le geste a expiré entre-temps.
        if (fichierPret) lancer(fichierPret);
        else preparation.then(lancer);
      }
    }, [icone('envoyer'), 'Sauvegarder…']));

    conteneur.appendChild(el('p.aide', {
      texte: 'Choisissez Dropbox, iCloud Drive, Fichiers, Mail — la destination que vous voulez. Gardez le même endroit à chaque fois.'
    }));

    const choixFichier = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    choixFichier.addEventListener('change', () => {
      const fichier = choixFichier.files && choixFichier.files[0];
      if (!fichier) return;
      fichier.text()
        .then(texte => JSON.parse(texte))
        .then(donnees => UI.confirmer(
          'Restaurer cette sauvegarde ?',
          'Le contenu actuel sera remplacé par celui du fichier.',
          'Restaurer'
        ).then(oui => (oui ? Store.importer(donnees, true) : null)))
        .then(bilan => {
          if (!bilan) return;
          UI.annoncer(bilan.themes + ' thèmes restaurés');
          location.hash = '#/';
          Routeur.rafraichir();
        })
        .catch(erreur => UI.annoncer(erreur.message || 'Fichier illisible', 'erreur'))
        .then(() => { choixFichier.value = ''; });
    });
    conteneur.appendChild(choixFichier);
    conteneur.appendChild(el('button.bouton.bouton--discret.bouton--large', {
      type: 'button', onclick: () => choixFichier.click()
    }, [icone('televerser'), 'Restaurer une sauvegarde']));

    conteneur.appendChild(el('p.aide', {
      texte: 'Le sélecteur de fichiers d’iOS sait aller chercher dans Dropbox et iCloud Drive, si ces applications sont installées.'
    }));

    conteneur.appendChild(el('p.colophon', {
      texte: 'Vox — préparer en silence ce qui sera dit à voix haute.'
    }));

    /* — numéro de version, pour suivre les mises à jour — */
    const ligneVersion = el('p.version', { texte: 'Version…' });
    const ligneAttente = el('p.version.version--attente', { hidden: true });
    conteneur.appendChild(ligneVersion);
    conteneur.appendChild(ligneAttente);
    Version.lire().then(({ enCours, enAttente }) => {
      ligneVersion.textContent = enCours ? decrireVersion(enCours) : 'Version inconnue';
      if (enAttente) {
        ligneAttente.textContent = 'Nouvelle version téléchargée (' + decrireVersion(enAttente) +
          ') : fermez complètement Vox et rouvrez-la pour l’utiliser.';
        ligneAttente.hidden = false;
      }
    });

    return Promise.resolve();
  }

  function decrireVersion(v) {
    const morceaux = ['Version ' + v.version];
    const m = String(v.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const jour = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      morceaux.push(jour.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
    }
    return morceaux.join(' · ');
  }

  return { accueil, domaine, theme, editeur, recherche, reglages, importer,
           partagerThemes, basculerImmersion };
})();
