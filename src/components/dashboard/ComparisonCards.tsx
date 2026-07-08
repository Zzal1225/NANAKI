import { TrendingDown, TrendingUp, Minus, Scale, Wallet, Target } from 'lucide-react'
import { Card } from '../common/Card'
import { formatCurrency } from '../../utils/dates'

interface ComparisonData {
  weight?: { current: number | null; past: number | null }
  spending?: { current: number; past: number }
  habitRate?: { current: number; past: number }
}

interface ComparisonCardsProps {
  data: ComparisonData
}

function DiffBadge({ current, past, unit = '', invert = false }: {
  current: number
  past: number
  unit?: string
  invert?: boolean
}) {
  const diff = current - past
  const isGood = invert ? diff < 0 : diff > 0
  const isNeutral = diff === 0

  const Icon = isNeutral ? Minus : isGood ? TrendingUp : TrendingDown
  const color = isNeutral ? 'text-text-muted' : isGood ? 'text-success' : 'text-danger'

  return (
    <span className={`flex items-center gap-0.5 text-xs ${color}`}>
      <Icon size={14} />
      {diff > 0 ? '+' : ''}{diff.toFixed(diff % 1 === 0 ? 0 : 1)}{unit}
      <span className="text-text-muted"> vs 30일 전</span>
    </span>
  )
}

export default function ComparisonCards({ data }: ComparisonCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {data.weight && (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-text-muted">
            <Scale size={16} className="text-body" />
            <span className="text-xs">체중</span>
          </div>
          <span className="text-xl font-bold">
            {data.weight.current != null ? `${data.weight.current}kg` : '—'}
          </span>
          {data.weight.current != null && data.weight.past != null && (
            <DiffBadge current={data.weight.current} past={data.weight.past} unit="kg" invert />
          )}
        </Card>
      )}

      {data.spending && (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-text-muted">
            <Wallet size={16} className="text-budget" />
            <span className="text-xs">30일 지출</span>
          </div>
          <span className="text-xl font-bold">{formatCurrency(data.spending.current)}</span>
          <DiffBadge current={data.spending.current} past={data.spending.past} invert />
        </Card>
      )}

      {data.habitRate && (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-text-muted">
            <Target size={16} className="text-habit-good" />
            <span className="text-xs">습관 달성률</span>
          </div>
          <span className="text-xl font-bold">{data.habitRate.current.toFixed(0)}%</span>
          <DiffBadge current={data.habitRate.current} past={data.habitRate.past} unit="%" />
        </Card>
      )}
    </div>
  )
}
