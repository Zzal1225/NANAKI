import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Link2 } from 'lucide-react'
import { Card, StatCard } from '../common/Card'
import Modal, { FormField, inputClass, btnPrimary } from '../common/Modal'
import TimelineView from '../timeline/TimelineView'
import { useAsync } from '../../hooks/useAsync'
import { generateId, getAllBodyRecords, saveBodyRecord, deleteBodyRecord, getPeriodContext, getAppSettings } from '../../db'
import { formatDate, todayISO } from '../../utils/dates'
import type { BodyMetricKey, BodyRecord, UserOwnedInput } from '../../types'
import {
  BODY_METRIC_LABELS,
  DEFAULT_BODY_INTERVALS,
  findLastMetricDate,
  getNextDueDate,
  isMeasurementDue,
} from '../../body/measurementReminders'

export default function BodyMetricsSection({
  month,
  openCreateTick = 0,
}: {
  month?: string
  openCreateTick?: number
}) {
  const [showModal, setShowModal] = useState(false)
  const [linkedDate, setLinkedDate] = useState<string | null>(null)
  const { data: records, reload } = useAsync(() => getAllBodyRecords(), [])
  const { data: settings } = useAsync(() => getAppSettings(), [])

  useEffect(() => {
    if (openCreateTick <= 0) return
    setShowModal(true)
  }, [openCreateTick])

  const { data: periodContext, loading: timelineLoading } = useAsync(
    () => (linkedDate ? getPeriodContext(linkedDate, 7) : Promise.resolve(null)),
    [linkedDate],
  )

  const monthRecords = useMemo(() => {
    if (!records) return []
    if (!month) return records
    return records.filter((r) => r.date.startsWith(month))
  }, [records, month])

  const latest = monthRecords[0]
  const prev = monthRecords[1]
  const today = todayISO()

  const dueMetrics = useMemo(() => {
    if (!records) return []
    const intervals = { ...DEFAULT_BODY_INTERVALS, ...settings?.bodyMeasurementIntervals }
    return (Object.keys(BODY_METRIC_LABELS) as BodyMetricKey[]).filter((metric) =>
      isMeasurementDue(findLastMetricDate(records, metric), intervals[metric], today),
    )
  }, [records, settings, today])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary">체중 · 둘레</h2>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-accent/20 p-2 text-accent"
          aria-label="체형 기록 추가"
        >
          <Plus size={16} />
        </button>
      </div>

      {dueMetrics.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <p className="text-xs font-medium text-accent">측정 예정</p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-text-secondary">
            {dueMetrics.map((metric) => {
              const intervals = { ...DEFAULT_BODY_INTERVALS, ...settings?.bodyMeasurementIntervals }
              const last = findLastMetricDate(records ?? [], metric)
              const next = getNextDueDate(last, intervals[metric])
              return (
                <li key={metric}>
                  {BODY_METRIC_LABELS[metric]}
                  {last ? ` · 마지막 ${formatDate(last)}` : ' · 기록 없음'}
                  {next && ` · 다음 ${formatDate(next)}`}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {latest && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="체중"
            value={latest.weight ? `${latest.weight}kg` : '—'}
            sub={prev?.weight ? `이전 ${prev.weight}kg` : undefined}
            color="text-body"
          />
          <StatCard
            label="체지방"
            value={latest.bodyFat ? `${latest.bodyFat}%` : '—'}
            sub={prev?.bodyFat ? `이전 ${prev.bodyFat}%` : undefined}
          />
          <StatCard label="허리" value={latest.measurements?.waist ? `${latest.measurements.waist}cm` : '—'} />
          <StatCard label="엉덩이" value={latest.measurements?.hip ? `${latest.measurements.hip}cm` : '—'} />
        </div>
      )}

      {!monthRecords.length ? (
        <Card>
          <p className="text-sm text-text-muted">
            {month ? '이 달의 체형 기록이 없습니다.' : '아직 기록이 없습니다.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {monthRecords.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatDate(r.date)}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                    {r.weight != null && <span>체중 {r.weight}kg</span>}
                    {r.bodyFat != null && <span>체지방 {r.bodyFat}%</span>}
                    {r.measurements?.waist != null && <span>허리 {r.measurements.waist}cm</span>}
                    {r.measurements?.hip != null && <span>엉덩이 {r.measurements.hip}cm</span>}
                    {r.measurements?.chest != null && <span>가슴 {r.measurements.chest}cm</span>}
                    {r.measurements?.arm != null && <span>팔 {r.measurements.arm}cm</span>}
                    {r.measurements?.thigh != null && <span>허벅지 {r.measurements.thigh}cm</span>}
                    {r.measurements?.calf != null && <span>종아리 {r.measurements.calf}cm</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setLinkedDate(linkedDate === r.date ? null : r.date)}
                    className={`rounded-lg p-1.5 ${linkedDate === r.date ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-accent'}`}
                    title="기간 연결 분석"
                  >
                    <Link2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteBodyRecord(r.id)
                      reload()
                    }}
                    className="p-1.5 text-text-muted hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {linkedDate && <TimelineView context={periodContext} loading={timelineLoading} />}

      <BodyRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={async (record) => {
          await saveBodyRecord(record)
          reload()
          setShowModal(false)
        }}
      />
    </section>
  )
}

function BodyRecordModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (r: UserOwnedInput<BodyRecord>) => Promise<void>
}) {
  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [waist, setWaist] = useState('')
  const [hip, setHip] = useState('')
  const [chest, setChest] = useState('')
  const [arm, setArm] = useState('')
  const [thigh, setThigh] = useState('')
  const [calf, setCalf] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const measurements = {
      ...(waist && { waist: parseFloat(waist) }),
      ...(hip && { hip: parseFloat(hip) }),
      ...(chest && { chest: parseFloat(chest) }),
      ...(arm && { arm: parseFloat(arm) }),
      ...(thigh && { thigh: parseFloat(thigh) }),
      ...(calf && { calf: parseFloat(calf) }),
    }
    await onSave({
      id: generateId(),
      date,
      ...(weight && { weight: parseFloat(weight) }),
      ...(bodyFat && { bodyFat: parseFloat(bodyFat) }),
      ...(Object.keys(measurements).length > 0 && { measurements }),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="체형 기록">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="날짜">
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="체중 (kg)">
            <input type="number" step="0.1" className={inputClass} value={weight} onChange={(e) => setWeight(e.target.value)} />
          </FormField>
          <FormField label="체지방 (%)">
            <input type="number" step="0.1" className={inputClass} value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: '허리', v: waist, s: setWaist },
            { l: '엉덩이', v: hip, s: setHip },
            { l: '가슴', v: chest, s: setChest },
            { l: '팔', v: arm, s: setArm },
            { l: '허벅지', v: thigh, s: setThigh },
            { l: '종아리', v: calf, s: setCalf },
          ].map(({ l, v, s }) => (
            <FormField key={l} label={`${l} (cm)`}>
              <input type="number" step="0.1" className={inputClass} value={v} onChange={(e) => s(e.target.value)} />
            </FormField>
          ))}
        </div>
        <button type="submit" className={btnPrimary}>
          저장
        </button>
      </form>
    </Modal>
  )
}
