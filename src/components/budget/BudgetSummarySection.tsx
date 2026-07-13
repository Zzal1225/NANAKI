import { StatCard } from '../common/Card'
import { formatCurrency } from '../../utils/format'
import type { SummaryView } from '../../budget/budgetPageTypes'
import type { Expense } from '../../types'

const emptySpendText = '지출 데이터 없음'

type BudgetSummarySectionProps = {
  totalSpent: number
  variableSpent: number
  fixedSpent: number
  fixedExpenses: Expense[]
  showTotalSpendEmpty: boolean
  showVariableSpendEmpty: boolean
  zeroSpendDays: number
  weekSpent: number
  onOpenSummary: (view: SummaryView) => void
}

export default function BudgetSummarySection({
  totalSpent,
  variableSpent,
  fixedSpent,
  fixedExpenses,
  showTotalSpendEmpty,
  showVariableSpendEmpty,
  zeroSpendDays,
  weekSpent,
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
          label="이번 달 무지출 일수"
          value={`${zeroSpendDays}일`}
          color="text-accent"
        />
        <StatCard
          label="이번 주 지출"
          value={formatCurrency(weekSpent)}
          emptyText={weekSpent === 0 ? emptySpendText : undefined}
          color="text-accent"
        />
      </div>
    </div>
  )
}
