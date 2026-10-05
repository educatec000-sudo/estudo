/* Arena Estudos ALEPA — service worker
   Deixa o app instalável e funcionando offline depois da primeira visita. */
const CACHE = 'alepa-estudos-v2';
const ESSENCIAIS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;                    // nunca cacheia POST (IA/sincronização)
  if (url.pathname.includes('/api/')) return;                // deixa o servidor local responder
  if (url.hostname.endsWith('huggingface.co')) return;       // IA sempre online
  /* rede primeiro para o app (pega atualizações), cache como reserva offline */
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.ok && url.origin === location.origin) {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => { });
      }
      return r;
    }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
  );
});
