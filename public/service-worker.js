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
      }),
      // Start checking for notifications
      checkAndFireNotifications()
    ])
  );
  
  // Set up periodic check for notifications (every minute)
  setInterval(() => {
    checkAndFireNotifications();
  }, 60000); // Check every minute
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
// Function to check localStorage for due notifications
async function checkAndFireNotifications() {
  try {
    // Get schedule from localStorage via clients
    const clients = await self.clients.matchAll();
    if (clients.length === 0) {
      // No clients, but we can still access IndexedDB or use a different approach
      // For now, we'll use periodic background sync when available
      return;
    }
    
    // Request schedule from active client
    for (const client of clients) {
      client.postMessage({ type: 'GET_NOTIFICATION_SCHEDULE' });
    }
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}

// Listen for messages from the app with notification schedule
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'NOTIFICATION_SCHEDULE') {
    const schedule = event.data.schedule || [];
    const username = event.data.username || '';
    const now = Date.now();
    
    console.log('Received notification schedule:', schedule.length, 'items');
    
    // Check if any notifications are due (within the last 2 minutes to catch missed ones)
    for (const item of schedule) {
      const timeDiff = now - item.time;
      
      // Fire notification if it's due (within 2 minutes past or 1 minute future)
      if (timeDiff >= -60000 && timeDiff <= 120000) {
        const greeting = username ? `Hyyy ${username}! ` : '';
        const body = item.body.includes('Hyyy') || item.body.includes('Hey') ? item.body : greeting + item.body;
        
        await self.registration.showNotification(item.title, {
          body: body,
          icon: '/logo.svg',
          badge: '/favicon.svg',
          vibrate: [200, 100, 200, 100, 200],
          tag: item.id,
          requireInteraction: false,
          silent: false,
          data: item,
        });
        
        console.log('Fired notification:', item.title);
      }
    }
  }
});

// Register for periodic background sync if available (limited browser support)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkAndFireNotifications());
  }
});