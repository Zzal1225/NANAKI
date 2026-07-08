import { deleteDB } from 'idb'
import { DB_NAME, resetDbConnection } from './index'

const WIPE_DELAY_MS = 400

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  const regs = await navigator.serviceWorker.getRegistrations()
  await Promise.all(regs.map((reg) => reg.unregister()))
}

async function clearAppCaches() {
  if (!('caches' in window)) return
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

/** IndexedDB 전체 삭제 후 앱 재시작 (복구 불가) */
export async function wipeAllLocalData() {
  await unregisterServiceWorkers()
  await new Promise((r) => setTimeout(r, WIPE_DELAY_MS))
  await clearAppCaches()

  resetDbConnection()

  await Promise.race([
    deleteDB(DB_NAME, {
      blocked() {
        console.warn('[wipe] IndexedDB delete blocked — waiting for connections to close')
      },
    }),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 8000)
    }),
  ])

  window.location.replace(`${window.location.pathname}?wipe=${Date.now()}`)
}
