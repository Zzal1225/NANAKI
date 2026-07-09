import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const PORT = process.env.SYNC_PORT ? Number(process.env.SYNC_PORT) : 3001

const SYNC_STORES = [
  'budgetSettings', 'expenses', 'bodyRecords', 'archiveItems', 'habits', 'habitLogs',
  'supplementProducts', 'supplementIntakeLogs',
  'periodRecords', 'bpRecords', 'sugarRecords', 'sleepRecords', 'hospitalRecords',
  'exerciseRecords',
]

/** @type {Map<string, { entities: Map<string, object>, changelog: object[] }>} */
const users = new Map()

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function userFile(userId) {
  return path.join(DATA_DIR, `${userId}.json`)
}

async function loadUser(userId) {
  if (users.has(userId)) return users.get(userId)

  try {
    const raw = await fs.readFile(userFile(userId), 'utf-8')
    const parsed = JSON.parse(raw)
    const state = {
      entities: new Map(Object.entries(parsed.entities ?? {})),
      changelog: parsed.changelog ?? [],
    }
    users.set(userId, state)
    return state
  } catch {
    const state = { entities: new Map(), changelog: [] }
    users.set(userId, state)
    return state
  }
}

async function persistUser(userId) {
  const state = users.get(userId)
  if (!state) return
  const data = {
    entities: Object.fromEntries(state.entities),
    changelog: state.changelog.slice(-5000),
  }
  await fs.writeFile(userFile(userId), JSON.stringify(data, null, 2))
}

function entityKey(store, entityId) {
  return `${store}:${entityId}`
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '15mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/sync/snapshot', async (req, res) => {
  const userId = String(req.query.userId ?? 'default')
  const state = await loadUser(userId)
  const snapshot = {}
  for (const store of SYNC_STORES) {
    snapshot[store] = []
  }
  for (const [key, record] of state.entities) {
    const store = key.split(':')[0]
    if (snapshot[store] && record.payload && !record.deleted) {
      snapshot[store].push(record.payload)
    }
  }
  res.json(snapshot)
})

app.post('/api/sync', async (req, res) => {
  const { userId = 'default', deviceId = 'unknown', lastSyncedAt = null, mutations = [] } = req.body ?? {}
  const state = await loadUser(userId)
  const syncedAt = new Date().toISOString()

  for (const m of mutations) {
    const key = entityKey(m.store, m.entityId)
    const updatedAt = m.clientTimestamp ?? syncedAt
    const existing = state.entities.get(key)
    const existingTime = existing?.updatedAt ?? ''

    if (!existing || updatedAt >= existingTime) {
      state.entities.set(key, {
        store: m.store,
        entityId: m.entityId,
        payload: m.operation === 'delete' ? null : m.payload,
        deleted: m.operation === 'delete',
        updatedAt,
        deviceId,
      })
      state.changelog.push({ ...m, updatedAt, deviceId })
    }
  }

  const remoteMutations = []
  for (const record of state.entities.values()) {
    if (record.deviceId === deviceId) continue
    if (lastSyncedAt && record.updatedAt <= lastSyncedAt) continue
    remoteMutations.push({
      store: record.store,
      operation: record.deleted ? 'delete' : 'put',
      entityId: record.entityId,
      payload: record.payload ?? undefined,
      updatedAt: record.updatedAt,
      deviceId: record.deviceId,
    })
  }

  await persistUser(userId)

  res.json({ syncedAt, remoteMutations })
})

await ensureDataDir()
app.listen(PORT, () => {
  console.log(`Nanaki sync server http://localhost:${PORT}`)
})
