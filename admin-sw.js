// این سرویس‌ورکر جدا و سبکه، فقط برای پنل مدیریت — عمداً هیچی مشترک با sw.js
// (سرویس‌ورکر سایت رزرو مشتری) نداره، تا گوشی این دو تا رو دو اپ کاملاً جدا ببینه.
const ADMIN_CACHE = 'admin-panel-v1';
const SHELL = ['admin.html', 'style.css', 'admin.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(ADMIN_CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== ADMIN_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(ADMIN_CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
