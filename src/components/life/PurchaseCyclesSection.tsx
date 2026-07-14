import { Link } from 'react-router-dom'
import { Card } from '../common/Card'
import { useAsync } from '../../hooks/useAsync'
import { getAllExpenses } from '../../db'
import {
  analyzePurchaseCycles,
  formatExpectedLabel,
  type PurchaseCycle,
} from '../../life/purchaseCycles'
import { formatDate } from '../../utils/dates'
import { formatCurrency } from '../../utils/format'
import { formatIntervalLabel } from '../../life/nextDue'

export default function PurchaseCyclesSection({ month }: { month?: string }) {
  const { data: expenses, loading } = useAsync(() => getAllExpenses(), [])
  const scoped = month
    ? (expenses ?? []).filter((e) => e.date <= `${month}-31`)
    : (expenses ?? [])
  const cycles = expenses ? analyzePurchaseCycles(scoped) : []

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-secondary">구매 주기 분석</h2>
        <Link to="/budget" className="text-xs text-accent hover:underline">
          가계부
        </Link>
      </div>

      {loading && !expenses ? (
        <Card>
          <p className="text-sm text-text-muted">불러오는 중...</p>
        </Card>
      ) : cycles.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">
            가계부에서 같은 세부항목(또는 카테고리)으로 2회 이상 지출하면 평균 구매 주기와 예상
            구매일이 표시됩니다.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {cycles.map((c) => (
            <CycleCard key={c.key} cycle={c} />
          ))}
        </div>
      )}
    </section>
  )
}

function CycleCard({ cycle }: { cycle: PurchaseCycle }) {
  const urgencyClass =
    cycle.urgency === 'overdue'
      ? 'text-danger'
      : cycle.urgency === 'soon'
        ? 'text-warning'
        : 'text-text-secondary'

  return (
    <Card className="flex flex-col gap-1">
      <p className="font-medium">{cycle.name}</p>
      <p className="text-xs text-text-muted">
        평균 구매 주기: {formatIntervalLabel(cycle.avgIntervalDays)} · {cycle.purchaseCount}회 · 합계{' '}
        {formatCurrency(cycle.totalAmount)}
      </p>
      <p className="text-xs text-text-muted">
        마지막 구매: {formatDate(cycle.lastPurchasedAt, 'M/d')}
        {' · '}
        <span className={urgencyClass}>
          예상 구매일: {formatDate(cycle.expectedNextAt, 'M/d')} (
          {formatExpectedLabel(cycle.daysUntilExpected)})
        </span>
      </p>
    </Card>
  )
}
