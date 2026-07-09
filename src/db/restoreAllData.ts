import { getDB } from './index'
import type { NanakiDataPayload } from '../export/collectAllData'

const USER_STORES = [
  'appSettings',
  'budgetSettings',
  'expenses',
  'bodyRecords',
  'archiveItems',
  'habits',
  'habitLogs',
  'supplementProducts',
  'supplementIntakeLogs',
  'periodRecords',
  'bpRecords',
  'sugarRecords',
  'sleepRecords',
  'hospitalRecords',
  'exerciseRecords',
] as const

/** 백업/가져오기 — 기존 사용자 데이터를 교체 (동기화 큐 초기화 후 새로고침) */
export async function restoreAllNanakiData(payload: NanakiDataPayload) {
  const db = await getDB()
  const storeNames = [...USER_STORES, 'syncQueue'] as const

  const tx = db.transaction(storeNames, 'readwrite')

  for (const store of USER_STORES) {
    await tx.objectStore(store).clear()
  }
  await tx.objectStore('syncQueue').clear()

  await tx.objectStore('appSettings').put(payload.appSettings)
  for (const item of payload.budgetSettings) await tx.objectStore('budgetSettings').put(item)
  for (const item of payload.expenses) await tx.objectStore('expenses').put(item)
  for (const item of payload.bodyRecords) await tx.objectStore('bodyRecords').put(item)
  for (const item of payload.archiveItems) await tx.objectStore('archiveItems').put(item)
  for (const item of payload.habits) await tx.objectStore('habits').put(item)
  for (const item of payload.habitLogs) await tx.objectStore('habitLogs').put(item)
  for (const item of payload.supplementProducts ?? []) {
    await tx.objectStore('supplementProducts').put(item)
  }
  for (const item of payload.supplementIntakeLogs ?? []) {
    await tx.objectStore('supplementIntakeLogs').put(item)
  }
  for (const item of payload.periodRecords) await tx.objectStore('periodRecords').put(item)
  for (const item of payload.bpRecords) await tx.objectStore('bpRecords').put(item)
  for (const item of payload.sugarRecords) await tx.objectStore('sugarRecords').put(item)
  for (const item of payload.sleepRecords) await tx.objectStore('sleepRecords').put(item)
  for (const item of payload.hospitalRecords) await tx.objectStore('hospitalRecords').put(item)
  for (const item of payload.exerciseRecords) await tx.objectStore('exerciseRecords').put(item)

  await tx.done

  window.location.reload()
}
