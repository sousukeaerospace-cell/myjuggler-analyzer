// Service Worker - オフライン対応 PWA
const CACHE_NAME = "myjuggler-v1";
const STATIC_ASSETS = ["/", "/manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  // ナビゲーションリクエスト: ネットワーク優先 → キャッシュフォールバック
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/")),
    );
    return;
  }

  // 静的アセット: キャッシュ優先
  event.respondWith(
    caches.match(event.request).then(
      cached => cached ?? fetch(event.request),
    ),
  );
});
