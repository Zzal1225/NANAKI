type UpdateFn = () => void | Promise<void>

let pendingUpdate: UpdateFn | null = null
let globalUpdateSW: UpdateFn | null = null
const listeners = new Set<(fn: UpdateFn) => void>()

export function notifyUpdateAvailable(updateFn: UpdateFn) {
  if (import.meta.env.DEV) return
  if (pendingUpdate) return

  pendingUpdate = updateFn
  for (const listener of listeners) listener(updateFn)
  window.dispatchEvent(
    new CustomEvent('nanaki-need-refresh', { detail: { updateSW: updateFn } }),
  )
}

export function getPendingUpdate() {
  return pendingUpdate
}

export function subscribeUpdateAvailable(listener: (fn: UpdateFn) => void) {
  listeners.add(listener)
  if (pendingUpdate) listener(pendingUpdate)
  return () => {
    listeners.delete(listener)
  }
}

export async function applyPendingUpdate(updateFn: UpdateFn) {
  pendingUpdate = null
  await updateFn()

  if ('serviceWorker' in navigator) {
    await new Promise<void>((resolve) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        navigator.serviceWorker.removeEventListener('controllerchange', onChange)
        resolve()
      }
      const onChange = () => finish()
      navigator.serviceWorker.addEventListener('controllerchange', onChange)
      window.setTimeout(finish, 3000)
    })
  }

  window.location.reload()
}

/** waiting SW가 있으면 배너 표시 (workbox 이벤트 누락 대비) */
export async function checkForWaitingServiceWorker() {
  if (import.meta.env.DEV) return
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration?.waiting) return

  const updateFn = globalUpdateSW
  if (!updateFn) return

  notifyUpdateAvailable(() => updateFn())
}

export function startUpdateWatcher(updateSW: UpdateFn) {
  if (import.meta.env.DEV) return

  globalUpdateSW = updateSW

  const runCheck = () => {
    void checkForWaitingServiceWorker()
  }

  void runCheck()

  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') {
          window.setTimeout(runCheck, 300)
        }
      })
    })
  })

  const checkRemoteUpdate = () => {
    navigator.serviceWorker.ready
      .then((registration) => registration.update())
      .finally(runCheck)
  }

  window.addEventListener('focus', checkRemoteUpdate)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkRemoteUpdate()
  })
  window.setInterval(checkRemoteUpdate, 60_000)
}
