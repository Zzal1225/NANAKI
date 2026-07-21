import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card } from '../common/Card'
import Modal, { FormField, inputClass, btnPrimary, btnSecondary } from '../common/Modal'
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
import type { BodyMeasurements, BodyRecord, CircumferencePart, UserOwnedInput } from '../../types'
import {
  resolveBodySectionIntervals,
  resolveCircumferenceParts,
} from '../../body/sectionConfig'
import {
  findPreviousCircumferenceValue,
  formatCmDelta,
  getCircumferenceDelta,
  getNextDueDate,
  isMeasurementDue,
  findLastCircumferenceDate,
} from '../../body/sectionReminders'

export default function BodyCircumferenceSection({ month }: { month?: string }) {
  const [showModal, setShowModal] = useState(false)
  const [showPartModal, setShowPartModal] = useState(false)
  const [savingInterval, setSavingInterval] = useState(false)
  const { data: records, reload } = useAsync(() => getAllBodyRecords(), [])
  const { data: settings, reload: reloadSettings } = useAsync(() => getAppSettings(), [])

  const parts = resolveCircumferenceParts(settings?.circumferenceParts)
  const intervals = resolveBodySectionIntervals(settings?.bodySectionIntervals)
  const today = todayISO()

  const circRecords = useMemo(() => {
    const list = (records ?? []).filter(
      (r) => r.measurements && Object.values(r.measurements).some((v) => v != null),
    )
    if (!month) return list
    return list.filter((r) => r.date.startsWith(month))
  }, [records, month])

  const allCirc = useMemo(
    () =>
      (records ?? []).filter(
        (r) => r.measurements && Object.values(r.measurements).some((v) => v != null),
      ),
    [records],
  )

  const latest = allCirc[0]
  const lastDate = findLastCircumferenceDate(records ?? [])
  const due = isMeasurementDue(lastDate, intervals.circumference, today)
  const nextDue = getNextDueDate(lastDate, intervals.circumference)

  const updateInterval = async (days: number) => {
    if (!settings) return
    setSavingInterval(true)
    try {
      await saveAppSettings({
        ...settings,
        bodySectionIntervals: {
          ...settings.bodySectionIntervals,
          circumference: days,
        },
      })
      reloadSettings()
    } finally {
      setSavingInterval(false)
    }
  }

  const saveParts = async (next: CircumferencePart[]) => {
    if (!settings) return
    await saveAppSettings({ ...settings, circumferenceParts: next })
    reloadSettings()
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">신체둘레</h3>
        <div className="flex items-center gap-2">
          <IntervalDaysField
            days={intervals.circumference}
            disabled={savingInterval}
            onChange={(d) => void updateInterval(d)}
          />
          <button
            type="button"
            onClick={() => setShowPartModal(true)}
            className="rounded-lg border border-border px-2 py-1.5 text-[11px] text-text-secondary hover:border-accent/50"
          >
            부위
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-accent/20 p-2 text-accent"
            aria-label="둘레 기록 추가"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {due && (
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
          측정 예정
          {lastDate ? ` · 마지막 ${formatDate(lastDate)}` : ' · 기록 없음'}
          {nextDue && nextDue > today ? ` · 다음 ${formatDate(nextDue)}` : ''}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {parts.map((part) => {
          const value = latest?.measurements?.[part.id]
          const prevVal = findPreviousCircumferenceValue(allCirc, part.id, latest?.id)
          const d = value != null ? getCircumferenceDelta(value, prevVal) : null
          const dLabel = formatCmDelta(d)
          return (
            <Card key={part.id} className="flex flex-col gap-0.5">
              <p className="text-[11px] text-text-muted">{part.name}</p>
              <p className="text-lg font-bold tabular-nums text-text-primary">
                {value != null ? `${value}cm` : '—'}
              </p>
              {dLabel && (
                <p className="text-[10px] tabular-nums text-text-secondary">전 측정 {dLabel}</p>
              )}
            </Card>
          )
        })}
      </div>

      {!circRecords.length ? (
        <Card>
          <p className="text-sm text-text-muted">
            {month ? '이 달의 둘레 기록이 없습니다.' : '아직 둘레 기록이 없습니다.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {circRecords.map((r) => (
            <Card key={r.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{formatDate(r.date)}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                  {parts.map((p) => {
                    const v = r.measurements?.[p.id]
                    if (v == null) return null
                    return (
                      <span key={p.id}>
                        {p.name} {v}cm
                      </span>
                    )
                  })}
                </div>
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
          ))}
        </div>
      )}

      <CircumferenceModal
        open={showModal}
        parts={parts}
        onClose={() => setShowModal(false)}
        onSave={async (record) => {
          await saveBodyRecord(record)
          reload()
          setShowModal(false)
        }}
      />

      <PartsModal
        open={showPartModal}
        parts={parts}
        onClose={() => setShowPartModal(false)}
        onSave={async (next) => {
          await saveParts(next)
          setShowPartModal(false)
        }}
      />
    </section>
  )
}

function CircumferenceModal({
  open,
  parts,
  onClose,
  onSave,
}: {
  open: boolean
  parts: CircumferencePart[]
  onClose: () => void
  onSave: (r: UserOwnedInput<BodyRecord>) => Promise<void>
}) {
  const [date, setDate] = useState(todayISO())
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setDate(todayISO())
      setValues({})
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title="신체둘레 기록">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const measurements: BodyMeasurements = {}
          for (const p of parts) {
            const raw = values[p.id]
            if (!raw) continue
            const n = parseFloat(raw)
            if (!Number.isNaN(n)) measurements[p.id] = n
          }
          if (Object.keys(measurements).length === 0) return
          await onSave({ id: generateId(), date, measurements })
        }}
      >
        <DateField value={date} onChange={setDate} />
        <div className="grid grid-cols-2 gap-3">
          {parts.map((p) => (
            <FormField key={p.id} label={`${p.name} (cm)`}>
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={values[p.id] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
              />
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

function PartsModal({
  open,
  parts,
  onClose,
  onSave,
}: {
  open: boolean
  parts: CircumferencePart[]
  onClose: () => void
  onSave: (parts: CircumferencePart[]) => Promise<void>
}) {
  const [draft, setDraft] = useState(parts)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (open) {
      setDraft(parts)
      setNewName('')
    }
  }, [open, parts])

  return (
    <Modal open={open} onClose={onClose} title="둘레 부위 관리">
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {draft.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>
                {p.name}
                {p.builtin && (
                  <span className="ml-1.5 text-[10px] text-text-muted">기본</span>
                )}
              </span>
              {!p.builtin && (
                <button
                  type="button"
                  className="text-text-muted hover:text-danger"
                  onClick={() => setDraft((d) => d.filter((x) => x.id !== p.id))}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="새 부위 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              const name = newName.trim()
              if (!name) return
              setDraft((d) => [...d, { id: generateId(), name }])
              setNewName('')
            }}
          >
            추가
          </button>
        </div>
        <button type="button" className={btnPrimary} onClick={() => void onSave(draft)}>
          저장
        </button>
      </div>
    </Modal>
  )
}
