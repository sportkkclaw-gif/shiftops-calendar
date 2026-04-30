/**
 * Service Worker — ShiftOps Calendar PWA
 * Handles offline caching and provides last-known schedule fallback.
 */

const CACHE_NAME = 'shiftops-v1'
const OFFLINE_URL = '/api/calendar/last-known'

// Assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/calendar',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Non-fatal: some URLs may not be available at install time
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API calls: network-first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Clone and cache successful GET responses
          if (res.ok && request.method === 'GET') {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return res
        })
        .catch(() => {
          // Offline: return cached response or last-known schedule
          return caches.match(request).then((cached) => {
            if (cached) return cached
            // For schedule API, return last-known schedule
            if (url.pathname.includes('/api/calendar') || url.pathname.includes('/api/shift')) {
              return caches.match(`${url.origin}${OFFLINE_URL}`).then((lk) => {
                if (lk) return lk
                return new Response(
                  JSON.stringify({ data: { source: 'offline', message: '離線模式：顯示最後已知班表', events: [] } }),
                  { headers: { 'Content-Type': 'application/json' } }
                )
              })
            }
            return new Response(JSON.stringify({ error: { code: 'OFFLINE', message: '目前離線' } }), {
              headers: { 'Content-Type': 'application/json' },
              status: 503,
            })
          })
        })
    )
    return
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return res
      })
    })
  )
})
