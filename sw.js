/* Choque Estelar: service worker del sitio (generado por build_web.py; no editar a mano). */
'use strict';
const VERSION = 'd64c1576f8fb';
const PRECACHE = 'choque-estelar-app-' + VERSION;
const RUNTIME = 'choque-estelar-cdn-v1';   // librerías con versión fija en la URL: se conservan entre versiones
const PRECACHE_URLS = [
  "./",
  "./en/",
  "./jugar/",
  "./404.html",
  "./favicon.ico",
  "./manifest.webmanifest",
  "./privacidad.html",
  "./img/logo-800.webp",
  "./img/tactil-600.webp",
  "./img/trailer-poster.webp",
  "./img/f/aura-256.webp",
  "./img/f/aura-400.webp",
  "./img/f/brasa-256.webp",
  "./img/f/brisa-256.webp",
  "./img/f/coral-256.webp",
  "./img/f/glacia-256.webp",
  "./img/f/glacia-400.webp",
  "./img/f/kiri-256.webp",
  "./img/f/magno-256.webp",
  "./img/f/magno-400.webp",
  "./img/f/mimo-256.webp",
  "./img/f/nova-256.webp",
  "./img/f/nova-400.webp",
  "./img/f/orbe-256.webp",
  "./img/f/quilla-256.webp",
  "./img/f/romero-256.webp",
  "./img/f/titan-256.webp",
  "./img/f/torque-256.webp",
  "./img/f/umbra-256.webp",
  "./img/f/umbra-400.webp",
  "./img/f/voltio-256.webp",
  "./img/s/clasificatoria-640.webp",
  "./img/s/combate-640.webp",
  "./img/s/fiesta-640.webp",
  "./img/s/pase-640.webp",
  "./img/s/sala-online-640.webp",
  "./img/s/seleccion-640.webp",
  "./img/s/tutorial-640.webp",
  "./icons/apple-touch-icon-180.png",
  "./icons/favicon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-96.png"
];
const CDN_WARM = [
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/OutputPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/shaders/FXAAShader.js"
];
const CDN_RULES = [["cdn.jsdelivr.net", "/npm/three@0.160.0/"], ["cdn.jsdelivr.net", "/npm/peerjs@1.5.4/"], ["fonts.googleapis.com", "/"], ["fonts.gstatic.com", "/"]];
const OPAQUE_OK = ['fonts.googleapis.com', 'fonts.gstatic.com']; // solo aquí se aceptan respuestas opacas
const MAX_RUNTIME = 80;
const BASE = new URL('./', self.location).pathname;  // raíz del sitio (funciona también en /repo/)

const cdnAllowed = (url) => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    return CDN_RULES.some(([h, p]) => u.hostname === h && u.pathname.startsWith(p));
  } catch (e) { return false; }
};
const cacheable = (url, res) => !!res && (res.ok || (res.type === 'opaque' && OPAQUE_OK.includes(new URL(url).hostname)));

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_RUNTIME; i++) await cache.delete(keys[i]);
}
async function warm(urls) {
  const cache = await caches.open(RUNTIME);
  await Promise.allSettled(urls.filter(cdnAllowed).map(async (url) => {
    if (await cache.match(url)) return;
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (cacheable(url, res)) await cache.put(url, res);
  }));
  await trim(cache);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    await cache.addAll(PRECACHE_URLS.map((u) => new Request(u, { cache: 'reload' })));
    try { await warm(CDN_WARM); } catch (e) { /* sin red: se guardarán al usarse */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('choque-estelar-') && n !== PRECACHE && n !== RUNTIME).map((n) => caches.delete(n)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (e) { /* */ } }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const d = event.data;
  if (d && d.type === 'warm' && Array.isArray(d.urls)) event.waitUntil(warm(d.urls.slice(0, 200).map(String)).catch(() => {}));
});

// /jugar/index.html → /jugar/ ; /en → /en/ (así coincide con la copia guardada)
function pageKey(url) {
  let p = url.pathname.replace(/index\.html$/, '');
  if (p === BASE + 'jugar' || p === BASE + 'en') p += '/';
  return url.origin + p;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Páginas: red primero (para recibir actualizaciones) y, sin conexión, la copia guardada.
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith((async () => {
      try {
        const pre = await event.preloadResponse;
        if (pre) return pre;
        return await fetch(req);
      } catch (e) {
        const cache = await caches.open(PRECACHE);
        return (await cache.match(pageKey(url), { ignoreSearch: true })) || (await cache.match(req, { ignoreSearch: true }))
          || (await cache.match(BASE + '404.html')) || Response.error();
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    // El vídeo (peticiones por rangos) va siempre a la red: no se guarda sin conexión.
    if (req.headers.has('range') || url.pathname.startsWith(BASE + 'media/')) return;
    event.respondWith((async () => {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      // imágenes en otro tamaño (srcset) e iconos: se guardan al usarse para verlas también sin conexión
      if (res.ok && (url.pathname.startsWith(BASE + 'img/') || url.pathname.startsWith(BASE + 'icons/'))) {
        const copy = res.clone();
        event.waitUntil(caches.open(PRECACHE).then((c) => c.put(req, copy)).catch(() => {}));
      }
      return res;
    })());
    return;
  }

  // three.js / addons / PeerJS (jsdelivr) y Google Fonts: caché primero, se guardan al usarse.
  if (cdnAllowed(req.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const hit = await cache.match(req, { ignoreVary: true }) || await cache.match(req.url, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (cacheable(req.url, res)) {
        const copy = res.clone();
        event.waitUntil(cache.put(req.url, copy).then(() => trim(cache)).catch(() => {}));
      }
      return res;
    })());
  }
  // Todo lo demás (señalización de PeerJS, etc.) va directo a la red.
});
