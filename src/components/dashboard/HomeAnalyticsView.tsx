import { Scale, Flame } from 'lucide-react'
import { Card } from '../common/Card'
import ComparisonCards from './ComparisonCards'
import BudgetOverview from '../budget/BudgetOverview'
import { formatCurrency } from '../../utils/dates'
import { CATEGORY_CHART_COLORS } from '../budget/BudgetOverview'
import type { HomeAnalyticsData } from '../../home/homeAnalytics'

interface HomeAnalyticsViewProps {
  data: HomeAnalyticsData
  showComparison: boolean
}

function DailySpendingChart({
  points,
}: {
  points: HomeAnalyticsData['dailySpending']
}) {
  const max = Math.max(...points.map((p) => p.amount), 1)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">30일 지출 흐름</h3>
        <span className="text-xs text-text-muted">일별</span>
      </div>
      <div className="flex h-36 items-end gap-[3px]">
        {points.map((point) => {
          const height = point.amount > 0 ? Math.max((point.amount / max) * 100, 6) : 2
          return (
            <div key={point.date} className="group flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t-sm bg-gradient-to-t from-accent/90 to-accent/40 transition-all group-hover:from-accent group-hover:to-accent/60"
                style={{ height: `${height}%` }}
                title={`${point.label}: ${formatCurrency(point.amount)}`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </Card>
  )
}

function TopCategories({ items }: { items: HomeAnalyticsData['topCategories'] }) {
  const max = Math.max(...items.map((i) => i.amount), 1)

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-primary">카테고리 TOP 5</h3>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">최근 30일 지출이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item, index) => (
            <div key={item.name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-text-secondary">
                  <span className="mr-1.5 text-xs text-text-muted">{index + 1}</span>
                  {item.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-warning">
                  {formatCurrency(item.amount)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.amount / max) * 100}%`,
                    backgroundColor: CATEGORY_CHART_COLORS[item.name] ?? '#94a3b8',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function HomeAnalyticsView({ data, showComparison }: HomeAnalyticsViewProps) {
  return (
    <div className="flex flex-col gap-4">
      {showComparison && (
        <ComparisonCards
          data={{
            weight: data.comparison.weight,
            spending: data.comparison.spending,
            habitRate: data.comparison.habitRate,
          }}
        />
      )}

      <Card className="overflow-visible bg-gradient-to-br from-surface-raised to-surface-overlay">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">이번 달 예산</h3>
          <span className="text-xs text-text-muted">{data.monthLabel}</span>
        </div>
        <BudgetOverview
          budget={data.budget.total}
          spent={data.budget.spent}
          categorySpends={data.budget.categorySpends}
          legendCategories={data.budget.legendCategories}
          hasUnsetBudgetCategories={data.budget.hasUnsetBudgetCategories}
        />
      </Card>

      <DailySpendingChart points={data.dailySpending} />

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-2 bg-gradient-to-br from-surface-raised to-surface-overlay">
          <div className="flex items-center gap-2 text-text-muted">
            <Scale size={16} className="text-body" />
            <span className="text-xs">30일 체형 기록</span>
          </div>
          <span className="text-2xl font-bold tabular-nums">{data.bodyRecordCount}회</span>
          <span className="text-xs text-text-muted">체중 · 둘레</span>
        </Card>
        <Card className="flex flex-col gap-2 bg-gradient-to-br from-surface-raised to-surface-overlay">
          <div className="flex items-center gap-2 text-text-muted">
            <Flame size={16} className="text-warning" />
            <span className="text-xs">30일 총 지출</span>
          </div>
          <span className="text-2xl font-bold tabular-nums text-warning">
            {formatCurrency(data.comparison.spending.current)}
          </span>
          <span className="text-xs text-text-muted">최근 한 달 합계</span>
        </Card>
      </div>

      <TopCategories items={data.topCategories} />
    </div>
  )
}
