import { getAllBudgetSettings, getAllExpenses } from '../db'
import { currentMonth } from '../utils/dates'
import {
  getExpenseEffectiveFrom,
  isRecurringVersionDefinition,
} from './recurringFixed'

/** 가계부 데이터가 존재하는 최초 월 (예산 설정·지출 기준) */
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

  if (months.length === 0) return currentMonth()
  return months.sort()[0]
}
