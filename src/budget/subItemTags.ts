import type { BudgetCategory, Expense } from '../types'
import { expenseBelongsToCategory } from './categoryMatch'

/** 지출·예산에 사용된 세부항목 태그 (중복 제거, 가나다순) */
export function collectSubItemTags(
  expenses: Expense[],
  category?: BudgetCategory | null,
): string[] {
  const tags = new Set<string>()
  for (const expense of expenses) {
    if (category && !expenseBelongsToCategory(expense, category)) continue
    const name = expense.subItem?.trim()
    if (name) tags.add(name)
  }
  return [...tags].sort((a, b) => a.localeCompare(b, 'ko'))
}

export function filterSubItemTags(tags: string[], query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return tags.slice(0, limit)
  return tags.filter((tag) => tag.toLowerCase().includes(q)).slice(0, limit)
}
