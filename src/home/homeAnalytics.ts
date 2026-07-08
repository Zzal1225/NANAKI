import { format, subDays } from 'date-fns'
import { computeBudgetOverviewStats } from '../budget/budgetOverviewStats'
import { ensureBudgetSettingsForMonth } from '../budget/monthSettings'
import { sumExpensesInRange } from '../budget/spendingStats'
import {
  getAllBodyRecords,
  getAllExpenses,
  getAllHabits,
  getExpensesInRange,
  getHabitLogsInRange,
} from '../db'
import type { CategorySpendSlice } from '../components/budget/BudgetOverview'
import { currentMonth, todayISO } from '../utils/dates'

export interface HomeAnalyticsData {
  comparison: {
    weight?: { current: number | null; past: number | null }
    spending: { current: number; past: number }
    habitRate?: { current: number; past: number }
  }
  budget: {
    total: number
    spent: number
    categorySpends: CategorySpendSlice[]
    legendCategories: string[]
    hasUnsetBudgetCategories: boolean
  }
  dailySpending: { date: string; label: string; amount: number }[]
  monthLabel: string
  bodyRecordCount: number
  topCategories: { name: string; amount: number }[]
}

function habitCompletionRate(
  logs: Awaited<ReturnType<typeof getHabitLogsInRange>>,
  habitIds: string[],
  dayCount: number,
) {
  if (habitIds.length === 0 || dayCount <= 0) return 0
  const completed = logs.filter((l) => l.completed && habitIds.includes(l.habitId)).length
  return (completed / (habitIds.length * dayCount)) * 100
}

export async function loadHomeAnalytics(): Promise<HomeAnalyticsData> {
  const today = todayISO()
  const start30 = format(subDays(new Date(today), 29), 'yyyy-MM-dd')
  const start60 = format(subDays(new Date(today), 59), 'yyyy-MM-dd')
  const endPast30 = format(subDays(new Date(today), 30), 'yyyy-MM-dd')

  const [expenses, bodies, habits, logsCurrent, logsPast, monthExpenses, settings] =
    await Promise.all([
      getAllExpenses(),
      getAllBodyRecords(),
      getAllHabits(),
      getHabitLogsInRange(start30, today),
      getHabitLogsInRange(start60, endPast30),
      getExpensesInRange(`${currentMonth()}-01`, today),
      ensureBudgetSettingsForMonth(currentMonth()),
    ])

  const currentSpending = sumExpensesInRange(expenses, start30, today)
  const pastSpending = sumExpensesInRange(expenses, start60, endPast30)

  const currentBody = bodies.find((r) => r.date >= start30 && r.weight != null)
  const pastBody = bodies.find((r) => r.date >= start60 && r.date <= endPast30 && r.weight != null)

  const goodHabitIds = habits.filter((h) => h.type === 'good').map((h) => h.id)

  const overview = computeBudgetOverviewStats(settings, monthExpenses)

  const categoryTotals = new Map<string, number>()
  for (const e of expenses.filter((x) => x.date >= start30 && x.date <= today)) {
    categoryTotals.set(e.categoryName, (categoryTotals.get(e.categoryName) ?? 0) + e.amount)
  }
  const topCategories = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const dailySpending = Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(new Date(today), 29 - i), 'yyyy-MM-dd')
    return {
      date,
      label: format(new Date(date), 'M/d'),
      amount: sumExpensesInRange(expenses, date, date),
    }
  })

  const bodyRecordCount = bodies.filter((r) => r.date >= start30 && r.date <= today).length

  return {
    comparison: {
      weight: {
        current: currentBody?.weight ?? null,
        past: pastBody?.weight ?? null,
      },
      spending: { current: currentSpending, past: pastSpending },
      habitRate:
        goodHabitIds.length > 0
          ? {
              current: habitCompletionRate(logsCurrent, goodHabitIds, 30),
              past: habitCompletionRate(logsPast, goodHabitIds, 30),
            }
          : undefined,
    },
    budget: {
      total: overview.chartBudget,
      spent: overview.chartSpent,
      categorySpends: overview.chartCategorySpends,
      legendCategories: overview.legendCategories,
      hasUnsetBudgetCategories: overview.hasUnsetBudgetCategories,
    },
    dailySpending,
    monthLabel: format(new Date(today), 'yyyy년 M월'),
    bodyRecordCount,
    topCategories,
  }
}
