import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { Card } from '../common/Card'
import { useAsync } from '../../hooks/useAsync'
import {
  getAllSupplementProducts,
  getSupplementIntakeLogsInMonth,
  toggleSupplementDose,
} from '../../db'
import {
  calculateSupplementAdherence,
  listExpectedDosesForDate,
  isDoseCompleted,
} from '../../supplements/adherence'
import { formatScheduleLabel, scheduleKey } from '../../supplements/nutrients'
import { clampDateToMonth, currentMonth, formatMonth, todayISO } from '../../utils/dates'
import type { SupplementProduct } from '../../types'

type SupplementCalendarProps = {
  products?: SupplementProduct[]
  onChanged?: () => void
  /** 페이지 헤더와 동기화할 월 (있으면 내부 월 네비 숨김) */
  month?: string
  onMonthChange?: (month: string) => void
}

export default function SupplementCalendar({
  products: productsProp,
  onChanged,
  month: monthProp,
  onMonthChange,
}: SupplementCalendarProps) {
  const [internalMonth, setInternalMonth] = useState(currentMonth())
  const month = monthProp ?? internalMonth
  const setMonth = onMonthChange ?? setInternalMonth
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const { data: fetched, reload: reloadProducts } = useAsync(() => getAllSupplementProducts(), [])
  const products = productsProp ?? fetched ?? []
  const { data: logs, reload: reloadLogs } = useAsync(
    () => getSupplementIntakeLogsInMonth(month),
    [month],
  )

  const adherence = useMemo(
    () => calculateSupplementAdherence(products, logs ?? [], month),
    [products, logs, month],
  )

  const doses = useMemo(
    () => listExpectedDosesForDate(products, selectedDate),
    [products, selectedDate],
  )

  useEffect(() => {
    setSelectedDate((d) => (d.startsWith(month) ? d : clampDateToMonth(d, month)))
  }, [month])

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const reload = () => {
    reloadLogs()
    if (!productsProp) reloadProducts()
    onChanged?.()
  }

  const handleToggle = async (productId: string, key: string, completed: boolean) => {
    await toggleSupplementDose({
      productId,
      date: selectedDate,
      scheduleKey: key,
      completed,
    })
    reload()
  }

  const controlled = monthProp != null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary">복용 캘린더</h2>
        {!controlled && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <button type="button" onClick={() => changeMonth(-1)} className="text-text-muted hover:text-text-primary">
              ◀
            </button>
            <span>{formatMonth(month)}</span>
            <button type="button" onClick={() => changeMonth(1)} className="text-text-muted hover:text-text-primary">
              ▶
            </button>
          </div>
        )}
      </div>

      <Card className="flex flex-col gap-3">
        <p className="text-sm">
          <span className="font-semibold text-accent">
            {formatMonth(month)} 영양제 복용률{' '}
            {adherence.expected === 0 ? '—' : `${adherence.rate}%`}
          </span>
          {adherence.expected > 0 && (
            <span className="ml-2 text-xs text-text-muted">
              ({adherence.completed}/{adherence.expected}회)
            </span>
          )}
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-muted">날짜</span>
          <input
            type="date"
            className="rounded-xl border border-border bg-surface-overlay px-3 py-2 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>

        {doses.length === 0 ? (
          <p className="text-sm text-text-muted">이 날 복용할 영양제가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {doses.map((dose) => {
              const product = products.find((p) => p.id === dose.productId)
              const slotIndex = product?.schedule.findIndex(
                (_, i) => scheduleKey(product.schedule[i], i) === dose.scheduleKey,
              )
              const slot =
                product && slotIndex != null && slotIndex >= 0 ? product.schedule[slotIndex] : null
              const done = isDoseCompleted(logs ?? [], dose.productId, dose.date, dose.scheduleKey)

              return (
                <li
                  key={`${dose.productId}-${dose.scheduleKey}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{dose.productName}</p>
                    <p className="text-xs text-text-muted">
                      {slot ? formatScheduleLabel(slot) : dose.scheduleLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(dose.productId, dose.scheduleKey, !done)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      done
                        ? 'border-success bg-success/20 text-success'
                        : 'border-border text-text-muted hover:border-accent'
                    }`}
                    aria-label={done ? '복용 취소' : '복용 완료'}
                  >
                    <Check size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </section>
  )
}
