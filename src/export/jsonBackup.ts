import { format } from 'date-fns'
import { collectAllNanakiData, type NanakiDataPayload } from './collectAllData'
import { restoreAllNanakiData } from '../db/restoreAllData'

export const NANAKI_BACKUP_VERSION = 1

export interface NanakiBackupFile {
  version: typeof NANAKI_BACKUP_VERSION
  app: 'nanaki'
  exportedAt: string
  data: NanakiDataPayload
}

function downloadJson(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export async function exportJsonBackup() {
  const data = await collectAllNanakiData()
  const backup: NanakiBackupFile = {
    version: NANAKI_BACKUP_VERSION,
    app: 'nanaki',
    exportedAt: new Date().toISOString(),
    data,
  }
  downloadJson(`nanaki-backup-${format(new Date(), 'yyyyMMdd')}.json`, backup)
}

function isNanakiBackupFile(value: unknown): value is NanakiBackupFile {
  if (!value || typeof value !== 'object') return false
  const file = value as Partial<NanakiBackupFile>
  return file.app === 'nanaki' && file.version === NANAKI_BACKUP_VERSION && !!file.data
}

function validatePayload(data: unknown): NanakiDataPayload {
  if (!data || typeof data !== 'object') throw new Error('백업 데이터 형식이 올바르지 않습니다.')
  const payload = data as Partial<NanakiDataPayload>
  const requiredArrays = [
    'budgetSettings',
    'expenses',
    'bodyRecords',
    'archiveItems',
    'habits',
    'habitLogs',
    'periodRecords',
    'bpRecords',
    'sugarRecords',
    'sleepRecords',
    'hospitalRecords',
    'exerciseRecords',
  ] as const
  for (const key of requiredArrays) {
    if (!Array.isArray(payload[key])) throw new Error(`백업에 ${key} 항목이 없습니다.`)
  }
  if (!payload.appSettings) throw new Error('백업에 앱 설정이 없습니다.')
  return payload as NanakiDataPayload
}

export async function importJsonBackup(file: File) {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다.')
  }

  if (isNanakiBackupFile(parsed)) {
    await restoreAllNanakiData(validatePayload(parsed.data))
    return
  }

  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    throw new Error('지원하지 않는 백업 버전입니다.')
  }

  await restoreAllNanakiData(validatePayload(parsed))
}
