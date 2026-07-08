import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Card } from '../common/Card'
import Modal, { selectInlineClass } from '../common/Modal'
import BudgetOverview, { type CategorySpendSlice } from './BudgetOverview'
import { expenseDisplayLabel } from '../../budget/categoryMatch'
import { type ExpenseSortMode, sortExpenses } from '../../budget/spendingStats'
import { formatCurrency, formatFixedDay } from '../../utils/format'
import type { Expense } from '../../types'

export type ExpenseListOverview = {
  budget: number
  spent: number
  slices: CategorySpendSlice[]
  legendCategories: string[]
  colorMode?: 'category' | 'palette'
}

type ExpenseListModalProps = {
  open: boolean
  onClose: () => void
  title: string
  expenses: Expense[]
  showCategory?: boolean
  overview?: ExpenseListOverview
  onDelete: (expense: Expense) => Promise<void>
  onEdit: (expense: Expense) => void
}

export default function ExpenseListModal({
  open,
  onClose,
  title,
  expenses,
  showCategory = false,
  overview,
  onDelete,
  onEdit,
}: ExpenseListModalProps) {
  const [sortMode, setSortMode] = useState<ExpenseSortMode>('latest')

  useEffect(() => {
    if (open) setSortMode('latest')
  }, [open, title])

  const sorted = sortExpenses(expenses, sortMode)
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        {overview && (
          <Card className="overflow-visible">
            <BudgetOverview
              budget={overview.budget}
              spent={overview.spent}
              categorySpends={overview.slices}
              legendCategories={overview.legendCategories}
              colorMode={overview.colorMode ?? 'palette'}
            />
          </Card>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-accent">{formatCurrency(total)}</p>
          <select
            className={`${selectInlineClass} text-xs`}
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as ExpenseSortMode)}
          >
            <option value="latest">최신순</option>
            <option value="amount">금액순</option>
            <option value="frequency">빈도순</option>
          </select>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-text-muted">지출 기록이 없습니다.</p>
        ) : (
          <div className="flex max-h-[50dvh] flex-col gap-2 overflow-y-auto">
            {sorted.map((e) => {
              const isFixed = e.type === 'fixed'

              return (
                <div
                  key={e.id}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-3 py-2.5 hover:bg-surface-overlay"
                  onClick={() => onEdit(e)}
                  role="button"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{expenseDisplayLabel(e)}</p>
                      <span className="shrink-0 text-sm text-text-secondary">{formatCurrency(e.amount)}</span>
                      {isFixed && (
                        <span className="rounded-full bg-budget/20 px-1.5 py-0.5 text-[10px] text-budget">
                          고정
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-text-muted">
                      {[
                        showCategory && expenseDisplayLabel(e) !== e.categoryName ? e.categoryName : null,
                        isFixed ? (e.fixedDay ? formatFixedDay(e.fixedDay) : null) : e.date,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onDelete(e)
                    }}
                    className="shrink-0 text-text-muted hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
