import { ChevronRight, Settings } from 'lucide-react'
import { Card } from '../common/Card'
import BudgetOverview, { BudgetBar, type CategorySpendSlice } from './BudgetOverview'
import { filterCategoryExpenses } from '../../budget/categoryMatch'
import { formatBudgetLabel, getCategoryBudgetTotal } from '../../budget/monthSettings'
import { formatCurrency } from '../../utils/format'
import type { BudgetCategory, BudgetSettings, Expense } from '../../types'

type BudgetCategorySectionProps = {
  settings: BudgetSettings
  expenses: Expense[]
  budgetCategories: BudgetCategory[]
  chartBudget: number
  chartSpent: number
  chartCategorySpends: CategorySpendSlice[]
  legendCategories: string[]
  hasUnsetBudgetCategories: boolean
  orphanExpenses: Expense[]
  onOpenCategorySettings: () => void
  onOpenCategoryExpenses: (category: BudgetCategory) => void
  onOpenOrphanExpenses: () => void
}

export default function BudgetCategorySection({
  settings,
  expenses,
  budgetCategories,
  chartBudget,
  chartSpent,
  chartCategorySpends,
  legendCategories,
  hasUnsetBudgetCategories,
  orphanExpenses,
  onOpenCategorySettings,
  onOpenCategoryExpenses,
  onOpenOrphanExpenses,
}: BudgetCategorySectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-end">
        <button
          onClick={onOpenCategorySettings}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
          title="카테고리 편집"
        >
          <Settings size={16} />
        </button>
      </div>
      <Card className="mb-3">
        <BudgetOverview
          budget={chartBudget}
          spent={chartSpent}
          categorySpends={chartCategorySpends}
          legendCategories={legendCategories}
          hasUnsetBudgetCategories={hasUnsetBudgetCategories}
          onOpenBudgetSettings={onOpenCategorySettings}
        />
      </Card>
      <div className="flex flex-col gap-2">
        {budgetCategories.map((cat) => {
          const catExpenses = filterCategoryExpenses(expenses, cat)
          const catSpent = catExpenses.reduce((s, e) => s + e.amount, 0)
          const budgetTotal = getCategoryBudgetTotal(settings.budgetItems, cat.id)

          return (
            <Card key={cat.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{cat.name}</span>
                <button
                  type="button"
                  onClick={() => onOpenCategoryExpenses(cat)}
                  className="flex shrink-0 items-center text-sm font-semibold tabular-nums hover:opacity-80"
                >
                  <span className={budgetTotal > 0 ? '' : 'text-sm font-medium text-text-muted'}>
                    {formatBudgetLabel(budgetTotal)}
                  </span>
                  <ChevronRight size={16} className="text-text-muted" />
                </button>
              </div>
              <BudgetBar budget={budgetTotal} spent={catSpent} compact />
            </Card>
          )
        })}
        {orphanExpenses.length > 0 && (
          <Card className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-secondary">미분류 지출</span>
              <button
                type="button"
                onClick={onOpenOrphanExpenses}
                className="flex shrink-0 items-center text-sm hover:opacity-80"
              >
                <span>{formatCurrency(orphanExpenses.reduce((s, e) => s + e.amount, 0))}</span>
                <ChevronRight size={16} className="text-text-muted" />
              </button>
            </div>
            <p className="px-1 text-xs text-text-muted">카테고리가 변경되어 연결이 끊긴 지출</p>
          </Card>
        )}
      </div>
    </section>
  )
}
