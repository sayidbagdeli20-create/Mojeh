// =====================================================================
// نوتیفیکیشن واقعی (Firebase) — این چندخط باید همینجا (توی همون sw.js اصلی)
// باشه، نه یه سرویس‌ورکر جدا، وگرنه با هم روی کل سایت تداخل پیدا می‌کنن.
// مقادیر زیر رو با همونایی که توی پنل مدیریت «برندینگ → تنظیمات Firebase»
// گذاشتی جایگزین کن (فقط یه‌بار لازمه).
// =====================================================================
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

try {
  firebase.initializeApp({
    apiKey: 'PASTE_FIREBASE_API_KEY_HERE',
    authDomain: 'PASTE_FIREBASE_AUTH_DOMAIN_HERE',
    projectId: 'PASTE_FIREBASE_PROJECT_ID_HERE',
    storageBucket: 'PASTE_FIREBASE_STORAGE_BUCKET_HERE',
    messagingSenderId: 'PASTE_FIREBASE_MESSAGING_SENDER_ID_HERE',
    appId: 'PASTE_FIREBASE_APP_ID_HERE',
  });
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'استودیو زیبایی';
    const body = payload.notification?.body || '';
    self.registration.showNotification(title, { body, icon: 'icon-192.png' });
  });
} catch (e) {
  // اگه هنوز مقادیر بالا رو پر نکردی، این بخش ساکت رد میشه و بقیه‌ی سایت (کش/آفلاین) عادی کار می‌کنه
}

const CACHE = 'lash-booking-v1';
const SHELL = ['index.html', 'result.html', 'style.css', 'app.js', 'manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// شبکه اول، برای API‌ها همیشه تازه بگیر؛ برای بقیه از کش به‌عنوان پشتیبان استفاده کن
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // درخواست به Apps Script را کش نکن

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
