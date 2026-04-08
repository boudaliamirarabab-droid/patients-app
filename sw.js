const CACHE_NAME = 'patients-v3';
const FILES = [
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const localFiles = FILES.filter(f => f.startsWith('./'));
      const cdnFiles   = FILES.filter(f => !f.startsWith('./'));
      return cache.addAll(localFiles).then(() =>
        Promise.allSettled(cdnFiles.map(url =>
          fetch(url).then(res => {
            if(res.ok) cache.put(url, res);
          }).catch(() => {})
        ))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Firebase و Google APIs — نتركهم يمشيو للنت دايماً
  const url = e.request.url;
  if(url.includes('firestore.googleapis.com') ||
     url.includes('firebase.googleapis.com') ||
     url.includes('gstatic.com/firebasejs')){
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res && res.ok && res.type !== 'opaque'){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
