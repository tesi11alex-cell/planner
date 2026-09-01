const CACHE_PREFIX = 'planner-offline-';
const CACHE_NAME = 'planner-offline-v20-giorno-espanso';

const PATCH_CSS = './planner-v20.css';
const PATCH_JS = './planner-v20.js';

const APP_SHELL = [
  './',
  './index.html',
  './Agenda.html',
  './manifest-v10.webmanifest',
  PATCH_CSS,
  PATCH_JS,
  './agenda-icon-180-v10.png',
  './agenda-icon-192-v10.png',
  './agenda-icon-512-v10.png'
];

const FIREBASE_SDK = [
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore-compat.js'
];

function injectPatchText(html){
  if(html.includes('planner-v20.css') || html.includes('planner-v20.js')){
    return html;
  }

  const cssTag = '<link rel="stylesheet" href="./planner-v20.css?v=20">';
  const jsTag = '<script src="./planner-v20.js?v=20"><\\/script>';

  if(html.includes('</head>')){
    html = html.replace('</head>', cssTag + '\n</head>');
  }else{
    html = cssTag + '\n' + html;
  }

  if(html.includes('</body>')){
    html = html.replace('</body>', jsTag + '\n</body>');
  }else{
    html += '\n' + jsTag;
  }

  return html;
}

async function patchResponse(response){
  const contentType = response.headers.get('content-type') || '';
  if(!contentType.includes('text/html')) return response;

  const html = injectPatchText(await response.text());
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');

  return new Response(html,{
    status:response.status,
    statusText:response.statusText,
    headers
  });
}

async function patchCachedHTML(cache,path){
  const response = await cache.match(path,{ignoreSearch:true});
  if(!response) return;

  const patched = await patchResponse(response);
  await cache.put(path,patched.clone());
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await cache.addAll(APP_SHELL);

    await Promise.all([
      patchCachedHTML(cache,'./index.html'),
      patchCachedHTML(cache,'./Agenda.html'),
      patchCachedHTML(cache,'./')
    ]);

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
    if(!response || !response.ok) return response;

    const patched = await patchResponse(response);
    await cache.put(request,patched.clone());
    return patched;

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

  const isAppAsset = url.origin === self.location.origin;
  const isStaticRemote =
    url.hostname === 'www.gstatic.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  if(isAppAsset || isStaticRemote){
    event.respondWith(cacheFirst(request));
  }
});