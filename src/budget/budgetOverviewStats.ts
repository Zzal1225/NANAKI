import type { CategorySpendSlice } from '../components/budget/BudgetOverview'
import type { BudgetSettings, Expense } from '../types'
import { filterCategoryExpenses } from './categoryMatch'
import {
  getCategoryBudgetTotal,
  getEnabledCategories,
  isCategoryBudgetUnset,
} from './monthSettings'

export function computeBudgetOverviewStats(settings: BudgetSettings, expenses: Expense[]) {
  const enabled = getEnabledCategories(settings.categories, settings)
  const budgeted = enabled.filter((cat) => !isCategoryBudgetUnset(settings.budgetItems, cat.id))

  const chartCategorySpends: CategorySpendSlice[] = budgeted.map((cat) => ({
    name: cat.name,
    spent: filterCategoryExpenses(expenses, cat).reduce((s, e) => s + e.amount, 0),
  }))

  const chartBudget = budgeted.reduce(
    (sum, cat) => sum + getCategoryBudgetTotal(settings.budgetItems, cat.id),
    0,
  )
  const chartSpent = chartCategorySpends.reduce((sum, slice) => sum + slice.spent, 0)
  const hasUnsetBudgetCategories = enabled.some((cat) =>
    isCategoryBudgetUnset(settings.budgetItems, cat.id),
  )

  return {
    chartBudget,
    chartSpent,
    chartCategorySpends,
    legendCategories: enabled.map((c) => c.name),
    hasUnsetBudgetCategories,
  }
}
