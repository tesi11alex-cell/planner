const CACHE_NAME = 'planner-offline-v3';
const PATCH_SCRIPT = './planner-patch-v3.js';

const APP_SHELL = [
  './',
  './index.html',
  './Agenda.html',
  './manifest.webmanifest',
  './planner-icon-192.png',
  './planner-icon-512.png',
  PATCH_SCRIPT
];

const FIREBASE_SDK = [
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore-compat.js'
];

self.addEventListener('install', event=>{
  event.waitUntil((async ()=>{
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await Promise.allSettled(
      FIREBASE_SDK.map(url=>cache.add(new Request(url, {mode:'no-cors'})))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event=>{
  event.waitUntil((async ()=>{
    const names = await caches.keys();
    await Promise.all(names.filter(name=>name !== CACHE_NAME).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

async function injectPatch(response){
  if(!response) return response;

  const contentType = response.headers.get('content-type') || '';
  if(!contentType.includes('text/html')) return response;

  const text = await response.text();
  if(text.includes('planner-patch-v3.js')) {
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  const scriptTag = '<script src="./planner-patch-v3.js"></script>';
  const modified = text.includes('</body>')
    ? text.replace('</body>', `${scriptTag}\n</body>`)
    : `${text}\n${scriptTag}`;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');

  return new Response(modified, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function networkFirstNavigation(request){
  const cache = await caches.open(CACHE_NAME);

  try{
    const networkResponse = await fetch(request);
    if(networkResponse && networkResponse.ok){
      const injected = await injectPatch(networkResponse.clone());
      await cache.put('./index.html', injected.clone());
      return injected;
    }
    return networkResponse;
  }catch(error){
    const cached = (await cache.match('./index.html')) || (await cache.match('./'));
    return injectPatch(cached);
  }
}

async function cacheFirst(request){
  const cached = await caches.match(request, {ignoreSearch:true});
  if(cached) return cached;

  const response = await fetch(request);
  if(response){
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event=>{
  const request = event.request;
  if(request.method !== 'GET') return;

  if(request.mode === 'navigate'){
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  const url = new URL(request.url);
  const isAppAsset = url.origin === self.location.origin;
  const isStaticRemote =
    url.hostname === 'www.gstatic.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  if(isAppAsset || isStaticRemote){
    event.respondWith(cacheFirst(request));
  }
});
