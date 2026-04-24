// Basic Service Worker for IoT Connect App - v2.6 (Stable)
self.addEventListener('push', function(event) {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { data: { title: 'Alert', body: 'New Update' } };
  }

  const title = payload?.notification?.title || payload?.data?.title || 'System Alert';
  const body = payload?.notification?.body || payload?.data?.body || 'Check your devices.';
  
  const options = {
    body: body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    tag: 'iot-alert-' + (payload?.data?.targetId || Date.now()),
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  // Set the App Badge if supported to show the counter on the Home Screen icon
  if ('setAppBadge' in navigator) {
    // @ts-ignore
    navigator.setAppBadge();
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // If the user clicked the 'Dismiss' button, do nothing else
  if (event.action === 'dismiss') {
    return;
  }

  // Otherwise, handle regular clicks (opening the app)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(
      self.registration.showNotification(event.data.title, event.data.options)
    );
  }
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
