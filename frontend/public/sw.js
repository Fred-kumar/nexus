/* Nexus Service Worker - Push Notifications & Offline Cache */

const CACHE_NAME = 'nexus-v1';
const STATIC_ASSETS = ['/', '/static/js/main.chunk.js', '/static/css/main.chunk.css', '/manifest.json'];

// ─── Install ──────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch (cache-first for static, network-first for API) ────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API requests
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});

// ─── Push Notifications ───────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Nexus', body: event.data.text() };
  }

  const options = {
    body: payload.body || 'New message',
    icon: payload.icon || '/icon-192.png',
    badge: '/badge-72.png',
    tag: payload.tag || 'nexus-notification',
    data: payload.data || {},
    actions: [
      { action: 'reply', title: '↩ Reply', type: 'text', placeholder: 'Type a reply...' },
      { action: 'open', title: '📱 Open Nexus' },
    ],
    vibrate: [100, 50, 100, 50, 100],
    requireInteraction: false,
    silent: false,
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Nexus', options)
  );
});

// ─── Notification Click ───────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const { chatId, messageId } = event.notification.data || {};

  if (action === 'reply' && event.reply) {
    // Quick reply from notification
    event.waitUntil(
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, content: event.reply, type: 'text' }),
      })
    );
    return;
  }

  // Open or focus the app
  const targetUrl = chatId ? `/?chat=${chatId}` : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'OPEN_CHAT', chatId });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ─── Background Sync (for offline message queue) ──────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-queued-messages') {
    event.waitUntil(sendQueuedMessages());
  }
});

async function sendQueuedMessages() {
  // In a full implementation: read from IndexedDB queue and send
  console.log('Background sync: sending queued messages');
}

// ─── Message from client ──────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
