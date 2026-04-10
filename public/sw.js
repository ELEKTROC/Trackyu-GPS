// TrackYu GPS - Service Worker for PWA & Push Notifications
// Version 5.0.0 - Force cache refresh - Feb 2026

const CACHE_NAME = 'trackyu-gps-v5';
const NOTIFICATION_ICON = '/icons/icon-192x192.png';

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Safe cache put - wraps cache.put in try/catch to avoid unhandled errors
const safeCachePut = async (cache, request, response) => {
  try {
    await cache.put(request, response);
  } catch (err) {
    // Silently ignore Cache.put errors (opaque responses, network errors, etc.)
  }
};

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first, fallback to cache (for API calls)
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') {
        const cache = await caches.open(CACHE_NAME);
        await safeCachePut(cache, request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw error;
    }
  },
  
  // Cache first, fallback to network (for static assets)
  cacheFirst: async (request) => {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      await safeCachePut(cache, request, response.clone());
    }
    return response;
  },
  
  // Stale while revalidate (for app shell)
  staleWhileRevalidate: async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    const fetchPromise = fetch(request).then(async (response) => {
      if (response.ok && response.type !== 'opaque') {
        await safeCachePut(cache, request, response.clone());
      }
      return response;
    }).catch(() => cached);
    
    return cached || fetchPromise;
  }
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v5');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Caching static assets');
      // Cache each asset individually to avoid one failure blocking all
      for (const url of STATIC_ASSETS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn('[SW] Failed to cache:', url);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - apply cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip external requests
  if (url.origin !== self.location.origin) return;
  
  // Skip WebSocket/Socket.IO requests - must not be cached
  if (url.pathname.startsWith('/socket.io')) return;
  
  // API calls - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
    return;
  }
  
  // Static assets (JS, CSS, images) - cache first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?)$/)) {
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
    return;
  }
  
  // HTML pages - stale while revalidate
  event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(request));
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  let notificationData = {
    title: 'TrackYu GPS',
    body: 'Nouvelle notification',
    icon: NOTIFICATION_ICON,
    badge: '/badge-72x72.png',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || 'TrackYu GPS',
        body: data.body || data.message || 'Nouvelle notification',
        icon: data.icon || NOTIFICATION_ICON,
        badge: '/badge-72x72.png',
        tag: data.tag || data.type || 'default',
        data: data,
        requireInteraction: data.severity === 'CRITICAL' || data.severity === 'HIGH',
        vibrate: data.severity === 'CRITICAL' ? [200, 100, 200, 100, 200] : [200, 100, 200],
        actions: [
          { action: 'view', title: 'Voir', icon: '/icons/eye.png' },
          { action: 'dismiss', title: 'Ignorer', icon: '/icons/x.png' }
        ]
      };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const data = event.notification.data || {};
  let urlToOpen = '/';

  // Route based on notification type
  if (data.type) {
    switch (data.type) {
      case 'SPEEDING':
      case 'GEOFENCE':
      case 'FUEL_LEVEL':
      case 'FUEL_THEFT':
        urlToOpen = `/map?vehicleId=${data.vehicleId || ''}`;
        break;
      case 'MAINTENANCE':
        urlToOpen = `/fleet?vehicleId=${data.vehicleId || ''}`;
        break;
      case 'TICKET':
        urlToOpen = `/support?ticketId=${data.ticketId || ''}`;
        break;
      case 'INVOICE':
        urlToOpen = `/finance/invoices?id=${data.invoiceId || ''}`;
        break;
      default:
        urlToOpen = '/settings?section=my_notifications';
    }
  }

  if (event.action === 'view') {
    urlToOpen = data.link || urlToOpen;
  } else if (event.action === 'dismiss') {
    return; // Just close
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Message from main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, data } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: icon || NOTIFICATION_ICON,
      badge: '/badge-72x72.png',
      tag: tag || 'local',
      data: data || {},
      requireInteraction: data?.severity === 'CRITICAL',
      vibrate: [200, 100, 200]
    });
  }

  if (event.data.type === 'UPDATE_BADGE') {
    // Update badge count (if supported)
    if ('setAppBadge' in navigator) {
      if (event.data.count > 0) {
        navigator.setAppBadge(event.data.count);
      } else {
        navigator.clearAppBadge();
      }
    }
  }
});

// Background sync for offline alerts
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-alerts') {
    event.waitUntil(
      // Sync pending alerts when back online
      fetch('/api/alerts/sync', { method: 'POST' })
        .then((res) => res.json())
        .catch((err) => console.error('[SW] Sync failed:', err))
    );
  }
});

console.log('[SW] Service Worker loaded');
