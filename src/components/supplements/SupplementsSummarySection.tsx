import { Link } from 'react-router-dom'
import { ChevronRight, Pill } from 'lucide-react'
import { Card } from '../common/Card'
import { useAsync } from '../../hooks/useAsync'
import { getAllSupplementProducts, getSupplementIntakeLogsInMonth } from '../../db'
import { getActiveSupplements, formatScheduleLabel, aggregateNutrients } from '../../supplements/nutrients'
import { calculateSupplementAdherence } from '../../supplements/adherence'
import { currentMonth, todayISO } from '../../utils/dates'

export default function SupplementsSummarySection() {
  const { data: products } = useAsync(() => getAllSupplementProducts(), [])
  const month = currentMonth()
  const { data: logs } = useAsync(() => getSupplementIntakeLogsInMonth(month), [month])

  const list = products ?? []
  const active = getActiveSupplements(list, todayISO())
  const adherence = calculateSupplementAdherence(list, logs ?? [], month)
  const nutrients = aggregateNutrients(active)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary">영양제</h2>
        <Link
          to="/health/supplements"
          className="flex items-center gap-0.5 text-sm font-medium text-accent hover:opacity-80"
        >
          영양제
          <ChevronRight size={16} />
        </Link>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill size={16} className="text-body" />
            <span className="text-sm font-medium">복용중 {active.length}개</span>
          </div>
          <span className="text-sm tabular-nums text-text-secondary">
            {month.slice(5)}월 복용률 {adherence.expected === 0 ? '—' : `${adherence.rate}%`}
          </span>
        </div>

        {active.length === 0 ? (
          <p className="text-sm text-text-muted">
            복용 중인 영양제가 없습니다.{' '}
            <Link to="/health/supplements" className="text-accent">
              등록하기
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium">{p.name}</span>
                <span className="shrink-0 text-xs text-text-muted">
                  {p.schedule.map((s) => formatScheduleLabel(s)).join(' · ') || '복용법 미설정'}
                </span>
              </li>
            ))}
            {active.length > 5 && (
              <li className="text-xs text-text-muted">외 {active.length - 5}개</li>
            )}
          </ul>
        )}

        {nutrients.length > 0 && (
          <div className="border-t border-border pt-2">
            <p className="mb-1 text-xs text-text-muted">합산 성분 (상위)</p>
            <p className="text-xs leading-relaxed text-text-secondary">
              {nutrients
                .slice(0, 4)
                .map((n) => `${n.name} ${n.amount}${n.unit}`)
                .join(' · ')}
              {nutrients.length > 4 ? ' …' : ''}
            </p>
          </div>
        )}
      </Card>
    </section>
  )
}
