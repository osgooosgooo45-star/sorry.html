/* Scorebook+ service worker — caches the app shell so it can be opened
   offline after the first successful visit. Uses a NETWORK-FIRST strategy:
   whenever the device is online, it always fetches the latest version from
   the server (so app updates apply immediately on next reload) and only
   falls back to the cached copy when the network is unavailable (true
   offline use). Bump CACHE_NAME whenever you want to force-clear old
   cached data on user devices. */
var CACHE_NAME = 'scorebookplus-cache-v2';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL).catch(function(){ /* ignore any file that fails to pre-cache */ });
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function(response){
      // Online: always use the fresh network response, and refresh the
      // cache with it so offline mode later serves the latest version too.
      if(response && response.status === 200 && response.type === 'basic'){
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, clone); });
      }
      return response;
    }).catch(function(){
      // Offline: fall back to whatever was last cached.
      return caches.match(event.request).then(function(cached){
        if(cached) return cached;
        if(event.request.mode === 'navigate'){
          return caches.match('./index.html');
        }
      });
    })
  );
});
