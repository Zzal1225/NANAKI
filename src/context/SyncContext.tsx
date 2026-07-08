import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SyncConfig, SyncStatus } from '../sync/types'
import { getPendingCount, getSyncConfig, saveSyncConfig } from '../sync/queue'
import { onLocalMutation } from '../sync/tracker'
import { runSync, triggerServiceWorkerSync, type SyncResult } from '../sync/engine'
import { requestBackgroundSync } from '../sync/backgroundSync'
import { getOrCreateDeviceId } from '../sync/types'

interface SyncContextValue {
  online: boolean
  status: SyncStatus
  pendingCount: number
  lastSyncedAt: string | null
  config: SyncConfig | null
  offlineReady: boolean
  backgroundSyncSupported: boolean
  syncNow: () => Promise<void>
  updateConfig: (partial: Partial<SyncConfig>) => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)
  const [config, setConfig] = useState<SyncConfig | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const [backgroundSyncSupported, setBackgroundSyncSupported] = useState(false)

  const refreshPending = useCallback(async () => {
    setPendingCount(await getPendingCount())
  }, [])

  const loadConfig = useCallback(async () => {
    const c = await getSyncConfig()
    if (!c.deviceId) {
      const updated = { ...c, deviceId: getOrCreateDeviceId() }
      await saveSyncConfig(updated)
      setConfig(updated)
    } else {
      setConfig(c)
    }
  }, [])

  const applySyncResult = useCallback(async (result: SyncResult) => {
    if (result.ok) {
      setStatus('synced')
      const updated = await getSyncConfig()
      setConfig(updated)
    } else if (result.error === 'offline') {
      setStatus('offline')
    } else if (result.error === 'disabled') {
      setStatus('disabled')
    } else {
      setStatus('error')
    }
    await refreshPending()
  }, [refreshPending])

  const syncNow = useCallback(async () => {
    const cfg = await getSyncConfig()
    if (!cfg.enabled) {
      setStatus('disabled')
      return
    }
    if (!navigator.onLine) {
      setStatus('offline')
      await requestBackgroundSync()
      return
    }

    setStatus('syncing')
    try {
      const result = await runSync()
      await applySyncResult(result)
    } catch {
      setStatus('error')
      await refreshPending()
    }
  }, [applySyncResult, refreshPending])

  const updateConfig = useCallback(async (partial: Partial<SyncConfig>) => {
    const current = await getSyncConfig()
    const next = { ...current, ...partial }
    await saveSyncConfig(next)
    setConfig(next)
  }, [])

  useEffect(() => {
    loadConfig()
    refreshPending()

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setBackgroundSyncSupported('sync' in reg)
      })
    }

    const handleOnline = () => {
      setOnline(true)
      syncNow()
      triggerServiceWorkerSync()
    }
    const handleOffline = () => {
      setOnline(false)
      setStatus('offline')
    }
    const handleOfflineReady = () => setOfflineReady(true)
    const handleSyncComplete = (e: Event) => {
      applySyncResult((e as CustomEvent<SyncResult>).detail)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('nanaki-offline-ready', handleOfflineReady)
    window.addEventListener('nanaki-sync-complete', handleSyncComplete)

    const unsub = onLocalMutation(() => {
      refreshPending()
      requestBackgroundSync()
      if (navigator.onLine) syncNow()
      else triggerServiceWorkerSync()
    })

    const interval = setInterval(() => {
      if (navigator.onLine) syncNow()
    }, 60_000)

    if (navigator.onLine) syncNow()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('nanaki-offline-ready', handleOfflineReady)
      window.removeEventListener('nanaki-sync-complete', handleSyncComplete)
      unsub()
      clearInterval(interval)
    }
  }, [loadConfig, refreshPending, syncNow, applySyncResult])

  useEffect(() => {
    if (!online) setStatus('offline')
    else if (pendingCount > 0 && status !== 'syncing') setStatus('idle')
  }, [online, pendingCount, status])

  const value = useMemo(
    () => ({
      online,
      status,
      pendingCount,
      lastSyncedAt: config?.lastSyncedAt ?? null,
      config,
      offlineReady,
      backgroundSyncSupported,
      syncNow,
      updateConfig,
    }),
    [online, status, pendingCount, config, offlineReady, backgroundSyncSupported, syncNow, updateConfig],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}
