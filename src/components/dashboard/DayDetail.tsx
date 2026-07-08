import type { DaySummary } from '../../types'
import { formatCurrency, formatDate, ARCHIVE_TYPE_LABELS } from '../../utils/dates'
import { SUGAR_TIMING_LABELS } from '../../config/sections'
import { Card, CardTitle } from '../common/Card'

interface DayDetailProps {
  summary: DaySummary | null
  loading: boolean
}

export default function DayDetail({ summary, loading }: DayDetailProps) {
  if (loading) {
    return (
      <Card>
        <p className="text-sm text-text-muted">불러오는 중...</p>
      </Card>
    )
  }

  if (!summary) return null

  const totalExpense = summary.expenses.reduce((s, e) => s + e.amount, 0)
  const isEmpty =
    summary.expenses.length === 0 &&
    summary.bodyRecords.length === 0 &&
    summary.archiveItems.length === 0 &&
    summary.habitLogs.length === 0 &&
    summary.periodRecords.length === 0 &&
    summary.bpRecords.length === 0 &&
    summary.sugarRecords.length === 0 &&
    summary.sleepRecords.length === 0 &&
    summary.hospitalRecords.length === 0 &&
    summary.exercises.length === 0

  return (
    <Card>
      <CardTitle>{formatDate(summary.date)} 기록</CardTitle>

      {isEmpty ? (
        <p className="mt-3 text-sm text-text-muted">이 날의 기록이 없습니다.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {summary.habitLogs.length > 0 && (
            <Block title="습관" color="text-habit-good">
              <div className="flex flex-wrap gap-2">
                {summary.habitLogs.map((log) => (
                  <span key={log.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs" style={{ backgroundColor: `${log.habit?.color ?? '#34d399'}22`, color: log.habit?.color }}>
                    {log.habit?.emoji} {log.habit?.name}
                  </span>
                ))}
              </div>
            </Block>
          )}

          {summary.expenses.length > 0 && (
            <Block title={`지출 · ${formatCurrency(totalExpense)}`} color="text-budget">
              <ul className="flex flex-col gap-1.5">
                {summary.expenses.map((e) => (
                  <li key={e.id} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{e.categoryName}{e.subItem && <span className="ml-1 text-text-muted">· {e.subItem}</span>}</span>
                    <span>{formatCurrency(e.amount)}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {summary.bodyRecords.length > 0 && (
            <Block title="체형" color="text-body">
              {summary.bodyRecords.map((r) => (
                <div key={r.id} className="text-sm text-text-secondary">
                  {r.weight && <span>체중 {r.weight}kg</span>}
                  {r.bodyFat && <span className="ml-2">체지방 {r.bodyFat}%</span>}
                  {r.inbody?.skeletalMuscle && <span className="ml-2">근육 {r.inbody.skeletalMuscle}kg</span>}
                  {r.memo && <p className="mt-1 text-text-muted">{r.memo}</p>}
                </div>
              ))}
            </Block>
          )}

          {summary.exercises.length > 0 && (
            <Block title="운동" color="text-success">
              {summary.exercises.map((r) => (
                <p key={r.id} className="text-sm text-text-secondary">{r.type}{r.duration && ` · ${r.duration}분`}</p>
              ))}
            </Block>
          )}

          {summary.hospitalRecords.length > 0 && (
            <Block title="병원" color="text-archive">
              {summary.hospitalRecords.map((r) => (
                <p key={r.id} className="text-sm text-text-secondary">{r.hospital} — {r.treatment}{r.result && ` (${r.result})`}</p>
              ))}
            </Block>
          )}

          {summary.bpRecords.length > 0 && (
            <Block title="혈압" color="text-text-secondary">
              {summary.bpRecords.map((r) => (
                <p key={r.id} className="text-sm">{r.systolic}/{r.diastolic} mmHg</p>
              ))}
            </Block>
          )}

          {summary.sugarRecords.length > 0 && (
            <Block title="혈당" color="text-text-secondary">
              {summary.sugarRecords.map((r) => (
                <p key={r.id} className="text-sm">{r.value} mg/dL{r.timing && ` (${SUGAR_TIMING_LABELS[r.timing]})`}</p>
              ))}
            </Block>
          )}

          {summary.sleepRecords.length > 0 && (
            <Block title="수면" color="text-text-secondary">
              {summary.sleepRecords.map((r) => (
                <p key={r.id} className="text-sm">{r.hours}시간</p>
              ))}
            </Block>
          )}

          {summary.periodRecords.length > 0 && (
            <Block title="생리" color="text-habit-bad">
              <p className="text-sm text-text-secondary">진행 중</p>
            </Block>
          )}

          {summary.archiveItems.length > 0 && (
            <Block title="아카이브" color="text-archive">
              <ul className="flex flex-col gap-1.5">
                {summary.archiveItems.map((item) => (
                  <li key={item.id} className="text-sm">
                    <span className="text-text-muted">[{ARCHIVE_TYPE_LABELS[item.type]}]</span> {item.title}
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      )}
    </Card>
  )
}

function Block({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className={`mb-2 text-xs font-medium ${color}`}>{title}</h4>
      {children}
    </section>
  )
}
