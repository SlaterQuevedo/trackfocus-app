// Service Worker — Ariven
// Estrategia: cache-first para assets estáticos (JS, CSS, imágenes, fuentes).
// HTML siempre desde la red para garantizar versión más reciente.
// API calls (/api/, Supabase, Gemini) nunca interceptadas.
//
// IMPORTANTE: Actualizar CACHE_VERSION en cada deploy para invalidar caché.

const CACHE_VERSION = 'ariven-v29';

// Extensiones estáticas que se almacenan en caché
const STATIC_EXTS = /\.(js|css|svg|png|ico|webmanifest|woff|woff2|ttf)(\?.*)?$/;

// Assets críticos a pre-cachear en install (CSS y SVG del core)
const PRECACHE = [
  '/assets/styles.css',
  '/assets/styles-gamification.css',
  '/assets/styles-charts.css',
  '/assets/styles-multimedia.css',
  '/assets/logo.svg',
  '/js/youtube-recommender.js',
  '/js/institutions.js',
  '/js/storage.js',
  '/js/cloud.js',
  '/js/gamification.js',
  '/js/stats.js',
  '/js/roles.js',
  '/js/app.js',
  '/js/ui-legal.js',
];

// ── Install: pre-cachear assets críticos ──────────────────────────────────────

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: limpiar versiones antiguas ──────────────────────────────────────

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first para estáticos, network para el resto ──────────────────

self.addEventListener('fetch', e => {
  const req = e.request;

  // Solo interceptar GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Nunca interceptar requests cross-origin (Supabase, Gemini, Google Fonts CDN)
  if (url.origin !== location.origin) return;

  // Nunca interceptar serverless functions
  if (url.pathname.startsWith('/api/')) return;

  // Para assets estáticos: stale-while-revalidate
  // (respuesta inmediata desde caché; actualización en segundo plano)
  if (STATIC_EXTS.test(url.pathname)) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Todo lo demás (HTML): network-first para siempre tener el HTML más reciente
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(req);

  // Actualizar en segundo plano sin bloquear la respuesta
  const fetchPromise = fetch(req).then(response => {
    if (response && response.ok) {
      cache.put(req, response.clone());
    }
    return response;
  }).catch(() => null);

  // Devolver caché inmediatamente si existe, o esperar la red
  return cached || fetchPromise;
}
