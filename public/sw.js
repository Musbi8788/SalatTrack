const CACHE_NAME = 'salattrack-v2'

// Only pre-cache the manifest — never pre-cache HTML pages (server-rendered dates bake in)
const PRECACHE_URLS = ['/site.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Network only — prayer logging must always reach the server
  if (url.pathname.startsWith('/api/prayer-log')) return

  // Network first, cache fallback — stale prayer times are acceptable offline
  if (url.pathname.startsWith('/api/prayer-times')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return res
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached ?? Response.error())
        )
    )
    return
  }

  // Navigation requests (HTML pages): network first, cache fallback for offline only.
  // Pages contain server-rendered dates — never serve them from cache when online.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return res
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached ?? Response.error())
        )
    )
    return
  }

  // Static assets (JS, CSS, images, fonts): cache first — these are content-hashed by Next.js
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return res
      })
    })
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'SalatTrack', {
      body: data.body ?? '',
      icon: data.icon ?? '/icons/icon-192.png',
      badge: data.badge ?? '/icons/badge-72.png',
      tag: data.tag,
      data: data.data,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus()
          }
        }
        return clients.openWindow ? clients.openWindow('/') : undefined
      })
  )
})
