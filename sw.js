/*
 * Vox — service worker.
 * L'application doit s'ouvrir sans réseau : dans une salle, chez quelqu'un,
 * en sous-sol. Tout le nécessaire est mis en cache à l'installation.
 */

// Le numéro de version, affiché en bas des Réglages. À augmenter à chaque
// mise en ligne : c'est aussi ce qui déclenche la mise à jour des téléphones.
const VERSION = '16';
const DATE_VERSION = '2026-10-03';

const CACHE = 'vox-v' + VERSION;

const COQUILLE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/bible.js',
  './js/store.js',
  './js/seed.js',
  './js/partage.js',
  './js/ui.js',
  './js/mise-en-page.js',
  './js/documents.js',
  './js/lecteur-pdf.js',
  './js/vues.js',
  './js/app.js',
  './assets/icone.svg',
  './assets/icone-180.png',
  './assets/icone-192.png',
  './assets/icone-512.png',
  // Lecteur de PDF pour iPhone et Android : disponible même hors ligne.
  './assets/pdfjs/pdf.min.mjs',
  './assets/pdfjs/pdf.worker.min.mjs'
];

self.addEventListener('install', evenement => {
  evenement.waitUntil(
    // `reload` contourne le cache HTTP du navigateur : GitHub Pages autorise
    // dix minutes de cache, et sans cela une version neuve pourrait garder
    // les anciens fichiers.
    caches.open(CACHE)
      .then(cache => cache.addAll(COQUILLE.map(chemin => new Request(chemin, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evenement => {
  evenement.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Les Réglages demandent quelle version est réellement installée.
self.addEventListener('message', evenement => {
  if (evenement.data === 'version' && evenement.ports[0]) {
    evenement.ports[0].postMessage({ version: VERSION, date: DATE_VERSION });
  }
});

self.addEventListener('fetch', evenement => {
  const requete = evenement.request;
  if (requete.method !== 'GET') return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  // Réseau d'abord pour la page elle-même (pour recevoir les mises à jour),
  // cache d'abord pour le reste (démarrage instantané).
  if (requete.mode === 'navigate') {
    evenement.respondWith(
      fetch(requete)
        .then(reponse => {
          const copie = reponse.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copie));
          return reponse;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  evenement.respondWith(
    caches.match(requete).then(enCache => {
      if (enCache) return enCache;
      return fetch(requete).then(reponse => {
        if (reponse && reponse.status === 200 && reponse.type === 'basic') {
          const copie = reponse.clone();
          caches.open(CACHE).then(cache => cache.put(requete, copie));
        }
        return reponse;
      });
    })
  );
});
