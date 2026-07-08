import { createHandlerBoundToURL, precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { BACKGROUND_SYNC_TAG, PERIODIC_SYNC_TAG } from './sync/constants'
import { executeSync } from './sync/syncCore'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api/],
  }),
)

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
  }),
)

async function runBackgroundSync() {
  try {
    const result = await executeSync()
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clients) {
      client.postMessage({ type: 'SYNC_COMPLETE', result })
    }
  } catch {
    // 네트워크/서버 오류 — background sync 재시도 폭주 방지
  }
}

self.addEventListener('sync', (event) => {
  const tag = (event as SyncEvent).tag
  if (tag === BACKGROUND_SYNC_TAG || tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(runBackgroundSync())
  }
})

self.addEventListener('periodicsync', (event) => {
  if ((event as PeriodicSyncEvent).tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(runBackgroundSync())
  }
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'SYNC_NOW') {
    event.waitUntil(runBackgroundSync())
  }
})

export {}
