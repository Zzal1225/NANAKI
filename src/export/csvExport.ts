import { format } from 'date-fns'
import { collectAllNanakiData, type NanakiDataPayload } from './collectAllData'
import { restoreAllNanakiData } from '../db/restoreAllData'
import { generateId } from '../db'
import { ensureUserOwned } from '../db/recordDefaults'
import type {
  AppSettings,
  ArchiveItem,
  ArchiveType,
  BloodPressureRecord,
  BloodSugarRecord,
  BodyRecord,
  BudgetSettings,
  ExerciseRecord,
  Expense,
  ExpenseType,
  Habit,
  HabitLog,
  HabitType,
  HospitalRecord,
  PeriodRecord,
  SleepRecord,
} from '../types'
import { DEFAULT_APP_SETTINGS } from '../config/sections'

const CSV_HEADERS = ['유형', 'id', '날짜', '항목1', '항목2', '항목3', '항목4', '항목5', '상세JSON'] as const

function csvCell(value: string | number | undefined | null): string {
  const text = value == null ? '' : String(value)
  if (/[",\n\r\t]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function toCsv(headers: readonly string[], rows: (string | number | undefined | null)[][]): string {
  const lines = [
    headers.map(csvCell).join('\t'),
    ...rows.map((row) => row.map(csvCell).join('\t')),
  ]
  return lines.join('\r\n')
}

function stringToUtf16LeBuffer(text: string): ArrayBuffer {
  const buffer = new ArrayBuffer(2 + text.length * 2)
  const view = new DataView(buffer)
  view.setUint16(0, 0xfeff, true)
  for (let i = 0; i < text.length; i++) {
    view.setUint16(2 + i * 2, text.charCodeAt(i), true)
  }
  return buffer
}

function downloadCsv(filename: string, content: string) {
  const buffer = stringToUtf16LeBuffer(content)
  const blob = new Blob([buffer], { type: 'text/csv;charset=utf-16le' })
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

function expenseTypeLabel(type: ExpenseType) {
  return type === 'fixed' ? '고정' : '변동'
}

function parseExpenseType(value: string): ExpenseType {
  if (value === '고정' || value === 'fixed') return 'fixed'
  return 'variable'
}

function payloadToCsvRows(data: NanakiDataPayload): (string | number)[][] {
  const rows: (string | number)[][] = []

  rows.push(['앱설정', data.appSettings.id, '', '', '', '', '', '', JSON.stringify(data.appSettings)])

  for (const budget of data.budgetSettings) {
    rows.push(['예산월', budget.id, budget.month, '', '', '', '', '', JSON.stringify(budget)])
  }

  for (const e of data.expenses) {
    rows.push([
      '지출',
      e.id,
      e.date,
      e.amount,
      e.categoryName,
      e.subItem ?? '',
      expenseTypeLabel(e.type),
      e.categoryId,
      JSON.stringify(e),
    ])
  }

  for (const r of data.bodyRecords) {
    rows.push([
      '체형',
      r.id,
      r.date,
      r.weight ?? '',
      r.bodyFat ?? '',
      '',
      '',
      JSON.stringify(r),
    ])
  }

  for (const a of data.archiveItems) {
    rows.push([
      '아카이브',
      a.id,
      a.date,
      a.title,
      a.type,
      a.location ?? '',
      a.memo ?? '',
      a.tags.join('|'),
      JSON.stringify(a),
    ])
  }

  for (const e of data.exerciseRecords) {
    rows.push([
      '운동',
      e.id,
      e.date,
      e.type,
      e.duration ?? '',
      e.memo ?? '',
      '',
      '',
      JSON.stringify(e),
    ])
  }

  for (const h of data.habits) {
    rows.push(['습관', h.id, h.createdAt, h.name, h.type, h.emoji, h.color, '', JSON.stringify(h)])
  }

  for (const l of data.habitLogs) {
    rows.push([
      '습관체크',
      l.id,
      l.date,
      l.habitId,
      l.completed ? 'Y' : 'N',
      '',
      '',
      '',
      JSON.stringify(l),
    ])
  }

  for (const r of data.periodRecords) {
    rows.push([
      '생리',
      r.id,
      r.startDate,
      r.endDate ?? '',
      r.memo ?? '',
      '',
      '',
      '',
      JSON.stringify(r),
    ])
  }

  for (const r of data.bpRecords) {
    rows.push([
      '혈압',
      r.id,
      r.date,
      r.systolic,
      r.diastolic,
      r.memo ?? '',
      '',
      '',
      JSON.stringify(r),
    ])
  }

  for (const r of data.sugarRecords) {
    rows.push([
      '혈당',
      r.id,
      r.date,
      r.value,
      r.timing ?? '',
      r.memo ?? '',
      '',
      '',
      JSON.stringify(r),
    ])
  }

  for (const r of data.sleepRecords) {
    rows.push([
      '수면',
      r.id,
      r.date,
      r.hours ?? '',
      r.quality ?? '',
      r.memo ?? '',
      '',
      '',
      JSON.stringify(r),
    ])
  }

  for (const r of data.hospitalRecords) {
    rows.push([
      '병원',
      r.id,
      r.date,
      r.hospital ?? '',
      r.treatment ?? '',
      r.amount ?? '',
      r.memo ?? '',
      '',
      JSON.stringify(r),
    ])
  }

  return rows
}

export async function exportAllDataCsv() {
  const data = await collectAllNanakiData()
  const csv = toCsv(CSV_HEADERS, payloadToCsvRows(data))
  downloadCsv(`nanaki-data-${format(new Date(), 'yyyyMMdd')}.csv`, csv)
}

async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }
  return new TextDecoder('utf-8').decode(bytes)
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    if (ch === '\t' || ch === ',') {
      row.push(cell)
      cell = ''
      continue
    }

    if (ch === '\r' && next === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i++
      continue
    }

    if (ch === '\n' || ch === '\r') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += ch
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((r) => r.some((c) => c.trim()))
}

function parseJsonCell<T>(value: string | undefined): T | null {
  if (!value?.trim()) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function rowsToPayload(rows: string[][]): NanakiDataPayload {
  const payload: NanakiDataPayload = {
    appSettings: { ...DEFAULT_APP_SETTINGS },
    budgetSettings: [],
    expenses: [],
    bodyRecords: [],
    archiveItems: [],
    habits: [],
    habitLogs: [],
    periodRecords: [],
    bpRecords: [],
    sugarRecords: [],
    sleepRecords: [],
    hospitalRecords: [],
    exerciseRecords: [],
    supplementProducts: [],
    supplementIntakeLogs: [],
    lifeRoutines: [],
    pantryItems: [],
  }

  const header = rows[0]?.map((h) => h.trim()) ?? []
  const isUnified = header[0] === '유형' || header.includes('상세JSON')
  const dataRows = isUnified ? rows.slice(1) : rows

  if (!isUnified && header[0] === '날짜' && header.includes('금액')) {
    for (const row of dataRows) {
      if (row[0] === '날짜') continue
      payload.expenses.push(
        ensureUserOwned({
          id: generateId(),
          date: row[0] ?? '',
          amount: Number(row[1] ?? 0),
          categoryName: row[2] ?? '',
          subItem: row[3] || undefined,
          type: parseExpenseType(row[4] ?? ''),
          categoryId: '',
        }),
      )
    }
    return payload
  }

  for (const row of dataRows) {
    const type = row[0]?.trim()
    if (!type || type === '유형') continue

    const json = parseJsonCell<unknown>(row[8])

    switch (type) {
      case '앱설정': {
        const settings = json as AppSettings | null
        if (settings) payload.appSettings = ensureUserOwned(settings)
        break
      }
      case '예산월': {
        const budget = json as BudgetSettings | null
        if (budget) payload.budgetSettings.push(ensureUserOwned(budget))
        break
      }
      case '지출': {
        payload.expenses.push(
        ensureUserOwned(
          (json as Expense | null) ?? {
            id: row[1] || generateId(),
            date: row[2] ?? '',
            amount: Number(row[3] ?? 0),
            categoryName: row[4] ?? '',
            subItem: row[5] || undefined,
            type: parseExpenseType(row[6] ?? ''),
            categoryId: row[7] ?? '',
          },
        ),
      )
        break
      }
      case '체형':
        payload.bodyRecords.push(
          ensureUserOwned(
            (json as BodyRecord | null) ?? {
              id: row[1] || generateId(),
              date: row[2] ?? '',
              weight: row[3] ? Number(row[3]) : undefined,
              bodyFat: row[4] ? Number(row[4]) : undefined,
            },
          ),
        )
        break
      case '아카이브':
        payload.archiveItems.push(
          ensureUserOwned(
            (json as ArchiveItem | null) ?? {
              id: row[1] || generateId(),
              date: row[2] ?? '',
              title: row[3] ?? '',
              type: (row[4] as ArchiveType) || 'other',
              location: row[5] || undefined,
              memo: row[6] || undefined,
              tags: row[7] ? row[7].split('|').filter(Boolean) : [],
            },
          ),
        )
        break
      case '운동':
        payload.exerciseRecords.push(
          ensureUserOwned(
            (json as ExerciseRecord | null) ?? {
              id: row[1] || generateId(),
              date: row[2] ?? '',
              type: row[3] ?? '',
              duration: row[4] ? Number(row[4]) : undefined,
              memo: row[5] || undefined,
            },
          ),
        )
        break
      case '습관':
        payload.habits.push(
          ensureUserOwned(
            (json as Habit | null) ?? {
              id: row[1] || generateId(),
              createdAt: row[2] ?? new Date().toISOString(),
              name: row[3] ?? '',
              type: (row[4] as HabitType) || 'good',
              emoji: row[5] ?? '✅',
              color: row[6] ?? '#888888',
            },
          ),
        )
        break
      case '습관체크':
        payload.habitLogs.push(
          ensureUserOwned(
            (json as HabitLog | null) ?? {
              id: row[1] || generateId(),
              date: row[2] ?? '',
              habitId: row[3] ?? '',
              completed: row[4] === 'Y' || row[4] === 'true',
            },
          ),
        )
        break
      case '생리':
        payload.periodRecords.push(
          ensureUserOwned(
            (json as PeriodRecord | null) ?? {
              id: row[1] || generateId(),
              startDate: row[2] ?? '',
              endDate: row[3] || undefined,
              memo: row[4] || undefined,
            },
          ),
        )
        break
      case '혈압':
        payload.bpRecords.push(
          ensureUserOwned(
            (json as BloodPressureRecord | null) ?? {
              id: row[1] || generateId(),
              date: row[2] ?? '',
              systolic: Number(row[3] ?? 0),
              diastolic: Number(row[4] ?? 0),
              memo: row[5] || undefined,
            },
          ),
        )
        break
      case '혈당':
        payload.sugarRecords.push(
          ensureUserOwned(
            (json as BloodSugarRecord | null) ?? {
              id: row[1] || generateId(),
              date: row[2] ?? '',
              value: Number(row[3] ?? 0),
              timing: (row[4] as BloodSugarRecord['timing']) || undefined,
              memo: row[5] || undefined,
            },
          ),
        )
        break
      case '수면':
        payload.sleepRecords.push(
          ensureUserOwned(
            (json as SleepRecord | null) ?? {
              id: row[1] || generateId(),
              date: row[2] ?? '',
              hours: row[3] ? Number(row[3]) : 0,
              quality: row[4] ? (Number(row[4]) as SleepRecord['quality']) : undefined,
              memo: row[5] || undefined,
            },
          ),
        )
        break
      case '병원':
        payload.hospitalRecords.push(
          ensureUserOwned(
            (json as HospitalRecord | null) ?? {
              id: row[1] || generateId(),
              date: row[2] ?? '',
              hospital: row[3] ?? '',
              treatment: row[4] ?? '',
              amount: row[5] ? Number(row[5]) : undefined,
              memo: row[6] || undefined,
            },
          ),
        )
        break
      default:
        break
    }
  }

  return payload
}

export async function importAllDataCsv(file: File) {
  const text = await readFileText(file)
  const rows = parseCsvText(text)
  if (rows.length === 0) throw new Error('CSV 파일에 데이터가 없습니다.')
  const payload = rowsToPayload(rows)
  await restoreAllNanakiData(payload)
}
