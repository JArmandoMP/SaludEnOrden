// SaludEnOrden · Service Worker (caché offline)
const CACHE = 'saludenorden-v0.13.2.2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/js/core.js',
  './assets/js/data.js',
  './assets/js/forms.js',
  './assets/js/views.js',
  './assets/js/report.js',
  './assets/js/app.js',
  './assets/img/favicon.svg',
  './assets/img/logo-mark.svg',
  './assets/img/fondo-salud.svg',
  './assets/img/hero.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // Navegación (el documento HTML): primero la red, para que cada arranque
  // tome la versión nueva de la app; el caché es solo respaldo sin conexión.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', clone); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (m) { return m || caches.match('./'); });
      })
    );
    return;
  }
  // Resto de archivos (con ?v= de versión en la URL): primero el caché.
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (res) {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        var clone = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
