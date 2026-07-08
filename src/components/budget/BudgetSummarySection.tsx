import { StatCard } from '../common/Card'
import { formatCurrency } from '../../utils/format'
import type { SummaryView } from '../../budget/budgetPageTypes'
import type { Expense } from '../../types'

const emptySpendText = '지출 데이터 없음'

type BudgetSummarySectionProps = {
  totalSpent: number
  variableSpent: number
  fixedSpent: number
  variableBudget: number
  fixedBudget: number
  fixedExpenses: Expense[]
  showTotalSpendEmpty: boolean
  showVariableSpendEmpty: boolean
  showTotalBudgetEmpty: boolean
  onOpenSummary: (view: SummaryView) => void
}

export default function BudgetSummarySection({
  totalSpent,
  variableSpent,
  fixedSpent,
  variableBudget,
  fixedBudget,
  fixedExpenses,
  showTotalSpendEmpty,
  showVariableSpendEmpty,
  showTotalBudgetEmpty,
  onOpenSummary,
}: BudgetSummarySectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="총 지출"
          value={formatCurrency(totalSpent)}
          emptyText={showTotalSpendEmpty ? emptySpendText : undefined}
          color="text-danger"
          onClick={() => onOpenSummary('total')}
        />
        <StatCard
          label="변동 지출"
          value={formatCurrency(variableSpent)}
          emptyText={showVariableSpendEmpty ? emptySpendText : undefined}
          color="text-success"
          onClick={() => onOpenSummary('variable')}
        />
        <StatCard
          label="고정 지출"
          value={formatCurrency(fixedSpent)}
          emptyText={fixedExpenses.length === 0 ? emptySpendText : undefined}
          color="text-budget"
          onClick={() => onOpenSummary('fixed')}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="변동 지출 예산"
          value={formatCurrency(variableBudget)}
          emptyText={showTotalBudgetEmpty ? '예산 미설정' : undefined}
          color="text-success"
        />
        <StatCard
          label="고정 지출 예산"
          value={formatCurrency(fixedBudget)}
          emptyText={showTotalBudgetEmpty ? '예산 미설정' : undefined}
          color="text-budget"
        />
      </div>
    </div>
  )
}
