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
              {formatCurrency(spent)} 사용/{formatCurrency(overflow)} 초과
            </span>
          ) : (
            <span>
              {formatCurrency(spent)} 사용/{formatCurrency(remaining)} 남음
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
  식비: '#4ade80',
  '교통/차량': '#22d3ee',
  '생활/쇼핑': '#facc15',
  '문화/여가': '#f472b6',
  '의료/교육': '#a78bfa',
  금융: '#fb923c',
  기타: '#94a3b8',
  미분류: '#64748b',
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

/** 채워진 파이 조각 (내부 구멍 없음) */
function pieSegmentPath(cx: number, cy: number, r: number, start: number, end: number) {
  const sweep = end - start
  if (sweep <= 0) return ''
  if (sweep >= 359.99) {
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`,
      'Z',
    ].join(' ')
  }

  const oStart = polar(cx, cy, r, end)
  const oEnd = polar(cx, cy, r, start)
  const large = end - start > 180 ? 1 : 0

  return [
    `M ${cx} ${cy}`,
    `L ${oStart.x} ${oStart.y}`,
    `A ${r} ${r} 0 ${large} 0 ${oEnd.x} ${oEnd.y}`,
    'Z',
  ].join(' ')
}

function shortCategoryLabel(name: string) {
  if (name === '남은 예산') return ''
  // 슬래시 앞만 짧게 (최대 5글자, 잘리면 …)
  const head = name.split('/')[0]
  return head.length > 5 ? `${head.slice(0, 5)}...` : head
}

type Segment = {
  start: number
  end: number
  color: string
  label: string
  amount: number
  percent: number
  showLabel: boolean
}

/** 조각이 좁아 내부 라벨이 안 들어갈 때: 바깥 지시선 + 짧은 이름 */
function SliceCallout({
  cx,
  cy,
  r,
  mid,
  label,
  color,
}: {
  cx: number
  cy: number
  r: number
  mid: number
  label: string
  color: string
}) {
  const short = shortCategoryLabel(label)
  if (!short) return null

  const inner = polar(cx, cy, r * 0.92, mid)
  const outer = polar(cx, cy, r * 1.12, mid)
  // 좌/우 절반에 따라 텍스트 정렬
  const onRight = ((mid % 360) + 360) % 360 < 180
  const textX = outer.x + (onRight ? 4 : -4)

  return (
    <g className="pointer-events-none">
      <line
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke={color}
        strokeWidth={1.25}
        opacity={0.85}
      />
      <circle cx={outer.x} cy={outer.y} r={1.75} fill={color} />
      <text
        x={textX}
        y={outer.y}
        textAnchor={onRight ? 'start' : 'end'}
        dominantBaseline="middle"
        className="fill-text-secondary text-[10px] font-semibold"
      >
        {short}
      </text>
    </g>
  )
}

function DonutChart({ budget, spent, slices, size = 168, colorMode = 'category' }: DonutChartProps) {
  const pad = 22
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4
  const labelR = r * 0.55
  const viewBox = `${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`
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

  const segments: Segment[] = []
  let cursor = 0

  // 소비 금액 큰 순 (내림차순). 남은 예산은 맨 뒤에 별도 추가.
  const activeSlices = [...slices]
    .filter((s) => s.spent > 0)
    .sort((a, b) => b.spent - a.spent)
  const over = budget > 0 && spent > budget

  if (budget <= 0) {
    return (
      <div className="flex shrink-0 items-center justify-center overflow-visible">
        <svg {...svgProps}>
          <circle cx={cx} cy={cy} r={r} fill={REMAINING_COLOR} />
        </svg>
      </div>
    )
  }

  if (activeSlices.length === 0 && spent === 0) {
    return (
      <div className="flex shrink-0 items-center justify-center overflow-visible">
        <svg {...svgProps}>
          <circle cx={cx} cy={cy} r={r} fill={REMAINING_COLOR} />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-text-muted text-[11px] font-semibold"
          >
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
        showLabel: sweep >= 28,
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
        showLabel: sweep >= 28,
      })
      cursor += sweep
    })
    const remaining = budget - spent
    if (remaining > 0) {
      const sweep = (remaining / budget) * 360
      segments.push({
        start: cursor,
        end: cursor + sweep,
        color: REMAINING_COLOR,
        label: '남은 예산',
        amount: remaining,
        percent: Math.round((remaining / budget) * 100),
        showLabel: false,
      })
    }
  }

  // 내부 라벨 불가 조각 → 지시선 라벨 (남은 예산·극소 조각 제외)
  const CALL_OUT_MIN = 8
  const calloutKeys = new Set(
    segments
      .filter((s) => s.label !== '남은 예산' && !s.showLabel && s.end - s.start >= CALL_OUT_MIN)
      .map((s) => s.label),
  )

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
        {segments.map((seg, i) => {
          const mid = (seg.start + seg.end) / 2
          const labelPos = polar(cx, cy, labelR, mid)
          const short = shortCategoryLabel(seg.label)
          const useCallout = calloutKeys.has(seg.label)
          return (
            <g key={i}>
              <path
                d={pieSegmentPath(cx, cy, r, seg.start, seg.end)}
                fill={seg.color}
                className="cursor-pointer transition-opacity hover:opacity-85"
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
                onTouchStart={(e) => {
                  const t = e.touches[0]
                  if (!t) return
                  const parentRect = e.currentTarget.closest('.relative')?.getBoundingClientRect()
                  const rect = (e.currentTarget.ownerSVGElement ?? e.currentTarget).getBoundingClientRect()
                  showTooltip(seg, t.clientX, t.clientY, parentRect, rect)
                }}
              />
              {seg.showLabel && short && (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none fill-surface text-[10px] font-semibold"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}
                >
                  {short}
                </text>
              )}
              {useCallout && (
                <SliceCallout
                  cx={cx}
                  cy={cy}
                  r={r}
                  mid={mid}
                  label={seg.label}
                  color={seg.color}
                />
              )}
            </g>
          )
        })}
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
  legendCategories?: string[]
  hasUnsetBudgetCategories?: boolean
  onOpenBudgetSettings?: () => void
  colorMode?: 'category' | 'palette'
}

export default function BudgetOverview({
  budget,
  spent,
  categorySpends,
  hasUnsetBudgetCategories = false,
  onOpenBudgetSettings,
  colorMode = 'category',
}: BudgetOverviewProps) {
  const budgetUnset = budget <= 0
  const over = budget > 0 && spent > budget

  return (
    <div className="flex flex-col gap-3 overflow-visible">
      <div className="grid w-full grid-cols-[minmax(0,1.55fr)_minmax(0,0.75fr)] items-center gap-2 overflow-visible">
        <div className="flex min-w-0 items-center justify-center overflow-visible">
          <DonutChart
            budget={budget}
            spent={spent}
            slices={categorySpends}
            colorMode={colorMode}
            size={200}
          />
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-2.5">
          <div>
            <p className="text-[10px] text-text-muted">총 지출</p>
            <p
              className={`text-sm font-bold tabular-nums leading-tight ${
                over ? 'text-danger' : 'text-text-primary'
              }`}
            >
              {formatCurrency(spent)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted">총 예산</p>
            <p
              className={`text-sm font-semibold tabular-nums leading-tight ${
                budgetUnset ? 'text-text-muted' : 'text-text-secondary'
              }`}
            >
              {formatBudgetLabel(budget)}
            </p>
          </div>
        </div>
      </div>

      {hasUnsetBudgetCategories && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs leading-relaxed text-text-muted">
            카테고리별 예산을 설정하면 더 정확한 소비 통계를 확인할 수 있어요.
          </p>
          {onOpenBudgetSettings && (
            <button
              type="button"
              className={`${btnSecondary} w-auto px-4 py-2 text-xs`}
              onClick={onOpenBudgetSettings}
            >
              예산 설정하러 가기
            </button>
          )}
        </div>
      )}
    </div>
  )
}
