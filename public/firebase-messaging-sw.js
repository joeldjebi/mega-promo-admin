importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

// Ce service worker est utilisé par getToken(..., serviceWorkerRegistration).
// L'affichage background complet peut être enrichi plus tard avec la config
// Firebase Web injectée ici si nécessaire.
self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {}
  const notification = payload.notification || {}
  const data = payload.data || {}
  const title = notification.title || data.title || 'MegaPromo'
  const options = {
    body: notification.body || data.body || '',
    data,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/mp-control/super-admin'
  event.waitUntil(clients.openWindow(url))
})
