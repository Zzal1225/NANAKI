import { endOfWeek, format, startOfWeek } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Expense } from '../types'

export type ExpenseSortMode = 'latest' | 'amount' | 'frequency'

export function sumExpensesInRange(expenses: Expense[], startDate: string, endDate: string) {
  return expenses
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .reduce((s, e) => s + e.amount, 0)
}

export function filterExpensesInRange(expenses: Expense[], startDate: string, endDate: string) {
  return expenses.filter((e) => e.date >= startDate && e.date <= endDate)
}

export function getThisWeekRange() {
  const now = new Date()
  const weekOptions = { weekStartsOn: 1 as const, locale: ko }
  return {
    start: format(startOfWeek(now, weekOptions), 'yyyy-MM-dd'),
    end: format(endOfWeek(now, weekOptions), 'yyyy-MM-dd'),
  }
}

export function sortExpenses(expenses: Expense[], mode: ExpenseSortMode): Expense[] {
  const list = [...expenses]
  if (mode === 'latest') {
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }
  if (mode === 'amount') {
    return list.sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date))
  }
  const freq = new Map<string, number>()
  for (const e of list) {
    const key = `${e.categoryName}|${e.subItem ?? ''}`
    freq.set(key, (freq.get(key) ?? 0) + 1)
  }
  return list.sort((a, b) => {
    const keyA = `${a.categoryName}|${a.subItem ?? ''}`
    const keyB = `${b.categoryName}|${b.subItem ?? ''}`
    const diff = (freq.get(keyB) ?? 0) - (freq.get(keyA) ?? 0)
    return diff !== 0 ? diff : b.date.localeCompare(a.date)
  })
}
