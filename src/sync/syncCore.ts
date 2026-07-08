/**
 * Service Worker·클라이언트 공용 동기화 코어 (IndexedDB 직접 접근)
 */
import { openDB } from 'idb'
import type { SyncConfig, SyncMutation, SyncPushRequest, SyncPushResponse, SyncStoreName } from './types'
import { DEFAULT_SYNC_CONFIG } from './types'

const DB_NAME = 'nanaki-db'

export interface SyncResult {
  ok: boolean
  error?: string
  pushed: number
  pulled: number
}

async function getDb() {
  return openDB(DB_NAME)
}

async function getConfig(db: Awaited<ReturnType<typeof getDb>>): Promise<SyncConfig> {
  const config = await db.get('syncConfig', 'sync-config')
  if (config) return config as SyncConfig
  const initial: SyncConfig = { ...DEFAULT_SYNC_CONFIG, deviceId: crypto.randomUUID() }
  await db.put('syncConfig', initial)
  return initial
}

async function getPending(db: Awaited<ReturnType<typeof getDb>>): Promise<SyncMutation[]> {
  const all = (await db.getAll('syncQueue')) as SyncMutation[]
  return all.filter((m) => !m.synced).sort((a, b) => a.clientTimestamp.localeCompare(b.clientTimestamp))
}

async function applyRemote(
  db: Awaited<ReturnType<typeof getDb>>,
  store: SyncStoreName,
  operation: 'put' | 'delete',
  entityId: string,
  payload?: unknown,
) {
  if (operation === 'delete') {
    await db.delete(store, entityId)
    return
  }
  if (payload && typeof payload === 'object') {
    await db.put(store, payload)
  }
}

export async function executeSync(): Promise<SyncResult> {
  try {
    const db = await getDb()
    const config = await getConfig(db)

    if (!config.enabled) {
      return { ok: false, error: 'disabled', pushed: 0, pulled: 0 }
    }

    const pending = await getPending(db)
    const deviceId = config.deviceId || crypto.randomUUID()

    const body: SyncPushRequest = {
      userId: config.userId,
      deviceId,
      lastSyncedAt: config.lastSyncedAt,
      mutations: pending.map((m) => ({
        store: m.store,
        operation: m.operation,
        entityId: m.entityId,
        payload: m.payload,
        clientTimestamp: m.clientTimestamp,
      })),
    }

    const res = await fetch(config.serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: text || res.statusText, pushed: 0, pulled: 0 }
    }

    const data = (await res.json()) as SyncPushResponse

    for (const remote of data.remoteMutations) {
      await applyRemote(db, remote.store, remote.operation, remote.entityId, remote.payload)
    }

    for (const m of pending) {
      const item = await db.get('syncQueue', m.id)
      if (item) await db.put('syncQueue', { ...item, synced: true })
    }

    await db.put('syncConfig', {
      ...config,
      deviceId,
      lastSyncedAt: data.syncedAt,
    })

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const allQueue = (await db.getAll('syncQueue')) as SyncMutation[]
    for (const m of allQueue) {
      if (m.synced && new Date(m.clientTimestamp) < cutoff) {
        await db.delete('syncQueue', m.id)
      }
    }

    return { ok: true, pushed: pending.length, pulled: data.remoteMutations.length }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), pushed: 0, pulled: 0 }
  }
}
