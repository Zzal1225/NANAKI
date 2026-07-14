import { formatMonth, shiftMonth } from '../../utils/dates'

type MonthNavProps = {
  month: string
  onChange: (month: string) => void
  /** 이전 이동 하한 (YYYY-MM) */
  minMonth?: string
  /** 다음 이동 상한 (YYYY-MM) */
  maxMonth?: string
  className?: string
}

export default function MonthNav({
  month,
  onChange,
  minMonth,
  maxMonth,
  className = '',
}: MonthNavProps) {
  const prev = shiftMonth(month, -1)
  const next = shiftMonth(month, 1)
  const canPrev = !minMonth || prev >= minMonth
  const canNext = !maxMonth || next <= maxMonth

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => canPrev && onChange(prev)}
        disabled={!canPrev}
        aria-label="이전 달"
        className={
          canPrev
            ? 'px-0.5 text-xs text-text-muted hover:text-text-primary'
            : 'cursor-not-allowed px-0.5 text-xs text-text-muted/30'
        }
      >
        ◀
      </button>
      <span className="whitespace-nowrap text-xs tabular-nums text-text-secondary sm:text-sm">
        {formatMonth(month)}
      </span>
      <button
        type="button"
        onClick={() => canNext && onChange(next)}
        disabled={!canNext}
        aria-label="다음 달"
        className={
          canNext
            ? 'px-0.5 text-xs text-text-muted hover:text-text-primary'
            : 'cursor-not-allowed px-0.5 text-xs text-text-muted/30'
        }
      >
        ▶
      </button>
    </div>
  )
}
