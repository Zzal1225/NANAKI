/** IndexedDB에 동기화 대상이 되는 store 이름 */
export type SyncStoreName =
  | 'budgetSettings'
  | 'expenses'
  | 'bodyRecords'
  | 'archiveItems'
  | 'habits'
  | 'habitLogs'
  | 'lifeRoutines'
  | 'pantryItems'
  | 'supplementProducts'
  | 'supplementIntakeLogs'
  | 'periodRecords'
  | 'bpRecords'
  | 'sugarRecords'
  | 'sleepRecords'
  | 'hospitalRecords'
  | 'exerciseRecords'

export const SYNC_STORE_NAMES: SyncStoreName[] = [
  'budgetSettings',
  'expenses',
  'bodyRecords',
  'archiveItems',
  'habits',
  'habitLogs',
  'lifeRoutines',
  'pantryItems',
  'supplementProducts',
  'supplementIntakeLogs',
  'periodRecords',
  'bpRecords',
  'sugarRecords',
  'sleepRecords',
  'hospitalRecords',
  'exerciseRecords',
]

export interface SyncMutation {
  id: string
  store: SyncStoreName
  operation: 'put' | 'delete'
  entityId: string
  payload?: unknown
  clientTimestamp: string
  synced: boolean
}

export interface SyncConfig {
  id: 'sync-config'
  enabled: boolean
  serverUrl: string
  userId: string
  deviceId: string
  lastSyncedAt: string | null
}

export interface RemoteMutation {
  store: SyncStoreName
  operation: 'put' | 'delete'
  entityId: string
  payload?: unknown
  updatedAt: string
  deviceId: string
}

export interface SyncPushRequest {
  userId: string
  deviceId: string
  lastSyncedAt: string | null
  mutations: Array<{
    store: SyncStoreName
    operation: 'put' | 'delete'
    entityId: string
    payload?: unknown
    clientTimestamp: string
  }>
}

export interface SyncPushResponse {
  syncedAt: string
  remoteMutations: RemoteMutation[]
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'disabled'

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  id: 'sync-config',
  enabled: false,
  serverUrl: '/api/sync',
  userId: 'default',
  deviceId: '',
  lastSyncedAt: null,
}

export function getOrCreateDeviceId(): string {
  const key = 'nanaki-device-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}
