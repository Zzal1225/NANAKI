import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card } from '../common/Card'
import Modal, { FormField, inputClass, btnPrimary } from '../common/Modal'
import { IntervalDaysField, DateField } from './IntervalDaysField'
import { useAsync } from '../../hooks/useAsync'
import {
  generateId,
  getAllBodyRecords,
  saveBodyRecord,
  deleteBodyRecord,
  getAppSettings,
  saveAppSettings,
} from '../../db'
import { formatDate, todayISO } from '../../utils/dates'
import type { BodyRecord, UserOwnedInput } from '../../types'
import { resolveBodySectionIntervals } from '../../body/sectionConfig'
import {
  findPreviousWeight,
  formatWeightDelta,
  getNextDueDate,
  getWeightDelta,
  isMeasurementDue,
} from '../../body/sectionReminders'

export default function BodyWeightSection({
  month,
  openCreateTick = 0,
}: {
  month?: string
  openCreateTick?: number
}) {
  const [showModal, setShowModal] = useState(false)
  const [savingInterval, setSavingInterval] = useState(false)
  const { data: records, reload } = useAsync(() => getAllBodyRecords(), [])
  const { data: settings, reload: reloadSettings } = useAsync(() => getAppSettings(), [])

  useEffect(() => {
    if (openCreateTick <= 0) return
    setShowModal(true)
  }, [openCreateTick])

  const weightRecords = useMemo(() => {
    const list = (records ?? []).filter((r) => r.weight != null)
    if (!month) return list
    return list.filter((r) => r.date.startsWith(month))
  }, [records, month])

  const allWeightSorted = useMemo(
    () => (records ?? []).filter((r) => r.weight != null),
    [records],
  )

  const latest = allWeightSorted[0]
  const previous = findPreviousWeight(allWeightSorted, latest?.id)
  const delta =
    latest?.weight != null ? getWeightDelta(latest.weight, previous?.weight) : null
  const deltaLabel = formatWeightDelta(delta)

  const intervals = resolveBodySectionIntervals(settings?.bodySectionIntervals)
  const today = todayISO()
  const lastDate = latest?.date
  const due = isMeasurementDue(lastDate, intervals.weight, today)
  const nextDue = getNextDueDate(lastDate, intervals.weight)

  const updateInterval = async (days: number) => {
    if (!settings) return
    setSavingInterval(true)
    try {
      await saveAppSettings({
        ...settings,
        bodySectionIntervals: {
          ...settings.bodySectionIntervals,
          weight: days,
        },
      })
      reloadSettings()
    } finally {
      setSavingInterval(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">체중</h3>
        <div className="flex items-center gap-2">
          <IntervalDaysField
            days={intervals.weight}
            disabled={savingInterval}
            onChange={(d) => void updateInterval(d)}
          />
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-accent/20 p-2 text-accent"
            aria-label="체중 기록 추가"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {due && (
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
          측정 예정
          {lastDate ? ` · 마지막 ${formatDate(lastDate)}` : ' · 기록 없음'}
          {nextDue && lastDate && nextDue <= today ? '' : nextDue ? ` · 다음 ${formatDate(nextDue)}` : ''}
        </p>
      )}

      <Card className="flex flex-col gap-1">
        <p className="text-xs text-text-muted">최근 체중</p>
        <p className="text-2xl font-bold tabular-nums text-body">
          {latest?.weight != null ? `${latest.weight}kg` : '—'}
        </p>
        {deltaLabel && (
          <p
            className={`text-xs font-medium tabular-nums ${
              delta != null && delta < 0
                ? 'text-success'
                : delta != null && delta > 0
                  ? 'text-warning'
                  : 'text-text-secondary'
            }`}
          >
            {deltaLabel}
            {previous && (
              <span className="ml-1 font-normal text-text-muted">
                ({formatDate(previous.date, 'M/d')} {previous.weight}kg)
              </span>
            )}
          </p>
        )}
      </Card>

      {!weightRecords.length ? (
        <Card>
          <p className="text-sm text-text-muted">
            {month ? '이 달의 체중 기록이 없습니다.' : '아직 체중 기록이 없습니다.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {weightRecords.map((r, i) => {
            const prevRec = weightRecords[i + 1]
            const d =
              r.weight != null && prevRec?.weight != null
                ? getWeightDelta(r.weight, prevRec.weight)
                : null
            const dLabel = formatWeightDelta(d)
            return (
              <Card key={r.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{formatDate(r.date)}</p>
                  <p className="text-sm tabular-nums text-text-secondary">
                    {r.weight}kg
                    {dLabel && (
                      <span className="ml-2 text-xs text-text-muted">{dLabel}</span>
                    )}
                  </p>
                </div>
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
              </Card>
            )
          })}
        </div>
      )}

      <WeightModal
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

function WeightModal({
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

  useEffect(() => {
    if (open) {
      setDate(todayISO())
      setWeight('')
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title="체중 기록">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const w = parseFloat(weight)
          if (Number.isNaN(w)) return
          await onSave({ id: generateId(), date, weight: w })
        }}
      >
        <DateField value={date} onChange={setDate} />
        <FormField label="체중 (kg)">
          <input
            type="number"
            step="0.1"
            className={inputClass}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
            autoFocus
          />
        </FormField>
        <button type="submit" className={btnPrimary}>
          저장
        </button>
      </form>
    </Modal>
  )
}
