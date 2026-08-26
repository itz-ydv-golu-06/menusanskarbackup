/* ==============================================================
   sw.js — minimal service worker for the Staff Orders app.
   Purpose: satisfy PWA installability (required for the Android
   TWA wrapper) and let the admin dashboard shell load instantly
   on repeat opens. It does NOT do push notifications — the app's
   "new order" alerts come from the live Firestore listener in
   orders-admin.js while the app is open, via the Notification API.
   ============================================================== */

const CACHE_NAME = "sg-staff-shell-v1";
const SHELL_FILES = [
  "admin.html",
  "css/admin.css",
  "js/app.js",
  "js/storage.js",
  "js/firebase.js",
  "js/orders-admin.js",
  "js/admin.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for everything (this is a live dashboard — always prefer
// fresh data/JS), falling back to the cached shell only when offline.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
