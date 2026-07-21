import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { shiftMonth, maxNavigableMonth } from '../../utils/dates'

type MonthNavProps = {
  month: string
  onChange: (month: string) => void
  minMonth?: string
  /** 기본: 이번 달 +3개월 (전 탭 공통) */
  maxMonth?: string
  className?: string
}

/** 월 이동용 채움 삼각형 — 드롭다운 ChevronDown과 구분 */
function TriangleLeft({ className = '' }: { className?: string }) {
  return (
    <svg
      width="10"
      height="12"
      viewBox="0 0 10 12"
      className={className}
      aria-hidden
    >
      <path d="M9 1v10L1 6z" fill="currentColor" />
    </svg>
  )
}

function TriangleRight({ className = '' }: { className?: string }) {
  return (
    <svg
      width="10"
      height="12"
      viewBox="0 0 10 12"
      className={className}
      aria-hidden
    >
      <path d="M1 1v10l8-5z" fill="currentColor" />
    </svg>
  )
}

function parseYm(month: string) {
  const [y, m] = month.split('-').map(Number)
  return { y, m }
}

function toYm(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`
}

function yearBounds(minMonth?: string, maxMonth?: string) {
  const minY = minMonth ? parseYm(minMonth).y : new Date().getFullYear() - 10
  const maxY = maxMonth ? parseYm(maxMonth).y : parseYm(maxNavigableMonth()).y
  return { minY, maxY }
}

function isMonthAllowed(ym: string, minMonth?: string, maxMonth?: string) {
  if (minMonth && ym < minMonth) return false
  if (maxMonth && ym > maxMonth) return false
  return true
}

export default function MonthNav({
  month,
  onChange,
  minMonth,
  maxMonth = maxNavigableMonth(),
  className = '',
}: MonthNavProps) {
  const { y, m } = parseYm(month)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(y)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const prev = shiftMonth(month, -1)
  const next = shiftMonth(month, 1)
  const canPrev = !minMonth || prev >= minMonth
  const canNext = !maxMonth || next <= maxMonth
  const { minY, maxY } = yearBounds(minMonth, maxMonth)

  useEffect(() => {
    if (open) setViewYear(y)
  }, [open, y])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pickMonth = (monthNum: number) => {
    const ym = toYm(viewYear, monthNum)
    if (!isMonthAllowed(ym, minMonth, maxMonth)) return
    onChange(ym)
    setOpen(false)
  }

  const navBtn =
    'inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent'

  return (
    <div ref={rootRef} className={`relative flex items-center gap-0.5 ${className}`}>
      <button
        type="button"
        onClick={() => canPrev && onChange(prev)}
        disabled={!canPrev}
        aria-label="이전 달"
        className={navBtn}
      >
        <TriangleLeft />
      </button>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium tabular-nums transition-colors sm:text-sm ${
          open
            ? 'bg-surface-overlay text-text-primary'
            : 'text-text-secondary hover:bg-surface-overlay/70 hover:text-text-primary'
        }`}
      >
        <span>
          {y}년 {m}월
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <button
        type="button"
        onClick={() => canNext && onChange(next)}
        disabled={!canNext}
        aria-label="다음 달"
        className={navBtn}
      >
        <TriangleRight />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="월 선택"
          className="absolute top-full left-1/2 z-50 mt-1.5 w-[13.5rem] -translate-x-1/2 rounded-xl border border-border bg-surface-raised p-3 shadow-xl shadow-black/40"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <button
              type="button"
              aria-label="이전 해"
              disabled={viewYear <= minY}
              onClick={() => setViewYear((v) => v - 1)}
              className={navBtn}
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold tabular-nums text-text-primary">
              {viewYear}년
            </span>
            <button
              type="button"
              aria-label="다음 해"
              disabled={viewYear >= maxY}
              onClick={() => setViewYear((v) => v + 1)}
              className={navBtn}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((monthNum) => {
              const ym = toYm(viewYear, monthNum)
              const allowed = isMonthAllowed(ym, minMonth, maxMonth)
              const selected = viewYear === y && monthNum === m
              return (
                <button
                  key={monthNum}
                  type="button"
                  disabled={!allowed}
                  onClick={() => pickMonth(monthNum)}
                  className={`h-8 rounded-lg text-xs tabular-nums transition-colors ${
                    selected
                      ? 'bg-accent font-semibold text-surface'
                      : allowed
                        ? 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
                        : 'cursor-not-allowed text-text-muted/30'
                  }`}
                >
                  {monthNum}월
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
