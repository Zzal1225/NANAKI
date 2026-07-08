import { getExpensesInRange } from '../db'
import type { BudgetCategory, Expense } from '../types'
import { formatCurrency } from '../utils/dates'

export interface ExpenseSearchFilters {
  keyword?: string
  amountMin?: number
  amountMax?: number
  dateStart: string
  dateEnd: string
  /** 비어 있으면 전체 카테고리 */
  categoryIds?: string[]
}

function matchesKeyword(expense: Expense, keyword: string): boolean {
  const q = keyword.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    expense.subItem,
    expense.categoryName,
    formatCurrency(expense.amount),
    String(expense.amount),
  ]
  return haystack.some((part) => part?.toLowerCase().includes(q))
}

export function filterExpenses(expenses: Expense[], filters: ExpenseSearchFilters): Expense[] {
  const categorySet =
    filters.categoryIds && filters.categoryIds.length > 0
      ? new Set(filters.categoryIds)
      : null

  return expenses.filter((expense) => {
    if (expense.date < filters.dateStart || expense.date > filters.dateEnd) return false
    if (filters.amountMin != null && expense.amount < filters.amountMin) return false
    if (filters.amountMax != null && expense.amount > filters.amountMax) return false
    if (categorySet && !categorySet.has(expense.categoryId)) return false
    if (!matchesKeyword(expense, filters.keyword ?? '')) return false
    return true
  })
}

export async function searchExpenses(filters: ExpenseSearchFilters): Promise<Expense[]> {
  const inRange = await getExpensesInRange(filters.dateStart, filters.dateEnd)
  return filterExpenses(inRange, filters).sort((a, b) => b.date.localeCompare(a.date))
}

export function sumExpenseAmounts(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0)
}

export function getDefaultExpenseSearchRange(month: string): { dateStart: string; dateEnd: string } {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return {
    dateStart: `${month}-01`,
    dateEnd: `${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function categoryOptions(categories: BudgetCategory[]): BudgetCategory[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}
