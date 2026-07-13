import { useState } from 'react'
import { BUDGET_UNSET_LABEL, formatBudgetLabel } from '../../budget/monthSettings'
import { formatCurrency } from '../../utils/dates'
import { btnSecondary } from '../common/Modal'

interface BudgetBarProps {
  budget: number
  spent: number
  compact?: boolean
}

function getFillClass(spent: number, budget: number) {
  if (spent > budget) return 'bg-danger'
  if (spent >= budget) return 'bg-warning'
  return 'bg-success'
}

export function BudgetBar({ budget, spent, compact = false }: BudgetBarProps) {
  const budgetUnset = budget <= 0
  const ratio = budget > 0 ? spent / budget : 0
  const over = budget > 0 && spent > budget
  const pct = budget > 0 ? Math.min(ratio * 100, 100) : 0
  const fillClass = getFillClass(spent, budget)

  if (budgetUnset) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
        <span className="font-semibold tabular-nums text-text-primary">{formatCurrency(spent)}</span>
        <span className="text-text-muted">{BUDGET_UNSET_LABEL}</span>
      </div>
    )
  }

  if (compact) {
    const remaining = Math.max(budget - spent, 0)
    const overflow = Math.max(spent - budget, 0)

    return (
      <div className="relative h-9 overflow-hidden rounded-lg bg-surface">
        <div
          className={`absolute inset-y-0 left-0 transition-all ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
        <div className="relative flex h-full items-center justify-center px-2 text-xs font-semibold tabular-nums text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85),0_0_6px_rgba(0,0,0,0.5)]">
          {over ? (
            <span>
              {formatCurrency(spent)}/{formatCurrency(budget)} (-{formatCurrency(overflow)})
            </span>
          ) : (
            <span>
              {formatCurrency(spent)}/{formatCurrency(remaining)}
            </span>
          )}
        </div>
      </div>
    )
  }

  return null
}

export const CATEGORY_CHART_COLORS: Record<string, string> = {
  '주거/통신': '#60a5fa',
  '식비': '#4ade80',
  '교통/차량': '#22d3ee',
  '생활/쇼핑': '#facc15',
  '문화/여가': '#f472b6',
  '의료/교육': '#a78bfa',
  '금융': '#fb923c',
  '기타': '#94a3b8',
  '미분류': '#64748b',
}

const REMAINING_COLOR = '#3d3555'

const SUB_ITEM_PALETTE = [
  '#60a5fa',
  '#4ade80',
  '#22d3ee',
  '#facc15',
  '#f472b6',
  '#a78bfa',
  '#fb923c',
  '#94a3b8',
  '#38bdf8',
  '#86efac',
]

function getSliceColor(name: string, index: number, colorMode: 'category' | 'palette') {
  if (colorMode === 'palette') {
    return SUB_ITEM_PALETTE[index % SUB_ITEM_PALETTE.length]
  }
  return CATEGORY_CHART_COLORS[name] ?? '#94a3b8'
}

export interface CategorySpendSlice {
  name: string
  spent: number
}

interface DonutChartProps {
  budget: number
  spent: number
  slices: CategorySpendSlice[]
  size?: number
  colorMode?: 'category' | 'palette'
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutSegmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  start: number,
  end: number,
) {
  const sweep = end - start
  if (sweep <= 0) return ''
  if (sweep >= 359.99) end = start + 359.99

  const oStart = polar(cx, cy, outerR, end)
  const oEnd = polar(cx, cy, outerR, start)
  const iStart = polar(cx, cy, innerR, end)
  const iEnd = polar(cx, cy, innerR, start)
  const large = end - start > 180 ? 1 : 0

  return [
    `M ${oStart.x} ${oStart.y}`,
    `A ${outerR} ${outerR} 0 ${large} 0 ${oEnd.x} ${oEnd.y}`,
    `L ${iEnd.x} ${iEnd.y}`,
    `A ${innerR} ${innerR} 0 ${large} 1 ${iStart.x} ${iStart.y}`,
    'Z',
  ].join(' ')
}

function DonutChart({ budget, spent, slices, size = 112, colorMode = 'category' }: DonutChartProps) {
  const pad = 4
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 4
  const innerR = size / 2 - 18
  const viewBox = `${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`
  const over = budget > 0 && spent > budget
  const usePct = budget > 0 ? Math.round((spent / budget) * 100) : 0
  const [tooltip, setTooltip] = useState<{
    label: string
    amount: number
    percent: number
    x: number
    y: number
  } | null>(null)

  const svgProps = {
    width: size,
    height: size,
    viewBox,
    className: 'shrink-0 overflow-visible',
    overflow: 'visible' as const,
  }

  type Segment = {
    start: number
    end: number
    color: string
    label: string
    amount: number
    percent: number
  }
  const segments: Segment[] = []
  let cursor = 0

  const activeSlices = slices.filter((s) => s.spent > 0)

  if (budget <= 0) {
    return (
      <div className="flex shrink-0 items-center justify-center overflow-visible">
        <svg {...svgProps}>
          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={REMAINING_COLOR} strokeWidth={outerR - innerR} />
        </svg>
      </div>
    )
  }

  if (activeSlices.length === 0 && spent === 0) {
    return (
      <div className="flex shrink-0 items-center justify-center overflow-visible">
        <svg {...svgProps}>
          <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke={REMAINING_COLOR} strokeWidth={outerR - innerR} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="fill-text-muted text-[11px] font-semibold">
            0%
          </text>
        </svg>
      </div>
    )
  }

  if (over) {
    const totalSpent = activeSlices.reduce((s, sl) => s + sl.spent, 0)
    activeSlices.forEach((slice, index) => {
      const sweep = totalSpent > 0 ? (slice.spent / totalSpent) * 360 : 0
      if (sweep <= 0) return
      segments.push({
        start: cursor,
        end: cursor + sweep,
        color: getSliceColor(slice.name, index, colorMode),
        label: slice.name,
        amount: slice.spent,
        percent: totalSpent > 0 ? Math.round((slice.spent / totalSpent) * 100) : 0,
      })
      cursor += sweep
    })
  } else {
    activeSlices.forEach((slice, index) => {
      const sweep = (slice.spent / budget) * 360
      if (sweep <= 0) return
      segments.push({
        start: cursor,
        end: cursor + sweep,
        color: getSliceColor(slice.name, index, colorMode),
        label: slice.name,
        amount: slice.spent,
        percent: Math.round((slice.spent / budget) * 100),
      })
      cursor += sweep
    })
    const remaining = budget - spent
    if (remaining > 0) {
      segments.push({
        start: cursor,
        end: cursor + (remaining / budget) * 360,
        color: REMAINING_COLOR,
        label: '남은 예산',
        amount: remaining,
        percent: Math.round((remaining / budget) * 100),
      })
    }
  }

  const showTooltip = (
    seg: Segment,
    clientX: number,
    clientY: number,
    parentRect: DOMRect | undefined,
    fallbackRect: DOMRect,
  ) => {
    setTooltip({
      label: seg.label,
      amount: seg.amount,
      percent: seg.percent,
      x: clientX - (parentRect?.left ?? fallbackRect.left),
      y: clientY - (parentRect?.top ?? fallbackRect.top),
    })
  }

  return (
    <div className="relative flex shrink-0 items-center justify-center overflow-visible">
      <svg {...svgProps}>
        {segments.map((seg, i) => (
          <path
            key={i}
            d={donutSegmentPath(cx, cy, outerR, innerR, seg.start, seg.end)}
            fill={seg.color}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseEnter={(e) => {
              const rect = (e.currentTarget.ownerSVGElement ?? e.currentTarget).getBoundingClientRect()
              const parentRect = e.currentTarget.closest('.relative')?.getBoundingClientRect()
              showTooltip(seg, e.clientX, e.clientY, parentRect, rect)
            }}
            onMouseMove={(e) => {
              const parentRect = e.currentTarget.closest('.relative')?.getBoundingClientRect()
              if (!parentRect) return
              showTooltip(seg, e.clientX, e.clientY, parentRect, parentRect)
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className={`pointer-events-none text-[13px] font-bold tabular-nums ${over ? 'fill-danger' : 'fill-text-primary'}`}
        >
          {usePct}%
        </text>
      </svg>
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <p className="whitespace-nowrap text-xs font-medium text-text-primary">{tooltip.label}</p>
          <p className="whitespace-nowrap text-xs tabular-nums text-text-secondary">
            {formatCurrency(tooltip.amount)}
            <span className="ml-1.5 text-text-muted">({tooltip.percent}%)</span>
          </p>
        </div>
      )}
    </div>
  )
}

interface BudgetOverviewProps {
  budget: number
  spent: number
  categorySpends: CategorySpendSlice[]
  legendCategories: string[]
  hasUnsetBudgetCategories?: boolean
  onOpenBudgetSettings?: () => void
  colorMode?: 'category' | 'palette'
}

export default function BudgetOverview({
  budget,
  spent,
  categorySpends,
  legendCategories,
  hasUnsetBudgetCategories = false,
  onOpenBudgetSettings,
  colorMode = 'category',
}: BudgetOverviewProps) {
  const budgetUnset = budget <= 0
  const over = budget > 0 && spent > budget

  return (
    <div className="flex flex-col gap-3 overflow-visible">
      <div
        className={`grid w-full items-center gap-3 overflow-visible ${
          legendCategories.length > 0 ? 'grid-cols-2' : 'grid-cols-1'
        }`}
      >
        <div className="flex min-w-0 flex-col items-center justify-center gap-2">
          <DonutChart budget={budget} spent={spent} slices={categorySpends} colorMode={colorMode} />
          <p className="whitespace-nowrap text-center text-sm font-bold tabular-nums leading-tight">
            <span className={over ? 'text-danger' : 'text-text-primary'}>{formatCurrency(spent)}</span>
            <span
              className={
                budgetUnset ? 'font-medium text-text-muted' : over ? 'text-text-primary' : 'text-text-secondary'
              }
            >
              /{formatBudgetLabel(budget)}
            </span>
          </p>
        </div>

        {legendCategories.length > 0 && (
          <div className="grid min-w-0 grid-cols-2 gap-x-2 gap-y-1.5 content-center">
            {legendCategories.map((name, index) => (
              <span key={name} className="inline-flex min-w-0 items-center gap-1.5 text-xs text-text-secondary">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getSliceColor(name, index, colorMode) }}
                />
                <span className="truncate">{name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {hasUnsetBudgetCategories && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs leading-relaxed text-text-muted">
            카테고리별 예산을 설정하면 더 정확한 소비 통계를 확인할 수 있어요.
          </p>
          {onOpenBudgetSettings && (
            <button type="button" className={`${btnSecondary} w-auto px-4 py-2 text-xs`} onClick={onOpenBudgetSettings}>
              예산 설정하러 가기
            </button>
          )}
        </div>
      )}
    </div>
  )
}
