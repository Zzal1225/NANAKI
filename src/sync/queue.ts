import type { SyncConfig, SyncMutation, SyncStoreName } from './types'
import { DEFAULT_SYNC_CONFIG, getOrCreateDeviceId } from './types'
import { isApplyingRemote, notifyLocalMutation } from './tracker'
import { requestBackgroundSync } from './backgroundSync'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let getDBRef: (() => Promise<any>) | null = null

export function registerSyncDB(getDB: () => Promise<any>) {
  getDBRef = getDB
}

async function db() {
  if (!getDBRef) throw new Error('Sync DB not registered')
  return getDBRef()
}

export async function getSyncConfig(): Promise<SyncConfig> {
  const database = await db()
  const config = await database.get('syncConfig', 'sync-config')
  if (config) return config
  const initial: SyncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    deviceId: getOrCreateDeviceId(),
  }
  await database.put('syncConfig', initial)
  return initial
}

export async function saveSyncConfig(config: SyncConfig) {
  const database = await db()
  await database.put('syncConfig', config)
}

export async function enqueueMutation(
  store: SyncStoreName,
  operation: 'put' | 'delete',
  entityId: string,
  payload?: unknown,
) {
  if (isApplyingRemote()) return

  const database = await db()
  const mutation: SyncMutation = {
    id: crypto.randomUUID(),
    store,
    operation,
    entityId,
    payload,
    clientTimestamp: new Date().toISOString(),
    synced: false,
  }
  await database.put('syncQueue', mutation)
  notifyLocalMutation()
  requestBackgroundSync()
}

export async function getPendingMutations(): Promise<SyncMutation[]> {
  const database = await db()
  const all = await database.getAll('syncQueue')
  return all.filter((m: SyncMutation) => !m.synced).sort((a: SyncMutation, b: SyncMutation) => a.clientTimestamp.localeCompare(b.clientTimestamp))
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingMutations()
  return pending.length
}

export async function markMutationsSynced(ids: string[]) {
  const database = await db()
  for (const id of ids) {
    const m = await database.get('syncQueue', id)
    if (m) await database.put('syncQueue', { ...m, synced: true })
  }
}

export async function pruneSyncedMutations(keepDays = 7) {
  const database = await db()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - keepDays)
  const all = await database.getAll('syncQueue')
  for (const m of all) {
    if (m.synced && new Date(m.clientTimestamp) < cutoff) {
      await database.delete('syncQueue', m.id)
    }
  }
}
