import type { BudgetCategory, BudgetSettings, CategoryBudgetItem, Expense } from '../types'
import type { CategorySpendSlice } from '../components/budget/BudgetOverview'
import { computeBudgetOverviewStats } from './budgetOverviewStats'
import {
  filterCategoryExpenses,
  findOrphanExpenses,
  summarizeSubItemSpending,
} from './categoryMatch'
import { getCategoryBudgetTotal, getEnabledCategories } from './monthSettings'
import { calculateFixedVariableBudget } from './calculateBudgetSplit'

export type BudgetPageStats = {
  fixedExpenses: Expense[]
  variableExpenses: Expense[]
  variableSpent: number
  fixedSpent: number
  totalSpent: number
  orphanExpenses: Expense[]
  budgetCategories: BudgetCategory[]
  chartBudget: number
  chartSpent: number
  chartCategorySpends: CategorySpendSlice[]
  legendCategories: string[]
  hasUnsetBudgetCategories: boolean
  totalBudget: number
  fixedBudget: number
  variableBudget: number
  showTotalSpendEmpty: boolean
  showVariableSpendEmpty: boolean
  showTotalBudgetEmpty: boolean
}

export function computeBudgetPageStats(
  settings: BudgetSettings,
  expenses: Expense[],
): BudgetPageStats {
  const fixedExpenses = expenses.filter((e) => e.type === 'fixed')
  const variableExpenses = expenses.filter((e) => e.type === 'variable')
  const variableSpent = variableExpenses.reduce((s, e) => s + e.amount, 0)
  const fixedSpent = fixedExpenses.reduce((s, e) => s + e.amount, 0)
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const orphanExpenses = findOrphanExpenses(expenses, settings.categories)
  const budgetCategories = getEnabledCategories(settings.categories, settings)
  const overview = computeBudgetOverviewStats(settings, expenses)
  const { fixedBudget, variableBudget } = calculateFixedVariableBudget(
    overview.chartBudget,
    settings.budgetItems,
    fixedSpent,
  )

  return {
    fixedExpenses,
    variableExpenses,
    variableSpent,
    fixedSpent,
    totalSpent,
    orphanExpenses,
    budgetCategories,
    chartBudget: overview.chartBudget,
    chartSpent: overview.chartSpent,
    chartCategorySpends: overview.chartCategorySpends,
    legendCategories: overview.legendCategories,
    hasUnsetBudgetCategories: overview.hasUnsetBudgetCategories,
    totalBudget: overview.chartBudget,
    fixedBudget,
    variableBudget,
    showTotalSpendEmpty: expenses.length === 0,
    showVariableSpendEmpty: variableExpenses.length === 0,
    showTotalBudgetEmpty: overview.chartBudget === 0,
  }
}

export type CategoryModalStats = {
  expenses: Expense[]
  budget: number
  spent: number
  slices: CategorySpendSlice[]
}

export function computeCategoryModalStats(
  expenses: Expense[],
  category: BudgetCategory | null,
  budgetItems: CategoryBudgetItem[] | undefined,
): CategoryModalStats {
  if (!category) {
    return { expenses: [], budget: 0, spent: 0, slices: [] }
  }

  const categoryExpenses = filterCategoryExpenses(expenses, category)
  const budget = getCategoryBudgetTotal(budgetItems, category.id)
  const spent = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const slices = summarizeSubItemSpending(expenses, category).map(({ subItem, spent: sliceSpent }) => ({
    name: subItem,
    spent: sliceSpent,
  }))

  return { expenses: categoryExpenses, budget, spent, slices }
}
