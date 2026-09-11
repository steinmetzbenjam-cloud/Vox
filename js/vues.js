/*
 * Vox — les écrans.
 * Accueil → domaine → thème (lecture plein écran) → éditeur.
 */
const Vues = (() => {

  const el = UI.el;
  const icone = UI.icone;

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
    return el('header.entete', null, [
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

  function texteEnrichi(texte, classeParagraphe) {
    const fragment = document.createDocumentFragment();
    for (const bloc of String(texte || '').split(/\n{2,}/)) {
      if (!bloc.trim()) continue;
      const p = el('p.' + (classeParagraphe || 'para'));
      const lignes = bloc.split('\n');
      lignes.forEach((ligne, index) => {
        if (index) p.appendChild(el('br'));
        semerLiens(p, ligne);
      });
      fragment.appendChild(p);
    }
    return fragment;
  }

  function vide(message, action) {
    return el('div.vide', null, [
      el('p.vide__texte', { texte: message }),
      action || null
    ]);
  }

  /* =====================================================================
   *  Accueil — les domaines
   * ===================================================================== */

  function accueil(conteneur) {
    return Promise.all([Store.domaines.tous(), Store.themes.tous()]).then(([domaines, themes]) => {
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
            liste.appendChild(el('div.fiche', null, [
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
            ]));
          }
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
            blocs: []
          }).then(t => { location.hash = '#/t/' + t.id + '/modifier'; })
        }, [icone('plus'), 'Nouveau thème']));
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
          boutonAction('crayon', 'Modifier', () => { location.hash = '#/t/' + id + '/modifier'; })
        ]
      }));

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

      for (const bloc of (leTheme.blocs || [])) {
        lecture.appendChild(rendreBloc(bloc));
      }

      conteneur.appendChild(lecture);

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
      return boite;
    }

    if (bloc.type === 'note') {
      const boite = el('aside.apparte', null, [icone('note', 'ic--apparte')]);
      boite.appendChild(texteEnrichi(bloc.texte, 'apparte__texte'));
      return boite;
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

    if (bloc.type === 'image') {
      const figure = el('figure.figure');
      const image = el('img.figure__image', { alt: bloc.legende || 'Photo du texte' });
      Photos.attacher(image, bloc.imageId);
      image.addEventListener('click', () => agrandirPhoto(bloc));
      figure.appendChild(image);
      if (bloc.legende) figure.appendChild(el('figcaption.figure__legende', { texte: bloc.legende }));
      return figure;
    }

    const boite = el('div.paragraphe');
    boite.appendChild(texteEnrichi(bloc.texte, 'para'));
    return boite;
  }

  function agrandirPhoto(bloc) {
    const image = el('img.loupe__image', { alt: bloc.legende || '' });
    Photos.attacher(image, bloc.imageId);
    const panneau = UI.ouvrirModale([
      el('button.loupe__fermer', { type: 'button', 'aria-label': 'Fermer', onclick: UI.fermerModale }, [icone('croix')]),
      image
    ]);
    panneau.classList.add('modale__panneau--loupe');
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
    { type: 'note',     libelle: 'Aparté',    glyphe: 'note' }
  ];

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
        temoin.textContent = '…';
        minuterie = setTimeout(() => {
          Store.themes.enregistrer(brouillon).then(() => {
            temoin.textContent = 'Enregistré';
            setTimeout(() => { temoin.textContent = ''; }, 1800);
          });
        }, 500);
      }

      conteneur.appendChild(entete({
        retour: () => {
          clearTimeout(minuterie);
          Store.themes.enregistrer(brouillon).then(() => { location.hash = '#/t/' + id; });
        },
        titre: 'Préparation',
        actions: [
          temoin,
          boutonAction('check', 'Terminé', () => {
            clearTimeout(minuterie);
            Store.themes.enregistrer(brouillon).then(() => { location.hash = '#/t/' + id; });
          })
        ]
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
        const bloc = brouillon.blocs[index];
        const suite = bloc.type === 'image' && bloc.imageId
          ? Store.images.supprimer(bloc.imageId)
          : Promise.resolve();
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
          if (bloc.imageId) {
            const image = el('img', { alt: '' });
            Photos.attacher(image, bloc.imageId);
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
          corps.appendChild(zoneTexte(bloc.legende, 'Légende (facultatif)', v => {
            bloc.legende = v;
            enregistrer();
          }));

        } else {
          const reperes = {
            question: 'L’objection ou la question posée',
            note: 'Un rappel pour vous-même',
            texte: 'Le raisonnement. Les références écrites ici deviennent cliquables.'
          };
          corps.appendChild(zoneTexte(bloc.texte, reperes[bloc.type] || reperes.texte, v => {
            bloc.texte = v;
            enregistrer();
          }));
        }

        return el('section.bloc', null, [
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
          'La préparation et ses photos seront perdues.'
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
          morceaux.push(bloc.texte || '', bloc.reference || '', bloc.idee || '', bloc.legende || '');
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
    conteneur.appendChild(el('p.aide', {
      texte: 'Vos préparations ne sont enregistrées que sur cet appareil. Exportez-les de temps en temps : le fichier obtenu se restaure sur n’importe quel téléphone.'
    }));

    conteneur.appendChild(el('button.bouton.bouton--plein.bouton--large', {
      type: 'button',
      onclick: () => Store.exporter().then(donnees => {
        const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' });
        const lien = el('a', {
          href: URL.createObjectURL(blob),
          download: 'vox-' + new Date().toISOString().slice(0, 10) + '.json'
        });
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
        setTimeout(() => URL.revokeObjectURL(lien.href), 4000);
        UI.annoncer('Sauvegarde exportée');
      })
    }, [icone('telecharger'), 'Exporter une sauvegarde']));

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

    conteneur.appendChild(el('p.colophon', {
      texte: 'Vox — préparer en silence ce qui sera dit à voix haute.'
    }));

    return Promise.resolve();
  }

  return { accueil, domaine, theme, editeur, recherche, reglages, basculerImmersion };
})();
