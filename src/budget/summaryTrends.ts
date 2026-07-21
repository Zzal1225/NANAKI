import {
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import type { Expense } from '../types'
import { formatCurrency, shiftMonth } from '../utils/dates'
import { countMonthZeroSpendDays, sumWeekVariableSpend } from './noSpend'

export type TrendDirection = 'up' | 'down' | 'flat'

export type AmountTrend = {
  kind: 'amount'
  direction: TrendDirection
  value: number
  label: string
}

export type DaysTrend = {
  kind: 'days'
  direction: TrendDirection
  value: number
  label: string
}

/** 비교 기준 기간에 데이터가 없을 때 */
export type UnavailableTrend = {
  kind: 'unavailable'
  direction: 'flat'
  value: 0
  label: string
}

export type SummaryTrend = AmountTrend | DaysTrend | UnavailableTrend

const NO_COMPARE_LABEL = '비교할 데이터 없음'

export function unavailableTrend(label = NO_COMPARE_LABEL): UnavailableTrend {
  return { kind: 'unavailable', direction: 'flat', value: 0, label }
}

function directionFromDelta(delta: number): TrendDirection {
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

function formatAmountDelta(delta: number) {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${formatCurrency(delta)}`
}

function monthHasSpendData(expenses: Expense[], month: string) {
  return expenses.some((e) => e.date.startsWith(month) && e.amount > 0)
}

function weekHasSpendData(expenses: Expense[], weekRef: Date) {
  const from = format(startOfWeek(weekRef, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const to = format(endOfWeek(weekRef, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return expenses.some(
    (e) => e.type === 'variable' && e.date >= from && e.date <= to && e.amount > 0,
  )
}

/** 지출액 지난 달 대비 금액 — previous에 실제 지출이 있을 때만 */
export function spendAmountTrend(current: number, previous: number): AmountTrend | null {
  if (previous <= 0) return null
  const delta = current - previous
  const direction = directionFromDelta(delta)
  return {
    kind: 'amount',
    direction,
    value: delta,
    label: `지난 달 대비 ${formatAmountDelta(delta)}`,
  }
}

/** 무지출 일수 지난 달(동일 기간) 대비 */
export function zeroSpendDaysTrend(current: number, previous: number): DaysTrend | null {
  const delta = current - previous
  const direction = directionFromDelta(delta)
  const sign = delta > 0 ? '+' : ''
  return {
    kind: 'days',
    direction,
    value: delta,
    label: `지난 달보다 ${sign}${delta}일`,
  }
}

/** 이번 주 vs 지난 주 소비(변동만) — 금액 차 */
export function weekSpendTrend(current: number, previous: number): AmountTrend | null {
  if (previous <= 0) return null
  const delta = current - previous
  const direction = directionFromDelta(delta)
  return {
    kind: 'amount',
    direction,
    value: delta,
    label: `지난 주 대비 ${formatAmountDelta(delta)}`,
  }
}

export function sumMonthSpend(expenses: Expense[], month: string) {
  return expenses.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
}

/**
 * 지난 달 동일 구간 무지출 일수
 * - 이번 달이면 1일~오늘과 같은 일수만큼 지난 달에서 집계
 * - 과거 달이면 해당 월 전체 vs 지난 달 전체
 */
export function countComparableZeroSpendDays(
  viewMonth: string,
  prevMonthExpenses: Expense[],
  today: string,
): number {
  const todayDate = parseISO(today)
  const prevMonth = shiftMonth(viewMonth, -1)
  const isCurrentMonth = today.startsWith(viewMonth)

  if (isCurrentMonth) {
    const dayNum = getDate(todayDate)
    const prevMonthEndDay = getDate(endOfMonth(parseISO(`${prevMonth}-01`)))
    const compareDay = Math.min(dayNum, prevMonthEndDay)
    const compareAsOf = `${prevMonth}-${String(compareDay).padStart(2, '0')}`
    return countMonthZeroSpendDays(prevMonth, prevMonthExpenses, compareAsOf)
  }

  const prevEnd = format(endOfMonth(parseISO(`${prevMonth}-01`)), 'yyyy-MM-dd')
  return countMonthZeroSpendDays(prevMonth, prevMonthExpenses, prevEnd)
}

export function sumPreviousWeekSpend(expenses: Expense[], today: Date = new Date()) {
  return sumWeekVariableSpend(expenses, subWeeks(today, 1))
}

export function buildSummaryTrends(params: {
  month: string
  today: string
  totalSpent: number
  zeroSpendDays: number
  weekSpent: number
  prevMonthExpenses: Expense[]
  allExpenses: Expense[]
}): {
  spendTrend: SummaryTrend
  zeroSpendTrend: SummaryTrend
  weekTrend: SummaryTrend
} {
  const prevMonth = shiftMonth(params.month, -1)
  const todayDate = parseISO(params.today)
  const isCurrentMonth = params.month === params.today.slice(0, 7)
  const hasPrevMonth = monthHasSpendData(params.prevMonthExpenses, prevMonth)
  const hasPrevWeek =
    isCurrentMonth && weekHasSpendData(params.allExpenses, subWeeks(todayDate, 1))

  const weekTrend = hasPrevWeek
    ? weekSpendTrend(params.weekSpent, sumPreviousWeekSpend(params.allExpenses, todayDate)) ??
      unavailableTrend()
    : unavailableTrend()

  if (!hasPrevMonth) {
    const none = unavailableTrend()
    return {
      spendTrend: none,
      zeroSpendTrend: none,
      weekTrend,
    }
  }

  const prevTotal = sumMonthSpend(params.prevMonthExpenses, prevMonth)
  const prevZero = countComparableZeroSpendDays(
    params.month,
    params.prevMonthExpenses,
    params.today,
  )

  return {
    spendTrend: spendAmountTrend(params.totalSpent, prevTotal) ?? unavailableTrend(),
    zeroSpendTrend: zeroSpendDaysTrend(params.zeroSpendDays, prevZero) ?? unavailableTrend(),
    weekTrend,
  }
}
