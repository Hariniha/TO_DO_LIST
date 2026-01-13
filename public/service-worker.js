// Service Worker for push notifications and background sync
const CACHE_NAME = 'daily-todo-v1';
const DB_NAME = 'daily-todo-notifications';
const DB_VERSION = 1;
const STORE_NAME = 'notification-schedule';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.svg',
  '/favicon.svg',
  '/manifest.json'
];

// Open IndexedDB for persistent storage
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

// Save data to IndexedDB
async function saveToIndexedDB(key, value) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.put({ key, value });
    console.log('Saved to IndexedDB:', key);
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
  }
}

// Get data from IndexedDB
async function getFromIndexedDB(key) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error reading from IndexedDB:', error);
    return null;
  }
}

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
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

// Check for due notifications from IndexedDB
async function checkAndFireNotifications() {
  try {
    const schedule = await getFromIndexedDB('schedule');
    const username = await getFromIndexedDB('username');
    const firedNotifications = await getFromIndexedDB('firedNotifications') || {};
    
    if (!schedule || schedule.length === 0) {
      console.log('No notification schedule found');
      return;
    }
    
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const newFiredNotifications = {};
    
    console.log('Checking notifications...', schedule.length, 'items');
    
    for (const item of schedule) {
      const notificationKey = `${item.id}-${today}`;
      
      // Skip if already fired today
      if (firedNotifications[notificationKey]) {
        console.log('Notification already fired:', item.id);
        continue;
      }
      
      const timeDiff = now - item.time;
      
      // Fire notification if it's due (within 5 minutes past, not future)
      if (timeDiff >= 0 && timeDiff <= 300000) {
        const greeting = username ? `Hyyy ${username}! ` : '';
        const body = item.body.includes('Hyyy') || item.body.includes('Hey') ? item.body : greeting + item.body;
        
        console.log('Firing notification:', item.title, 'Time diff:', timeDiff);
        
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
        
        // Mark as fired
        newFiredNotifications[notificationKey] = now;
        console.log('Fired notification:', item.title);
      }
    }
    
    // Update fired notifications in IndexedDB
    if (Object.keys(newFiredNotifications).length > 0) {
      const updatedFiredNotifications = { ...firedNotifications, ...newFiredNotifications };
      
    console.log('Periodic sync triggered');
    event.waitUntil(checkAndFireNotifications());
  }
});

// Use alarms API for scheduled notifications (Chrome extension API - not available in service workers)
// Instead, we'll rely on the app to send wake-up messages

// Background Fetch API for keeping service worker alive
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-notifications') {
    console.log('Sync event triggered');
      // Clean up old entries (older than 2 days)
      const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
      Object.keys(updatedFiredNotifications).forEach(key => {
        if (updatedFiredNotifications[key] < twoDaysAgo) {
          delete updatedFiredNotifications[key];
        }
      });
      
      await saveToIndexedDB('firedNotifications', updatedFiredNotifications);
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
    
    console.log('Received notification schedule:', schedule.length, 'items');
    
    // Save to IndexedDB for persistent storage
    await saveToIndexedDB('schedule', schedule);
    await saveToIndexedDB('username', username);
    
    // Check immediately for any due notifications
    await checkAndFireNotifications();
  } else if (event.data && event.data.type === 'CHECK_NOTIFICATIONS') {
    // Manual trigger from app
    await checkAndFireNotifications();
  }
});

// Register for periodic background sync if available (limited browser support)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkAndFireNotifications());
  }
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();
            
            // Cache successful responses for offline use
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Network failed, try to return a cached fallback
            return caches.match('/index.html');
          });
      })
  );
});