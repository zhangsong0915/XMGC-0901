/* 工程项目管理 App · Service Worker
 * 离线缓存策略：页面导航 network-first（保证更新），静态资源 cache-first
 * 更新部署后请将 CACHE 版本号 +1，用户端即自动刷新 */
var CACHE = 'cpm-cache-v1';
var ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; /* 只处理同源请求 */

  if (req.mode === 'navigate') {
    /* 页面：优先网络（拿到更新），失败回退缓存 */
    e.respondWith(
      fetch(req).then(function (res) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (h) { return h || caches.match('./index.html'); });
      })
    );
    return;
  }
  /* 静态资源：缓存优先 */
  e.respondWith(
    caches.match(req).then(function (h) {
      if (h) return h;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var cp = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp); });
        }
        return res;
      });
    })
  );
});
