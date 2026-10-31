const CACHE = 'ahure-v204';
const ASSETS = ['./', './index.html', './manifest.json', './Idle.png', './world.png', './danger.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // 1) API istekleri: service worker'a HİÇ dokundurma
  //    (chat, tts, set-api-key, health — proxy üzerinden gelen her şey)
  if (
    url.pathname.endsWith('/chat') ||
    url.pathname.endsWith('/tts') ||
    url.pathname.endsWith('/set-api-key') ||
    url.pathname.endsWith('/health') ||
    url.hostname.includes('groq.com')
  ) {
    return; // SW devre dışı → tarayıcı normal fetch yapar
  }

  // 2) HTML ve SW: network-first
  const isDoc = req.mode === 'navigate' ||
                req.destination === 'document' ||
                url.pathname.endsWith('.html') ||
                url.pathname.endsWith('sw.js');

  if (isDoc) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 3) Diğerleri (resim, manifest): cache-first
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => cached)
    )
  );
});
