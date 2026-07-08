import { BACKGROUND_SYNC_TAG, PERIODIC_SYNC_TAG } from './constants'

type SyncManagerRegistration = ServiceWorkerRegistration & {
  sync?: { register: (tag: string) => Promise<void> }
  periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> }
}

export async function requestBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const reg = (await navigator.serviceWorker.ready) as SyncManagerRegistration
    if (reg.sync) {
      await reg.sync.register(BACKGROUND_SYNC_TAG)
      return true
    }
  } catch {
    // Background Sync 미지원 브라우저
  }
  return false
}

/** Chrome 등 Periodic Background Sync 지원 시 등록 (최소 24시간) */
export async function registerPeriodicSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const reg = (await navigator.serviceWorker.ready) as SyncManagerRegistration
    if (!reg.periodicSync) return false

    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    })
    if (status.state === 'denied') return false

    await reg.periodicSync.register(PERIODIC_SYNC_TAG, {
      minInterval: 24 * 60 * 60 * 1000,
    })
    return true
  } catch {
    return false
  }
}

export function notifySyncCompleteListeners(result: unknown) {
  window.dispatchEvent(new CustomEvent('nanaki-sync-complete', { detail: result }))
}
