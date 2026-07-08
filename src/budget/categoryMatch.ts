import type { BudgetCategory, Expense } from '../types'
import { resolveLegacyCategoryName } from '../utils/dates'

export function remapExpenseToCategories(
  expense: Expense,
  categories: BudgetCategory[],
): Expense {
  const byId = categories.find((c) => c.id === expense.categoryId)
  if (byId) {
    return { ...expense, categoryId: byId.id, categoryName: byId.name }
  }
  const byName = categories.find(
    (c) => c.name === expense.categoryName || c.name === resolveLegacyCategoryName(expense.categoryName),
  )
  if (byName) {
    return { ...expense, categoryId: byName.id, categoryName: byName.name }
  }
  return expense
}

export function expenseBelongsToCategory(expense: Expense, cat: BudgetCategory) {
  return expense.categoryId === cat.id || expense.categoryName === cat.name
}

export function filterCategoryExpenses(expenses: Expense[], cat: BudgetCategory) {
  return expenses.filter((e) => expenseBelongsToCategory(e, cat))
}

export function findOrphanExpenses(expenses: Expense[], categories: BudgetCategory[]) {
  return expenses.filter(
    (e) => !categories.some((c) => expenseBelongsToCategory(e, c)),
  )
}

export function expenseDisplayLabel(expense: Expense) {
  return expense.subItem?.trim() || expense.categoryName
}

export function sumSubItemExpenses(expenses: Expense[], cat: BudgetCategory, subItem: string) {
  const key = subItem.trim()
  return filterCategoryExpenses(expenses, cat)
    .filter((e) => (e.subItem?.trim() || '') === key)
    .reduce((s, e) => s + e.amount, 0)
}

export interface SubItemSpendSummary {
  subItem: string
  spent: number
}

export function summarizeSubItemSpending(expenses: Expense[], cat: BudgetCategory): SubItemSpendSummary[] {
  const totals = new Map<string, number>()

  for (const expense of filterCategoryExpenses(expenses, cat)) {
    const key = expense.subItem?.trim() || '기타'
    totals.set(key, (totals.get(key) ?? 0) + expense.amount)
  }

  return [...totals.entries()]
    .map(([subItem, spent]) => ({ subItem, spent }))
    .sort((a, b) => b.spent - a.spent || a.subItem.localeCompare(b.subItem, 'ko'))
}

export function filterCategoryExpensesBySubItem(
  expenses: Expense[],
  cat: BudgetCategory,
  subItem: string,
) {
  const key = subItem.trim()
  return filterCategoryExpenses(expenses, cat).filter((e) => (e.subItem?.trim() || '기타') === key)
}

export function expenseNeedsMigration(
  raw: Expense & { memo?: string },
  categories: BudgetCategory[],
): boolean {
  if (raw.memo && !raw.subItem) return true
  const remapped = remapExpenseToCategories(
    raw.subItem ? raw : { ...raw, subItem: raw.memo },
    categories,
  )
  return (
    remapped.categoryId !== raw.categoryId ||
    remapped.categoryName !== raw.categoryName ||
    remapped.subItem !== raw.subItem
  )
}
