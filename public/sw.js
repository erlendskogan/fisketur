// Offline support: the page itself is fetched fresh when online, built assets are cached forever
const CACHE = 'fisketur-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  const isPage = req.mode === 'navigate'
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      if (isPage) {
        try {
          const res = await fetch(req, { cache: 'no-store' })
          cache.put(req, res.clone())
          return res
        } catch {
          return (await cache.match(req)) || (await cache.match('./')) || Response.error()
        }
      }
      const hit = await cache.match(req)
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok) cache.put(req, res.clone())
      return res
    })(),
  )
})
