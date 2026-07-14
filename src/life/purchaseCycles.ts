import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { Expense } from '../types'
import { todayISO } from '../utils/dates'

export type PurchaseCycle = {
  key: string
  name: string
  purchaseCount: number
  avgIntervalDays: number
  lastPurchasedAt: string
  expectedNextAt: string
  daysUntilExpected: number
  /** 예상일 지남 또는 임박(≤7일) */
  urgency: 'overdue' | 'soon' | 'ok'
  totalAmount: number
}

const MIN_PURCHASES = 2
const SOON_DAYS = 7

/** 집계 키: 세부항목 우선, 없으면 카테고리명 */
export function purchaseCycleKey(expense: Expense) {
  return expense.subItem?.trim() || expense.categoryName
}

/**
 * 가계부 지출에서 구매 주기 분석.
 * 동일 키로 2회 이상 구매된 항목만, 인접 구매 간격 평균으로 다음 예상일 산출.
 */
export function analyzePurchaseCycles(
  expenses: Expense[],
  today = todayISO(),
): PurchaseCycle[] {
  const byKey = new Map<string, Expense[]>()

  for (const e of expenses) {
    if (e.amount <= 0) continue
    const key = purchaseCycleKey(e)
    if (!key) continue
    const list = byKey.get(key) ?? []
    list.push(e)
    byKey.set(key, list)
  }

  const cycles: PurchaseCycle[] = []

  for (const [key, list] of byKey) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
    const uniqueDates = [...new Set(sorted.map((e) => e.date))]
    if (uniqueDates.length < MIN_PURCHASES) continue

    const gaps: number[] = []
    for (let i = 1; i < uniqueDates.length; i++) {
      gaps.push(differenceInCalendarDays(parseISO(uniqueDates[i]), parseISO(uniqueDates[i - 1])))
    }
    const avgIntervalDays = Math.max(1, Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length))
    const lastPurchasedAt = uniqueDates[uniqueDates.length - 1]
    const expectedNextAt = format(addDays(parseISO(lastPurchasedAt), avgIntervalDays), 'yyyy-MM-dd')
    const daysUntilExpected = differenceInCalendarDays(parseISO(expectedNextAt), parseISO(today))

    let urgency: PurchaseCycle['urgency'] = 'ok'
    if (daysUntilExpected < 0) urgency = 'overdue'
    else if (daysUntilExpected <= SOON_DAYS) urgency = 'soon'

    cycles.push({
      key,
      name: key,
      purchaseCount: uniqueDates.length,
      avgIntervalDays,
      lastPurchasedAt,
      expectedNextAt,
      daysUntilExpected,
      urgency,
      totalAmount: sorted.reduce((s, e) => s + e.amount, 0),
    })
  }

  return cycles.sort((a, b) => {
    const urgencyRank = { overdue: 0, soon: 1, ok: 2 }
    const ur = urgencyRank[a.urgency] - urgencyRank[b.urgency]
    if (ur !== 0) return ur
    return a.daysUntilExpected - b.daysUntilExpected || a.name.localeCompare(b.name, 'ko')
  })
}

export function formatExpectedLabel(daysUntil: number) {
  if (daysUntil < 0) return `${Math.abs(daysUntil)}일 지남`
  if (daysUntil === 0) return '오늘'
  return `${daysUntil}일 후`
}
