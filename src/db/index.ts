import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { addDays, format, parseISO, subDays } from 'date-fns'
import { remapExpenseToCategories } from '../budget/categoryMatch'
import type { AppSettings, ArchiveItem, BloodPressureRecord, BloodSugarRecord, BodyRecord, BudgetCategory, BudgetSettings, ExerciseRecord, Expense, Habit, HabitLog, HospitalRecord, PeriodContext, PeriodRecord, SleepRecord } from '../types'
import { DEFAULT_APP_SETTINGS } from '../config/sections'
import { ensureUserOwned, stampUserOwned, type UserOwnedInput } from './recordDefaults'
import {
  appendRecurringExpenses,
  getExpenseEffectiveFrom,
  isLegacyRecurringMaster,
  deleteExpenseInMonth,
  isRecurringVersionDefinition,
} from '../budget/recurringFixed'
import { enqueueMutation, registerSyncDB } from '../sync/queue'
import type { SyncStoreName } from '../sync/types'

interface NanakiDB extends DBSchema {
  budgetSettings: {
    key: string
    value: BudgetSettings
    indexes: { 'by-month': string }
  }
  expenses: {
    key: string
    value: Expense
    indexes: { 'by-date': string }
  }
  bodyRecords: {
    key: string
    value: BodyRecord
    indexes: { 'by-date': string }
  }
  archiveItems: {
    key: string
    value: ArchiveItem
    indexes: { 'by-date': string; 'by-type': string }
  }
  habits: { key: string; value: Habit }
  habitLogs: {
    key: string
    value: HabitLog
    indexes: { 'by-date': string; 'by-habit': string }
  }
  periodRecords: {
    key: string
    value: PeriodRecord
    indexes: { 'by-start': string }
  }
  bpRecords: {
    key: string
    value: BloodPressureRecord
    indexes: { 'by-date': string }
  }
  sugarRecords: {
    key: string
    value: BloodSugarRecord
    indexes: { 'by-date': string }
  }
  sleepRecords: {
    key: string
    value: SleepRecord
    indexes: { 'by-date': string }
  }
  hospitalRecords: {
    key: string
    value: HospitalRecord
    indexes: { 'by-date': string }
  }
  exerciseRecords: {
    key: string
    value: ExerciseRecord
    indexes: { 'by-date': string }
  }
  appSettings: {
    key: string
    value: AppSettings
  }
  syncQueue: {
    key: string
    value: import('../sync/types').SyncMutation
    indexes: { 'by-synced': number }
  }
  syncConfig: {
    key: string
    value: import('../sync/types').SyncConfig
  }
}

const DB_NAME = 'nanaki-db'
export { DB_NAME }
const DB_VERSION = 3

let dbPromise: Promise<IDBPDatabase<NanakiDB>> | null = null

export function resetDbConnection() {
  dbPromise = null
}

function getMonthFromDate(date: string) {
  return date.slice(0, 7)
}

const VIRTUAL_EXPENSE_SEP = '__'

export function resolveExpenseMasterId(id: string) {
  const idx = id.indexOf(VIRTUAL_EXPENSE_SEP)
  return idx === -1 ? id : id.slice(0, idx)
}

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<NanakiDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('budgetSettings')) {
            const s = db.createObjectStore('budgetSettings', { keyPath: 'id' })
            s.createIndex('by-month', 'month')
          }
          if (!db.objectStoreNames.contains('expenses')) {
            const s = db.createObjectStore('expenses', { keyPath: 'id' })
            s.createIndex('by-date', 'date')
          }
          if (!db.objectStoreNames.contains('bodyRecords')) {
            const s = db.createObjectStore('bodyRecords', { keyPath: 'id' })
            s.createIndex('by-date', 'date')
          }
          if (!db.objectStoreNames.contains('archiveItems')) {
            const s = db.createObjectStore('archiveItems', { keyPath: 'id' })
            s.createIndex('by-date', 'date')
            s.createIndex('by-type', 'type')
          }
          if (!db.objectStoreNames.contains('habits')) {
            db.createObjectStore('habits', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('habitLogs')) {
            const s = db.createObjectStore('habitLogs', { keyPath: 'id' })
            s.createIndex('by-date', 'date')
            s.createIndex('by-habit', 'habitId')
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('periodRecords')) {
            const s = db.createObjectStore('periodRecords', { keyPath: 'id' })
            s.createIndex('by-start', 'startDate')
          }
          if (!db.objectStoreNames.contains('bpRecords')) {
            const s = db.createObjectStore('bpRecords', { keyPath: 'id' })
            s.createIndex('by-date', 'date')
          }
          if (!db.objectStoreNames.contains('sugarRecords')) {
            const s = db.createObjectStore('sugarRecords', { keyPath: 'id' })
            s.createIndex('by-date', 'date')
          }
          if (!db.objectStoreNames.contains('sleepRecords')) {
            const s = db.createObjectStore('sleepRecords', { keyPath: 'id' })
            s.createIndex('by-date', 'date')
          }
          if (!db.objectStoreNames.contains('hospitalRecords')) {
            const s = db.createObjectStore('hospitalRecords', { keyPath: 'id' })
            s.createIndex('by-date', 'date')
          }
          if (!db.objectStoreNames.contains('exerciseRecords')) {
            const s = db.createObjectStore('exerciseRecords', { keyPath: 'id' })
            s.createIndex('by-date', 'date')
          }
          if (!db.objectStoreNames.contains('appSettings')) {
            db.createObjectStore('appSettings', { keyPath: 'id' })
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('syncQueue')) {
            const s = db.createObjectStore('syncQueue', { keyPath: 'id' })
            s.createIndex('by-synced', 'synced')
          }
          if (!db.objectStoreNames.contains('syncConfig')) {
            db.createObjectStore('syncConfig', { keyPath: 'id' })
          }
        }
      },
    })
  }
  return dbPromise
}

