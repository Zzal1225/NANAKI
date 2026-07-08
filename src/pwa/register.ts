import { registerSW } from 'virtual:pwa-register'
import { registerPeriodicSync, requestBackgroundSync } from '../sync/backgroundSync'
import { notifyUpdateAvailable, startUpdateWatcher } from './updatePrompt'

type UpdateSW = (reloadPage?: boolean) => Promise<void>

export function setupPwa(): Promise<{
  updateSW: UpdateSW
  requestBackgroundSync: typeof requestBackgroundSync
}> {
  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister()
      })
    }
    return Promise.resolve({ updateSW: async () => {}, requestBackgroundSync: async () => false })
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = (value: {
      updateSW: UpdateSW
      requestBackgroundSync: typeof requestBackgroundSync
    }) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    if (!('serviceWorker' in navigator)) {
      finish({ updateSW: async () => {}, requestBackgroundSync: async () => false })
      return
    }

    const updateSW = registerSW({
      immediate: true,
      onOfflineReady() {
        window.dispatchEvent(new CustomEvent('nanaki-offline-ready'))
      },
      onNeedRefresh() {
        notifyUpdateAvailable(() => updateSW())
      },
      onRegistered(registration) {
        if (registration) {
          registerPeriodicSync()
          startUpdateWatcher(updateSW)
        }
        finish({ updateSW, requestBackgroundSync })
      },
      onRegisterError() {
        finish({ updateSW: async () => {}, requestBackgroundSync: async () => false })
      },
    })

    window.setTimeout(() => {
      finish({ updateSW, requestBackgroundSync })
    }, 5000)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          window.dispatchEvent(new CustomEvent('nanaki-sync-complete', { detail: event.data.result }))
        }
      })
    }
  })
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
