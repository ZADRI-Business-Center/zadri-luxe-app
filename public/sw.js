/* =============================================================================
   ZADRI Luxe App — Service Worker PWA (§11)
   Mise en cache du shell (interface), démarrage instantané, détection offline.
   IMPORTANT : Les requêtes d'API (Supabase, Cloudinary) sont strictly Network-Only.
   =========================================================================== */

const CACHE_NAME = 'zadri-luxe-shell-v1';

// Fichiers du shell essentiels pré-mis en cache à l'installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest'
];

// Installation : pré-chargement du shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // 2. Strictement Network-Only pour Supabase, Cloudinary et les APIs
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('cloudinary.com') ||
    url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/auth/v1/')
  ) {
    return; // Laisser passer directement sur le réseau
  }

  // 3. Pour les navigations (changement de page HTML dans la SPA)
  // Stratégie : Network First avec repli immédiat sur /index.html en cache si hors connexion
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 4. Pour les assets statiques compilés (JS/CSS Vite, images, icônes, fonts)
  // Stratégie : Cache First avec mise en cache dynamique et mise à jour en tâche de fond
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') ||
     url.pathname.endsWith('.svg') ||
     url.pathname.endsWith('.png') ||
     url.pathname.endsWith('.woff2'))
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Mise à jour discrète en tâche de fond (stale-while-revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {/* Pas de réseau : normal */});
          return cachedResponse;
        }

        // Pas en cache : chercher sur le réseau et sauvegarder dans le cache
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. Par défaut : réseau standard
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