async function putTracked<T extends { id: string }>(
  idbStore: keyof NanakiDB,
  syncStore: SyncStoreName,
  item: T,
) {
  const db = await getDB()
  const stamped = stampUserOwned(item as Record<string, unknown>) as T
  await db.put(idbStore as never, stamped as never)
  await enqueueMutation(syncStore, 'put', item.id, stamped)
}

async function deleteTracked(idbStore: keyof NanakiDB, syncStore: SyncStoreName, id: string) {
  const db = await getDB()
  await db.delete(idbStore as never, id as never)
  await enqueueMutation(syncStore, 'delete', id)
}

registerSyncDB(getDB as () => Promise<unknown>)

export function generateId() {
  return crypto.randomUUID()
}

// App Settings
export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDB()
  const settings = await db.get('appSettings', 'app-settings')
  return ensureUserOwned(settings ?? DEFAULT_APP_SETTINGS)
}

export async function saveAppSettings(settings: UserOwnedInput<AppSettings>) {
  const db = await getDB()
  await db.put('appSettings', stampUserOwned(settings))
}

// Budget
export async function getAllBudgetSettings() {
  const db = await getDB()
  const rows = await db.getAll('budgetSettings')
  return rows.map((row) => ensureUserOwned(row))
}

export async function getBudgetSettings(month: string) {
  const db = await getDB()
  const all = await db.getAllFromIndex('budgetSettings', 'by-month', month)
  return all[0] ? ensureUserOwned(all[0]) : null
}

export async function saveBudgetSettings(settings: UserOwnedInput<BudgetSettings>) {
  await putTracked('budgetSettings', 'budgetSettings', settings)
}

type LegacyExpense = Expense & { memo?: string }

function normalizeExpense(expense: LegacyExpense): Expense {
  let normalized: Expense
  if (expense.subItem) {
    const { memo: _memo, ...rest } = expense
    normalized = rest as Expense
  } else if (expense.memo) {
    const { memo, ...rest } = expense
    normalized = { ...rest, subItem: memo } as Expense
  } else {
    normalized = expense as Expense
  }

  if (normalized.type === 'fixed' && isLegacyRecurringMaster(normalized)) {
    const startMonth =
      normalized.recurringStartMonth === '0000-01' || normalized.effectiveFrom === '0000-01'
        ? normalized.date.slice(0, 7)
        : (normalized.recurringStartMonth ?? getExpenseEffectiveFrom(normalized))
    return ensureUserOwned({
      ...normalized,
      isRecurringMonthly: normalized.isRecurringMonthly ?? true,
      effectiveFrom:
        normalized.effectiveFrom === '0000-01' ? startMonth : (normalized.effectiveFrom ?? startMonth),
      recurringStartMonth: startMonth,
    })
  }
  if (
    normalized.type === 'fixed' &&
    normalized.isRecurringMonthly &&
    (normalized.recurringStartMonth === '0000-01' || normalized.effectiveFrom === '0000-01')
  ) {
    const startMonth = normalized.date.slice(0, 7)
    return ensureUserOwned({
      ...normalized,
      effectiveFrom: startMonth,
      recurringStartMonth: startMonth,
    })
  }
  if (normalized.type === 'fixed' && normalized.isRecurringMonthly === undefined) {
    return ensureUserOwned({ ...normalized, isRecurringMonthly: false })
  }
  return ensureUserOwned(normalized)
}

