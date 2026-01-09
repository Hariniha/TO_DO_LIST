// Service Worker for push notifications and background sync
const CACHE_NAME = 'daily-todo-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();
  
  // Focus or open the app window
  event.waitUntil(
    self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      console.log('Found clients:', clientList.length);
      
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === self.registration.scope && 'focus' in client) {
          console.log('Focusing existing client');
          return client.focus();
        }
      }
      
      // Otherwise open a new window
      if (self.clients.openWindow) {
        console.log('Opening new window');
        return self.clients.openWindow('/');
      }
    }).catch(err => {
      console.error('Error handling notification click:', err);
    })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Daily Todo';
  const options = {
    body: data.body || 'You have pending tasks!',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'daily-todo-' + Date.now(),
    requireInteraction: false,
    silent: false,
    data: data,
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});
