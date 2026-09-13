importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.1/workbox-sw.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDUMMYKEYFORPUBLICKeypressThemeTemplate1234",
  authDomain: "keypress-theme-push.firebaseapp.com",
  projectId: "keypress-theme-push",
  storageBucket: "keypress-theme-push.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

try {
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload.data?.title || payload.notification?.title || "New Tech Update";
      let pushActions = [];
      try {
        pushActions = JSON.parse(payload.data?.actions || '[]');
      } catch (e) { }

      const options = {
        body: payload.data?.body || payload.notification?.body || "",
        icon: payload.data?.icon || payload.notification?.icon || '/icon.png',
        image: payload.data?.image || payload.notification?.image,
        badge: '/badge.png',
        tag: 'kp-push',
        renotify: true,
        actions: pushActions,
        data: {
          url: payload.data?.click_action || payload.fcmOptions?.link || self.location.origin
        }
      };

      return self.registration.showNotification(title, options);
    });
  }
} catch (err) {
  console.info('[Push Notification Demo] Firebase push notification service worker initialized in demonstration mode with dummy credentials.');
}

const CURRENT_CACHE_VERSION = 'v1';

if (workbox) {
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  if (workbox.navigationPreload) {
    workbox.navigationPreload.enable();
  }

  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'kp-pages-' + CURRENT_CACHE_VERSION,
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 24 * 60 * 60
        })
      ]
    })
  );

  workbox.routing.registerRoute(
    ({ url, request }) => {
      if (request.destination !== 'image') return false;
      const baseDomain = self.location.hostname.replace('www.', '');
      return url.host.includes(baseDomain);
    },
    new workbox.strategies.CacheFirst({
      cacheName: 'kp-images-' + CURRENT_CACHE_VERSION,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true
        })
      ]
    })
  );

  workbox.routing.registerRoute(
    ({ url, request }) => {
      const isStaticAsset = request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'font';
      const isAllowedDomain = url.host.includes(self.location.hostname) ||
        url.host.includes('www.gstatic.com');
      return isStaticAsset && isAllowedDomain;
    },
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'kp-static-' + CURRENT_CACHE_VERSION,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60
        })
      ]
    })
  );

  const OFFLINE_URL = '/offline.html';
  workbox.precaching.precacheAndRoute([
    { url: OFFLINE_URL, revision: CURRENT_CACHE_VERSION }
  ]);

  workbox.routing.setCatchHandler(async ({ event }) => {
    if (event.request.destination === 'document') {
      return workbox.precaching.matchPrecache(OFFLINE_URL);
    }
    return Response.error();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            const isOldLegacyCache = name === 'images-cache' || name === 'static-resources' || name === 'pages-cache';
            const isOurOldVersionedCache = name.startsWith('kp-') && !name.endsWith(CURRENT_CACHE_VERSION);
            if (isOldLegacyCache || isOurOldVersionedCache) {
              return caches.delete(name);
            }
          })
        );
      })
    );
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
