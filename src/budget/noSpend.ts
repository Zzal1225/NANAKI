import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  min as minDate,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { Expense } from '../types'

/**
 * 이번 달 무지출 일수
 * - 변동 지출이 없는 날만 카운트 (고정 지출은 소비로 보지 않음)
 * - 이번 달이면 1일~오늘까지, 과거 달이면 해당 월 전체
 * - 미래 날짜는 제외
 */
export function countMonthZeroSpendDays(
  month: string,
  expenses: Expense[],
  today: string = format(new Date(), 'yyyy-MM-dd'),
): number {
  const monthStart = startOfMonth(parseISO(`${month}-01`))
  const monthEnd = endOfMonth(monthStart)
  const todayDate = parseISO(today)

  if (todayDate < monthStart) return 0

  const rangeEnd = minDate([monthEnd, todayDate])
  const days = eachDayOfInterval({ start: monthStart, end: rangeEnd })

  const spendDates = new Set(
    expenses
      .filter((e) => e.type === 'variable' && e.date.startsWith(month) && e.amount > 0)
      .map((e) => e.date),
  )

  return days.filter((d) => !spendDates.has(format(d, 'yyyy-MM-dd'))).length
}

/** 이번 주(월~일) 지출 합계 — 고정+변동 */
export function sumThisWeekSpend(
  expenses: Expense[],
  today: Date = new Date(),
): number {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const from = format(weekStart, 'yyyy-MM-dd')
  const to = format(weekEnd, 'yyyy-MM-dd')

  return expenses
    .filter((e) => e.date >= from && e.date <= to)
    .reduce((sum, e) => sum + e.amount, 0)
}
