self.addEventListener('push', function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/web-app-manifest-512x512.png',
    badge: '/favicon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard'
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  const tasks = [self.registration.showNotification(data.title, options)];

  if (typeof navigator.setAppBadge === 'function' && data.badgeCount != null) {
    tasks.push(navigator.setAppBadge(data.badgeCount));
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/dashboard';

  event.waitUntil(
    Promise.all([
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      }),
      typeof navigator.clearAppBadge === 'function' ? navigator.clearAppBadge() : Promise.resolve()
    ])
  );
});
