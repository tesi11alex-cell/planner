const CACHE_PREFIX = 'planner-offline-';
const CACHE_NAME = 'planner-offline-v28-orari-3h';

const APP_SHELL = [
  './',
  './index.html',
  './Agenda.html',
  './manifest-v10.webmanifest',
  './planner-v28.css',
  './planner-v28.js',
  './agenda-icon-180-v10.png',
  './agenda-icon-192-v10.png',
  './agenda-icon-512-v10.png'
];

const FIREBASE_SDK = [
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore-compat.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);

    await Promise.allSettled(
      FIREBASE_SDK.map(url =>
        cache.add(new Request(url,{mode:'no-cors'}))
      )
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();

    await Promise.all(
      names
        .filter(name =>
          name.startsWith(CACHE_PREFIX) &&
          name !== CACHE_NAME
        )
        .map(name => caches.delete(name))
    );

    await self.clients.claim();
  })());
});

async function networkFirstNavigation(request){
  const cache = await caches.open(CACHE_NAME);

  try{
    const response = await fetch(request,{cache:'no-store'});
    if(response && response.ok){
      await cache.put(request,response.clone());
    }
    return response;
  }catch(error){
    return (
      await cache.match(request,{ignoreSearch:true})
    ) || (
      await cache.match('./index.html')
    ) || (
      await cache.match('./Agenda.html')
    ) || (
      await cache.match('./')
    );
  }
}

async function cacheFirst(request){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request,{ignoreSearch:true});
  if(cached) return cached;

  const response = await fetch(request);
  if(response){
    await cache.put(request,response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;

  if(request.mode === 'navigate'){
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const staticRemote =
    url.hostname === 'www.gstatic.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  if(sameOrigin || staticRemote){
    event.respondWith(cacheFirst(request));
  }
});
