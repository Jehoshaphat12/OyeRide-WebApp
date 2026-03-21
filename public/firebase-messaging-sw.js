// firebase-messaging-sw.js
// This service worker handles background FCM push notifications for OyeRide web

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyB9YvFT-uzccwoir9Gofa4CDkR4gM3lF60',
  authDomain: 'oyeride-b6973.firebaseapp.com',
  projectId: 'oyeride-b6973',
  storageBucket: 'oyeride-b6973.firebasestorage.app',
  messagingSenderId: '339897437664',
  appId: '1:339897437664:web:630ee65f16488c3385af85',
  databaseURL: 'https://oyeride-b6973-default-rtdb.europe-west1.firebasedatabase.app',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  // Map notification types to icons and actions
  const iconMap = {
    ride_accepted: '🚗',
    ride_cancelled: '❌',
    ride_completed: '🎉',
    chat_message: '💬',
  };

  const icon = iconMap[data.type] || '🛵';

  const notificationTitle = title || 'OyeRide';
  const notificationOptions = {
    body: body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: data.rideId || 'oyeride-notification',
    data: data,
    requireInteraction: data.type === 'ride_accepted',
    actions: data.type === 'ride_accepted'
      ? [{ action: 'view', title: 'View Ride' }]
      : [],
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(`${icon} ${notificationTitle}`, notificationOptions);
});

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  if (data.type === 'ride_accepted' || data.type === 'ride_completed') {
    url = '/';
  } else if (data.type === 'chat_message' && data.rideId) {
    url = `/?rideId=${data.rideId}`;
  } else if (data.screen) {
    url = data.screen;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
