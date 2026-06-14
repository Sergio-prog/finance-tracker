/// <reference types="vite-plugin-pwa/client" />
// PWA Service Worker — precache manifest injected by vite-plugin-pwa

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// Network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.pathname.startsWith('/trpc') || url.pathname.startsWith('/api')) {
    event.respondWith(networkFirst(request))
  } else {
    event.respondWith(cacheFirst(request))
  }
})

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open('ledger-dynamic')
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response(null, { status: 503 })
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    return await fetch(request)
  } catch {
    return new Response(null, { status: 503 })
  }
}
