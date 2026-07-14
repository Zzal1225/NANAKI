import {
  getAllArchiveItems,
  getAllBodyPhotos,
  getAllBodyRecords,
  getAllBudgetSettings,
  getAllExpenses,
  getAllHabits,
  getAllLifeRoutines,
  getAllPantryItems,
  getAllSupplementIntakeLogs,
  getAllSupplementProducts,
  getHabitLogsInRange,
} from '../db'
import {
  getExpenseEffectiveFrom,
  isRecurringVersionDefinition,
} from '../budget/recurringFixed'
import { currentMonth } from './dates'

/** YYYY-MM-DD / ISO / YYYY-MM → YYYY-MM */
export function toYearMonth(value: string | undefined | null): string | null {
  if (!value) return null
  const month = value.slice(0, 7)
  return /^\d{4}-\d{2}$/.test(month) ? month : null
}

/** 데이터가 존재하는 최초 월. 없으면 fallback(기본: 이번 달) */
export function resolveDataStartMonth(
  values: Array<string | undefined | null>,
  fallback = currentMonth(),
): string {
  const months = values.map(toYearMonth).filter((m): m is string => m != null)
  if (months.length === 0) return fallback
  return months.sort()[0]
}

/** 가계부 — 예산 설정 · 지출(반복 시작월 포함) */
export async function getBudgetDataStartMonth(): Promise<string> {
  const [settings, expenses] = await Promise.all([getAllBudgetSettings(), getAllExpenses()])
  const months: string[] = settings.map((s) => s.month)

  for (const expense of expenses) {
    if (isRecurringVersionDefinition(expense)) {
      months.push(expense.recurringStartMonth ?? getExpenseEffectiveFrom(expense))
    } else {
      months.push(expense.date.slice(0, 7))
    }
  }

  return resolveDataStartMonth(months)
}

/** 건강 — 체형 · 눈바디 · 영양제 */
export async function getHealthDataStartMonth(): Promise<string> {
  const [bodies, photos, products, logs] = await Promise.all([
    getAllBodyRecords(),
    getAllBodyPhotos(),
    getAllSupplementProducts(),
    getAllSupplementIntakeLogs(),
  ])

  const months: Array<string | undefined | null> = [
    ...bodies.map((b) => b.date),
    ...photos.map((p) => p.date),
    ...logs.map((l) => l.date),
  ]

  for (const p of products) {
    months.push(p.startedAt, p.endedAt, p.createdAt)
    for (const h of p.purchaseHistory ?? []) months.push(h.date)
  }

  return resolveDataStartMonth(months)
}

/** 생활 — 반복 · 냉장고 · (구매주기용) 지출 */
export async function getLifeDataStartMonth(): Promise<string> {
  const [routines, pantry, expenses] = await Promise.all([
    getAllLifeRoutines(),
    getAllPantryItems(),
    getAllExpenses(),
  ])

  return resolveDataStartMonth([
    ...routines.flatMap((r) => [r.nextDueAt, r.lastDoneAt, r.createdAt]),
    ...pantry.flatMap((p) => [p.expiresAt, p.purchasedAt, p.createdAt]),
    ...expenses.map((e) => e.date),
  ])
}

/** 기록 */
export async function getRecordsDataStartMonth(): Promise<string> {
  const items = await getAllArchiveItems()
  return resolveDataStartMonth(items.map((i) => i.date))
}

/** 습관 */
export async function getHabitsDataStartMonth(): Promise<string> {
  const [habits, logs] = await Promise.all([
    getAllHabits(),
    getHabitLogsInRange('0000-01-01', '9999-12-31'),
  ])
  return resolveDataStartMonth([
    ...habits.map((h) => h.createdAt),
    ...logs.map((l) => l.date),
  ])
}

/** 홈 — 전 탭 데이터 중 최초 월 */
export async function getHomeDataStartMonth(): Promise<string> {
  const months = await Promise.all([
    getBudgetDataStartMonth(),
    getHealthDataStartMonth(),
    getLifeDataStartMonth(),
    getRecordsDataStartMonth(),
    getHabitsDataStartMonth(),
  ])
  return resolveDataStartMonth(months)
}
