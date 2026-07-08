import { Link2 } from 'lucide-react'
import type { PeriodContext } from '../../types'
import { Card, CardTitle } from '../common/Card'
import { formatCurrency, formatDate } from '../../utils/dates'

interface TimelineViewProps {
  context: PeriodContext | null
  loading: boolean
}

export default function TimelineView({ context, loading }: TimelineViewProps) {
  if (loading) {
    return (
      <Card>
        <p className="text-sm text-text-muted">연결 데이터 불러오는 중...</p>
      </Card>
    )
  }

  if (!context) return null

  const hasData =
    context.bodyRecords.length > 0 ||
    context.exercises.length > 0 ||
    context.expenses.length > 0 ||
    context.habitLogs.length > 0 ||
    context.hospitalRecords.length > 0

  if (!hasData) {
    return (
      <Card>
        <CardTitle className="flex items-center gap-2">
          <Link2 size={14} /> 기간 연결 분석
        </CardTitle>
        <p className="mt-2 text-sm text-text-muted">
          {formatDate(context.centerDate)} 전후 7일간 연결된 기록이 없습니다.
        </p>
      </Card>
    )
  }

  const totalExpense = context.expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Link2 size={14} /> 기간 연결 분석
      </CardTitle>
      <p className="mt-1 text-xs text-text-muted">
        {formatDate(context.startDate, 'M/d')} ~ {formatDate(context.endDate, 'M/d')}
        {' · '}기준일 {formatDate(context.centerDate, 'M/d')}
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {context.bodyRecords.length > 0 && (
          <TimelineBlock title="체형 / 인바디" color="text-body">
            {context.bodyRecords.map((r) => (
              <li key={r.id}>
                <span className="text-text-muted">{formatDate(r.date, 'M/d')}</span>
                {' · '}
                {r.weight && `${r.weight}kg`}
                {r.inbody?.skeletalMuscle && ` · 근육 ${r.inbody.skeletalMuscle}kg`}
                {r.inbody?.bodyFatPercent && ` · 체지방 ${r.inbody.bodyFatPercent}%`}
                {r.memo && <span className="text-text-muted"> — {r.memo}</span>}
              </li>
            ))}
          </TimelineBlock>
        )}

        {context.exercises.length > 0 && (
          <TimelineBlock title="운동" color="text-success">
            {context.exercises.map((r) => (
              <li key={r.id}>
                <span className="text-text-muted">{formatDate(r.date, 'M/d')}</span>
                {' · '}{r.type}
                {r.duration && ` ${r.duration}분`}
                {r.memo && <span className="text-text-muted"> — {r.memo}</span>}
              </li>
            ))}
          </TimelineBlock>
        )}

        {context.expenses.length > 0 && (
          <TimelineBlock title={`가계부 · ${formatCurrency(totalExpense)}`} color="text-budget">
            {context.expenses.map((e) => (
              <li key={e.id}>
                <span className="text-text-muted">{formatDate(e.date, 'M/d')}</span>
                {' · '}{e.categoryName} {formatCurrency(e.amount)}
                {e.subItem && <span className="text-text-muted"> — {e.subItem}</span>}
              </li>
            ))}
          </TimelineBlock>
        )}

        {context.habitLogs.length > 0 && (
          <TimelineBlock title="습관" color="text-habit-good">
            {context.habitLogs.map((l) => (
              <li key={l.id}>
                <span className="text-text-muted">{formatDate(l.date, 'M/d')}</span>
                {' · '}{l.habit?.emoji} {l.habit?.name}
              </li>
            ))}
          </TimelineBlock>
        )}

        {context.hospitalRecords.length > 0 && (
          <TimelineBlock title="병원" color="text-archive">
            {context.hospitalRecords.map((r) => (
              <li key={r.id}>
                <span className="text-text-muted">{formatDate(r.date, 'M/d')}</span>
                {' · '}{r.hospital} — {r.treatment}
                {r.result && <span className="text-text-muted"> ({r.result})</span>}
              </li>
            ))}
          </TimelineBlock>
        )}

        {context.sleepRecords.length > 0 && (
          <TimelineBlock title="수면" color="text-text-secondary">
            {context.sleepRecords.map((r) => (
              <li key={r.id}>
                <span className="text-text-muted">{formatDate(r.date, 'M/d')}</span>
                {' · '}{r.hours}시간
              </li>
            ))}
          </TimelineBlock>
        )}
      </div>
    </Card>
  )
}

function TimelineBlock({
  title,
  color,
  children,
}: {
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h4 className={`mb-1.5 text-xs font-semibold ${color}`}>{title}</h4>
      <ul className="flex flex-col gap-1 text-sm text-text-secondary">{children}</ul>
    </section>
  )
}
