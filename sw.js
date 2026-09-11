/*
 * Vox — service worker.
 * L'application doit s'ouvrir sans réseau : dans une salle, chez quelqu'un,
 * en sous-sol. Tout le nécessaire est mis en cache à l'installation.
 */

const CACHE = 'vox-v4';

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
  './js/vues.js',
  './js/app.js',
  './assets/icone.svg',
  './assets/icone-180.png',
  './assets/icone-192.png',
  './assets/icone-512.png'
];

self.addEventListener('install', evenement => {
  evenement.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(COQUILLE))
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
