import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getCalendarGrid } from '../../utils/dates'

export interface DayBadge {
  date: string
  hasBudget?: boolean
  hasBody?: boolean
  hasBodyPhoto?: boolean
  hasArchive?: boolean
  habitEmojis?: string[]
}

interface CalendarProps {
  year: number
  month: number
  onMonthChange: (year: number, month: number) => void
  selectedDate: string | null
  onSelectDate: (date: string) => void
  badges: Map<string, DayBadge>
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar({
  year,
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  badges,
}: CalendarProps) {
  const grid = useMemo(() => getCalendarGrid(year, month), [year, month])
  const today = format(new Date(), 'yyyy-MM-dd')

  const prevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12)
    else onMonthChange(year, month - 1)
  }

  const nextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1)
    else onMonthChange(year, month + 1)
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-overlay">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-base font-bold">
          {format(new Date(year, month - 1), 'yyyy년 M월', { locale: ko })}
        </h2>
        <button onClick={nextMonth} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-overlay">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium ${i === 0 ? 'text-danger' : i === 6 ? 'text-budget' : 'text-text-muted'}`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((dateStr, i) => {
          if (!dateStr) {
            return <div key={`empty-${i}`} className="aspect-square" />
          }

          const badge = badges.get(dateStr)
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          const dayNum = parseISO(dateStr).getDate()

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex aspect-square flex-col items-center rounded-xl p-0.5 transition-colors ${
                isSelected
                  ? 'bg-accent text-surface'
                  : isToday
                    ? 'bg-accent/20 text-accent'
                    : 'hover:bg-surface-overlay text-text-primary'
              }`}
            >
              <span className="text-xs font-medium leading-none">{dayNum}</span>
              {badge && (
                <div className="mt-0.5 flex flex-wrap items-center justify-center gap-px">
                  {badge.hasBudget && (
                    <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-surface' : 'bg-budget'}`} />
                  )}
                  {badge.hasBody && (
                    <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-surface' : 'bg-body'}`} />
                  )}
                  {badge.hasArchive && (
                    <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-surface' : 'bg-archive'}`} />
                  )}
                  {badge.hasBodyPhoto && (
                    <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-surface' : 'bg-accent'}`} />
                  )}
                  {badge.habitEmojis?.slice(0, 2).map((emoji, j) => (
                    <span key={j} className="text-[8px] leading-none">{emoji}</span>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-text-muted">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-budget" /> 가계부</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-body" /> 체형</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-archive" /> 아카이브</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success" /> 운동</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-habit-bad" /> 건강</span>
        <span>😊 습관</span>
      </div>
    </div>
  )
}

export function useCalendarState(initialYear?: number, initialMonth?: number) {
  const now = new Date()
  const [year, setYear] = useState(initialYear ?? now.getFullYear())
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(format(now, 'yyyy-MM-dd'))

  const setMonthYear = (y: number, m: number) => {
    setYear(y)
    setMonth(m)
  }

  return { year, month, selectedDate, setSelectedDate, setMonthYear }
}
