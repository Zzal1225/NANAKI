import { Card } from '../common/Card'
import { formatCurrency } from '../../utils/format'
import type { SummaryView } from '../../budget/budgetPageTypes'
import type { Expense } from '../../types'
import type { SummaryTrend } from '../../budget/summaryTrends'
import { ChevronRight } from 'lucide-react'

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
  spendTrend: SummaryTrend | null
  zeroSpendTrend: SummaryTrend | null
  weekTrend: SummaryTrend | null
  onOpenSummary: (view: SummaryView) => void
}

const valueNeutral = 'whitespace-nowrap text-sm font-bold leading-tight text-text-primary'

export default function BudgetSummarySection({
  totalSpent,
  variableSpent,
  fixedSpent,
  fixedExpenses,
  showTotalSpendEmpty,
  showVariableSpendEmpty,
  zeroSpendDays,
  weekSpent,
  spendTrend,
  zeroSpendTrend,
  weekTrend,
  onOpenSummary,
}: BudgetSummarySectionProps) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-2">
      {/* 좌: 이번 달 지출 */}
      <Card className="flex h-full flex-col gap-2">
        <TrendLine trend={spendTrend} />
        <button
          type="button"
          onClick={() => onOpenSummary('total')}
          className="flex w-full flex-col gap-0.5 text-left active:opacity-80"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-text-muted">총 지출</span>
            <ChevronRight size={14} className="shrink-0 text-text-muted" />
          </div>
          {showTotalSpendEmpty ? (
            <span className="text-sm text-text-muted">{emptySpendText}</span>
          ) : (
            <span className="text-base font-bold tabular-nums text-text-primary">
              {formatCurrency(totalSpent)}
            </span>
          )}
        </button>

        <div className="mt-auto flex flex-col gap-1.5 border-t border-border pt-2">
          <SpendRow
            label="고정"
            value={formatCurrency(fixedSpent)}
            empty={fixedExpenses.length === 0 ? emptySpendText : undefined}
            onClick={() => onOpenSummary('fixed')}
          />
          <SpendRow
            label="변동"
            value={formatCurrency(variableSpent)}
            empty={showVariableSpendEmpty ? emptySpendText : undefined}
            onClick={() => onOpenSummary('variable')}
          />
        </div>
      </Card>

      {/* 우: 무지출 · 이번 주 — 좌측과 높이 맞춤 */}
      <div className="flex min-h-0 flex-col gap-2">
        <Card className="flex min-h-0 flex-1 flex-col gap-1">
          <TrendLine trend={zeroSpendTrend} />
          <span className="text-xs text-text-muted">무지출 DAY</span>
          <span className={valueNeutral}>{zeroSpendDays}일</span>
        </Card>
        <Card className="flex min-h-0 flex-1 flex-col gap-1">
          <TrendLine trend={weekTrend} />
          <span className="text-xs text-text-muted">이번 주 소비</span>
          {weekSpent === 0 ? (
            <span className="text-sm leading-snug text-text-muted">{emptySpendText}</span>
          ) : (
            <span className={valueNeutral}>{formatCurrency(weekSpent)}</span>
          )}
        </Card>
      </div>
    </div>
  )
}

/** 지출↑·무지출↓ = 부정(danger), 지출↓·무지출↑ = 긍정(success), 비교불가 = warning */
function trendColorClass(trend: SummaryTrend): string {
  if (trend.kind === 'unavailable') return 'text-warning'
  if (trend.direction === 'flat') return 'text-text-muted'

  const higherIsGood = trend.kind === 'days'
  const isGood = higherIsGood
    ? trend.direction === 'up'
    : trend.direction === 'down'

  return isGood ? 'text-success' : 'text-danger'
}

function TrendLine({ trend }: { trend: SummaryTrend | null }) {
  if (!trend) {
    return <p className="h-3.5 text-[10px] leading-none text-transparent">—</p>
  }

  if (trend.kind === 'unavailable') {
    return (
      <p className={`h-3.5 truncate text-[10px] leading-none ${trendColorClass(trend)}`}>
        {trend.label}
      </p>
    )
  }

  const arrow = trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '—'

  return (
    <p className={`h-3.5 truncate text-[10px] leading-none ${trendColorClass(trend)}`}>
      <span className="mr-0.5">{arrow}</span>
      {trend.label}
    </p>
  )
}

function SpendRow({
  label,
  value,
  empty,
  onClick,
}: {
  label: string
  value: string
  empty?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 text-left active:opacity-80"
    >
      <span className="shrink-0 text-[11px] text-text-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-0.5">
        {empty ? (
          <span className="truncate text-[11px] text-text-muted">{empty}</span>
        ) : (
          <span className="truncate text-[11px] font-semibold tabular-nums text-text-primary">
            {value}
          </span>
        )}
        <ChevronRight size={12} className="shrink-0 text-text-muted" />
      </span>
    </button>
  )
}