export async function getAllExpenses() {
  const db = await getDB()
  const records = await db.getAll('expenses')
  return records.map(normalizeExpense).sort((a, b) => b.date.localeCompare(a.date))
}

export async function getExpensesByMonth(month: string) {
  const all = await getAllExpenses()
  const inMonth = all.filter(
    (e) => getMonthFromDate(e.date) === month && !isRecurringVersionDefinition(e),
  )
  return appendRecurringExpenses(all, inMonth, month)
}

export async function getExpensesByDate(date: string) {
  const month = getMonthFromDate(date)
  const inMonth = await getExpensesByMonth(month)
  return inMonth.filter((e) => e.date === date)
}

export async function getExpensesInRange(startDate: string, endDate: string) {
  const all = await getAllExpenses()
  const physical = all.filter(
    (e) => e.date >= startDate && e.date <= endDate && !isRecurringVersionDefinition(e),
  )
  const startMonth = getMonthFromDate(startDate)
  const endMonth = getMonthFromDate(endDate)
  const months = new Set<string>([startMonth])
  {
    const [sy, sm] = startMonth.split('-').map(Number)
    const [ey, em] = endMonth.split('-').map(Number)
    let y = sy
    let m = sm
    while (y < ey || (y === ey && m <= em)) {
      months.add(`${y}-${String(m).padStart(2, '0')}`)
      m += 1
      if (m > 12) {
        m = 1
        y += 1
      }
    }
  }

  let virtual: Expense[] = []
  for (const month of months) {
    const inMonth = all.filter(
      (e) => getMonthFromDate(e.date) === month && !isRecurringVersionDefinition(e),
    )
    const expanded = appendRecurringExpenses(all, inMonth, month)
    virtual = virtual.concat(expanded.filter((e) => e.id.includes(VIRTUAL_EXPENSE_SEP)))
  }

  const merged = [...physical, ...virtual.filter((e) => e.date >= startDate && e.date <= endDate)]
  const seen = new Set<string>()
  return merged.filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })
}

export async function saveExpense(expense: UserOwnedInput<Expense>) {
  const normalized = normalizeExpense(expense as LegacyExpense)
  await putTracked('expenses', 'expenses', normalized)
}

export async function removeExpenseById(id: string) {
  await deleteTracked('expenses', 'expenses', id)
}

/** memo→subItem, 카테고리 ID/이름 정규화 (레거시 지출) */
export async function migrateLegacyExpenses(categories: BudgetCategory[]) {
  const db = await getDB()
  const raw = await db.getAll('expenses')
  for (const record of raw) {
    const legacy = record as LegacyExpense
    const expense = remapExpenseToCategories(normalizeExpense(legacy), categories)
    const changed =
      legacy.memo !== undefined ||
      legacy.categoryId !== expense.categoryId ||
      legacy.categoryName !== expense.categoryName ||
      legacy.subItem !== expense.subItem
    if (changed) {
      await saveExpense(expense)
    }
  }
}

export async function deleteExpense(id: string, viewMonth?: string) {
  if (viewMonth) {
    await deleteExpenseInMonth(id, viewMonth)
    return
  }

  const masterId = resolveExpenseMasterId(id)
  const all = await getAllExpenses()
  const target = all.find((e) => e.id === masterId)
  if (target?.isRecurringMonthly && target.recurringTemplateId) {
    const templateId = target.recurringTemplateId
    for (const expense of all) {
      if (isRecurringVersionDefinition(expense) && expense.recurringTemplateId === templateId) {
        await removeExpenseById(expense.id)
      }
    }
    return
  }
  await removeExpenseById(masterId)
}

// Body
export async function getAllBodyRecords() {
  const db = await getDB()
  const records = await db.getAll('bodyRecords')
  return records.map((row) => ensureUserOwned(row)).sort((a, b) => b.date.localeCompare(a.date))
}

export async function getBodyRecordsByDate(date: string) {
  const db = await getDB()
  return db.getAllFromIndex('bodyRecords', 'by-date', date)
}

export async function getBodyRecordsInRange(startDate: string, endDate: string) {
  const all = await getAllBodyRecords()
  return all.filter((r) => r.date >= startDate && r.date <= endDate)
}

export async function saveBodyRecord(record: UserOwnedInput<BodyRecord>) {
  await putTracked('bodyRecords', 'bodyRecords', record)
}

