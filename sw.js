/**
 * Service Worker — Offline caching for PWA
 */
const CACHE_NAME = 'mafia-god-v33';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/models/Game.js',
  './js/models/Player.js',
  './js/models/Roles.js',
  './js/models/Role.js',
  './js/models/Enums.js',
  './js/models/Shield.js',
  './js/models/Curse.js',
  './js/models/Bomb.js',
  './js/models/Framason.js',
  './js/models/BulletManager.js',
  './js/views/BaseView.js',
  './js/views/HomeView.js',
  './js/views/SetupView.js',
  './js/views/RoleRevealView.js',
  './js/views/NightView.js',
  './js/views/DayView.js',
  './js/views/SummaryView.js',
  './js/utils/Storage.js',
  './js/utils/Timer.js',
  './js/utils/Settings.js',
  './js/utils/i18n.js',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './manifest.json',
];

// Install — cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache first, then network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
      .catch(() => {
        // Offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
