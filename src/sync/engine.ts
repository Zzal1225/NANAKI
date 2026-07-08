import { executeSync, type SyncResult } from './syncCore'
import { getOrCreateDeviceId } from './types'

export type { SyncResult }

export async function runSync(): Promise<SyncResult> {
  if (!navigator.onLine) {
    return { ok: false, error: 'offline', pulled: 0, pushed: 0 }
  }
  return executeSync()
}

export async function triggerServiceWorkerSync() {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  if (reg.active) {
    reg.active.postMessage({ type: 'SYNC_NOW' })
  }
}

export { getOrCreateDeviceId }