export async function deleteBodyRecord(id: string) {
  await deleteTracked('bodyRecords', 'bodyRecords', id)
}

// Health - Period
export async function getAllPeriodRecords() {
  const db = await getDB()
  const records = await db.getAll('periodRecords')
  return records.sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export async function savePeriodRecord(record: UserOwnedInput<PeriodRecord>) {
  await putTracked('periodRecords', 'periodRecords', record)
}

export async function deletePeriodRecord(id: string) {
  await deleteTracked('periodRecords', 'periodRecords', id)
}

// Health - BP
export async function getAllBpRecords() {
  const db = await getDB()
  const records = await db.getAll('bpRecords')
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getBpRecordsByDate(date: string) {
  const db = await getDB()
  return db.getAllFromIndex('bpRecords', 'by-date', date)
}

export async function saveBpRecord(record: UserOwnedInput<BloodPressureRecord>) {
  await putTracked('bpRecords', 'bpRecords', record)
}

export async function deleteBpRecord(id: string) {
  await deleteTracked('bpRecords', 'bpRecords', id)
}

// Health - Sugar
export async function getAllSugarRecords() {
  const db = await getDB()
  const records = await db.getAll('sugarRecords')
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getSugarRecordsByDate(date: string) {
  const db = await getDB()
  return db.getAllFromIndex('sugarRecords', 'by-date', date)
}

export async function saveSugarRecord(record: UserOwnedInput<BloodSugarRecord>) {
  await putTracked('sugarRecords', 'sugarRecords', record)
}

export async function deleteSugarRecord(id: string) {
  await deleteTracked('sugarRecords', 'sugarRecords', id)
}

// Health - Sleep
export async function getAllSleepRecords() {
  const db = await getDB()
  const records = await db.getAll('sleepRecords')
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getSleepRecordsByDate(date: string) {
  const db = await getDB()
  return db.getAllFromIndex('sleepRecords', 'by-date', date)
}

export async function saveSleepRecord(record: UserOwnedInput<SleepRecord>) {
  await putTracked('sleepRecords', 'sleepRecords', record)
}

export async function deleteSleepRecord(id: string) {
  await deleteTracked('sleepRecords', 'sleepRecords', id)
}

// Health - Hospital
export async function getAllHospitalRecords() {
  const db = await getDB()
  const records = await db.getAll('hospitalRecords')
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getHospitalRecordsByDate(date: string) {
  const db = await getDB()
  return db.getAllFromIndex('hospitalRecords', 'by-date', date)
}

export async function saveHospitalRecord(record: UserOwnedInput<HospitalRecord>) {
  await putTracked('hospitalRecords', 'hospitalRecords', record)
}

export async function deleteHospitalRecord(id: string) {
  await deleteTracked('hospitalRecords', 'hospitalRecords', id)
}

// Exercise
export async function getAllExerciseRecords() {
  const db = await getDB()
  const records = await db.getAll('exerciseRecords')
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getExerciseRecordsByDate(date: string) {
  const db = await getDB()
  return db.getAllFromIndex('exerciseRecords', 'by-date', date)
}

export async function getExerciseRecordsInRange(startDate: string, endDate: string) {
  const all = await getAllExerciseRecords()
  return all.filter((r) => r.date >= startDate && r.date <= endDate)
}

export async function saveExerciseRecord(record: UserOwnedInput<ExerciseRecord>) {
  await putTracked('exerciseRecords', 'exerciseRecords', record)
}

export async function deleteExerciseRecord(id: string) {
  await deleteTracked('exerciseRecords', 'exerciseRecords', id)
}

// Archive
export async function getAllArchiveItems() {
  const db = await getDB()
  const items = await db.getAll('archiveItems')
  return items.sort((a, b) => b.date.localeCompare(a.date))
}

export async function searchArchiveItems(query: string) {
  const items = await getAllArchiveItems()
  const q = query.toLowerCase().trim()
  if (!q) return items
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.memo?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q)),
  )
}

export async function getArchiveItemsByDate(date: string) {
  const db = await getDB()
  return db.getAllFromIndex('archiveItems', 'by-date', date)
}

export async function getArchiveItemsInRange(startDate: string, endDate: string) {
  const all = await getAllArchiveItems()
  return all.filter((a) => a.date >= startDate && a.date <= endDate)
}

export async function saveArchiveItem(item: UserOwnedInput<ArchiveItem>) {
  await putTracked('archiveItems', 'archiveItems', item)
}

export async function deleteArchiveItem(id: string) {
  await deleteTracked('archiveItems', 'archiveItems', id)
}

// Habits
export async function getAllHabits() {
  const db = await getDB()
  return db.getAll('habits')
}

export async function saveHabit(habit: UserOwnedInput<Habit>) {
  await putTracked('habits', 'habits', habit)
}

export async function deleteHabit(id: string) {
  const db = await getDB()
  const logs = await db.getAllFromIndex('habitLogs', 'by-habit', id)
  await deleteTracked('habits', 'habits', id)
  for (const log of logs) {
    await deleteTracked('habitLogs', 'habitLogs', log.id)
  }
}

export async function getHabitLogsByDate(date: string) {
  const db = await getDB()
  return db.getAllFromIndex('habitLogs', 'by-date', date)
}

export async function getHabitLogsInRange(startDate: string, endDate: string) {
  const db = await getDB()
  const all = await db.getAll('habitLogs')
  return all.filter((l) => l.date >= startDate && l.date <= endDate)
}

export async function toggleHabitLog(habitId: string, date: string) {
  const db = await getDB()
  const logs = await db.getAllFromIndex('habitLogs', 'by-date', date)
  const existing = logs.find((l) => l.habitId === habitId)

  if (existing) {
    const updated = stampUserOwned({ ...existing, completed: !existing.completed })
    await db.put('habitLogs', updated)
    await enqueueMutation('habitLogs', 'put', updated.id, updated)
    return updated
  }

  const newLog = stampUserOwned({
    id: generateId(),
    habitId,
    date,
    completed: true,
  })
  await db.put('habitLogs', newLog)
  await enqueueMutation('habitLogs', 'put', newLog.id, newLog)
  return newLog
}

export async function getDaySummary(date: string) {
  const [
    expenses, bodyRecords, archiveItems, habitLogs, habits,
    periodRecords, bpRecords, sugarRecords, sleepRecords, hospitalRecords,
    exercises,
  ] = await Promise.all([
    getExpensesByDate(date),
    getBodyRecordsByDate(date),
    getArchiveItemsByDate(date),
    getHabitLogsByDate(date),
    getAllHabits(),
    getAllPeriodRecords().then((all) => all.filter((p) => p.startDate <= date && (!p.endDate || p.endDate >= date))),
    getBpRecordsByDate(date),
    getSugarRecordsByDate(date),
    getSleepRecordsByDate(date),
    getHospitalRecordsByDate(date),
    getExerciseRecordsByDate(date),
  ])

  const habitMap = new Map(habits.map((h) => [h.id, h]))

  return {
    date,
    expenses,
    bodyRecords,
    archiveItems,
    habitLogs: habitLogs
      .filter((l) => l.completed)
      .map((l) => ({ ...l, habit: habitMap.get(l.habitId) })),
    periodRecords,
    bpRecords,
    sugarRecords,
    sleepRecords,
    hospitalRecords,
    exercises,
  }
}

export async function getPeriodContext(centerDate: string, rangeDays = 7): Promise<PeriodContext> {
  const startDate = format(subDays(parseISO(centerDate), rangeDays), 'yyyy-MM-dd')
  const endDate = format(addDays(parseISO(centerDate), rangeDays), 'yyyy-MM-dd')

  const [bodyRecords, expenses, exercises, habitLogs, habits, hospitalRecords, sleepRecords, archiveItems] =
    await Promise.all([
      getBodyRecordsInRange(startDate, endDate),
      getExpensesInRange(startDate, endDate),
      getExerciseRecordsInRange(startDate, endDate),
      getHabitLogsInRange(startDate, endDate),
      getAllHabits(),
      getAllHospitalRecords().then((all) => all.filter((r) => r.date >= startDate && r.date <= endDate)),
      getAllSleepRecords().then((all) => all.filter((r) => r.date >= startDate && r.date <= endDate)),
      getArchiveItemsInRange(startDate, endDate),
    ])

  const habitMap = new Map(habits.map((h) => [h.id, h]))

  return {
    centerDate,
    startDate,
    endDate,
    bodyRecords,
    expenses,
    exercises,
    habitLogs: habitLogs
      .filter((l) => l.completed)
      .map((l) => ({ ...l, habit: habitMap.get(l.habitId) })),
    hospitalRecords,
    sleepRecords,
    archiveItems,
  }
}

export async function getPeriodRecordsForDate(date: string) {
  const all = await getAllPeriodRecords()
  return all.filter((p) => p.startDate <= date && (!p.endDate || p.endDate >= date))
}
