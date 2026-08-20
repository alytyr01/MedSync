/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// Service Worker for MedSync PWA
// Handles push notifications and offline caching

// Workbox manifest injection point (required by vite-plugin-pwa injectManifest)
self.__WB_MANIFEST;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ===== Push Notification Handling =====
self.addEventListener('push', (event) => {
  let data = { title: 'MedSync', body: 'Time to take your medicine', icon: '/pwa-icons/pwa-192x192.png' };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-icons/pwa-192x192.png',
    badge: '/pwa-icons/pwa-192x192.png',
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: data.url || '/',
      medicineId: data.medicineId,
      scheduledTime: data.scheduledTime,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'taken', title: "I've Taken It" },
      { action: 'snooze', title: 'Snooze 10m' },
      { action: 'skip', title: 'Skip' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ===== Notification Click Handling =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  // Handle action buttons
  if (action === 'taken' || action === 'snooze' || action === 'skip') {
    // Send message to the app to handle the action
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'MEDICATION_ACTION',
            action,
            medicineId: notificationData.medicineId,
            scheduledTime: notificationData.scheduledTime,
          });
        }
      })
    );
  }

  // Open the app
  const urlToOpen = new URL(notificationData.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ===== Message Handling =====
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});