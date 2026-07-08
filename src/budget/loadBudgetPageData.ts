import { getBudgetDataStartMonth } from './budgetRange'
import { ensureBudgetSettingsForMonth } from './monthSettings'
import { getAllExpenses, getExpensesByMonth, migrateLegacyExpenses } from '../db'

export async function loadBudgetPageData(month: string) {
  const settings = await ensureBudgetSettingsForMonth(month)
  await migrateLegacyExpenses(settings.categories)
  const expenses = await getExpensesByMonth(month)
  const allExpenses = await getAllExpenses()
  const startMonth = await getBudgetDataStartMonth()
  return { settings, expenses, allExpenses, startMonth }
}
