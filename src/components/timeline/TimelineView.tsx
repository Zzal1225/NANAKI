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
    context.bodyPhotos.length > 0 ||
    context.expenses.length > 0 ||
    context.habitLogs.length > 0 ||
    context.archiveItems.length > 0

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
          <TimelineBlock title="체형" color="text-body">
            {context.bodyRecords.map((r) => (
              <li key={r.id}>
                <span className="text-text-muted">{formatDate(r.date, 'M/d')}</span>
                {' · '}
                {r.weight != null && `${r.weight}kg`}
                {r.bodyFat != null && ` · 체지방 ${r.bodyFat}%`}
              </li>
            ))}
          </TimelineBlock>
        )}

        {context.bodyPhotos.length > 0 && (
          <TimelineBlock title="눈바디" color="text-body">
            {context.bodyPhotos.map((p) => (
              <li key={p.id}>
                <span className="text-text-muted">{formatDate(p.date, 'M/d')}</span>
                {' · '}사진
              </li>
            ))}
          </TimelineBlock>
        )}

        {context.expenses.length > 0 && (
          <TimelineBlock title={`가계부 · ${formatCurrency(totalExpense)}`} color="text-budget">
            {context.expenses.map((e) => (
              <li key={e.id}>
                <span className="text-text-muted">{formatDate(e.date, 'M/d')}</span>
                {' · '}
                {e.categoryName} {formatCurrency(e.amount)}
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
                {' · '}
                {l.habit?.emoji} {l.habit?.name}
              </li>
            ))}
          </TimelineBlock>
        )}

        {context.archiveItems.length > 0 && (
          <TimelineBlock title="기록" color="text-archive">
            {context.archiveItems.map((item) => (
              <li key={item.id}>
                <span className="text-text-muted">{formatDate(item.date, 'M/d')}</span>
                {' · '}
                {item.title}
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
