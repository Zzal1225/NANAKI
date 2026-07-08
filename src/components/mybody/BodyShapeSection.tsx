import { useState } from 'react'
import { Plus, Trash2, Link2 } from 'lucide-react'
import { Card, StatCard } from '../common/Card'
import Modal, { FormField, inputClass, btnPrimary } from '../common/Modal'
import TimelineView from '../timeline/TimelineView'
import { useAsync } from '../../hooks/useAsync'
import { generateId, getAllBodyRecords, saveBodyRecord, deleteBodyRecord, getPeriodContext } from '../../db'
import { formatDate, todayISO } from '../../utils/dates'
import type { BodyRecord, UserOwnedInput } from '../../types'

export default function BodyShapeSection() {
  const [showModal, setShowModal] = useState(false)
  const [linkedDate, setLinkedDate] = useState<string | null>(null)
  const { data: records, reload } = useAsync(() => getAllBodyRecords(), [])

  const { data: periodContext, loading: timelineLoading } = useAsync(
    () => (linkedDate ? getPeriodContext(linkedDate, 7) : Promise.resolve(null)),
    [linkedDate],
  )

  const latest = records?.[0]
  const prev = records?.[1]

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary">체형관리</h2>
        <button onClick={() => setShowModal(true)} className="rounded-lg bg-accent/20 p-2 text-accent">
          <Plus size={16} />
        </button>
      </div>

      {latest && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="체중" value={latest.weight ? `${latest.weight}kg` : '—'} sub={prev?.weight ? `이전 ${prev.weight}kg` : undefined} color="text-body" />
          <StatCard label="체지방" value={latest.bodyFat ? `${latest.bodyFat}%` : '—'} sub={prev?.bodyFat ? `이전 ${prev.bodyFat}%` : undefined} />
          <StatCard label="허리" value={latest.measurements?.waist ? `${latest.measurements.waist}cm` : '—'} />
          <StatCard label="골격근량" value={latest.inbody?.skeletalMuscle ? `${latest.inbody.skeletalMuscle}kg` : '—'} />
        </div>
      )}

      {!records?.length ? (
        <Card><p className="text-sm text-text-muted">아직 기록이 없습니다.</p></Card>
      ) : (
        <div className="flex flex-col gap-2">
          {records.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatDate(r.date)}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                    {r.weight && <span>체중 {r.weight}kg</span>}
                    {r.bodyFat && <span>체지방 {r.bodyFat}%</span>}
                    {r.measurements?.waist && <span>허리 {r.measurements.waist}cm</span>}
                    {r.inbody?.skeletalMuscle && <span>근육 {r.inbody.skeletalMuscle}kg</span>}
                    {r.inbody?.bmi && <span>BMI {r.inbody.bmi}</span>}
                  </div>
                  {r.memo && <p className="mt-1 text-xs text-text-muted">{r.memo}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setLinkedDate(linkedDate === r.date ? null : r.date)}
                    className={`rounded-lg p-1.5 ${linkedDate === r.date ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-accent'}`}
                    title="기간 연결 분석"
                  >
                    <Link2 size={14} />
                  </button>
                  <button onClick={async () => { await deleteBodyRecord(r.id); reload() }} className="p-1.5 text-text-muted hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {linkedDate && (
        <TimelineView context={periodContext} loading={timelineLoading} />
      )}

      <BodyRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={async (record) => { await saveBodyRecord(record); reload(); setShowModal(false) }}
      />
    </section>
  )
}

function BodyRecordModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (r: UserOwnedInput<BodyRecord>) => Promise<void> }) {
  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [waist, setWaist] = useState('')
  const [hip, setHip] = useState('')
  const [chest, setChest] = useState('')
  const [arm, setArm] = useState('')
  const [thigh, setThigh] = useState('')
  const [skeletalMuscle, setSkeletalMuscle] = useState('')
  const [bmi, setBmi] = useState('')
  const [visceralFat, setVisceralFat] = useState('')
  const [basalMetabolic, setBasalMetabolic] = useState('')
  const [memo, setMemo] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const measurements = {
      ...(waist && { waist: parseFloat(waist) }),
      ...(hip && { hip: parseFloat(hip) }),
      ...(chest && { chest: parseFloat(chest) }),
      ...(arm && { arm: parseFloat(arm) }),
      ...(thigh && { thigh: parseFloat(thigh) }),
    }
    const inbody = {
      ...(skeletalMuscle && { skeletalMuscle: parseFloat(skeletalMuscle) }),
      ...(bmi && { bmi: parseFloat(bmi) }),
      ...(visceralFat && { visceralFat: parseFloat(visceralFat) }),
      ...(basalMetabolic && { basalMetabolic: parseFloat(basalMetabolic) }),
    }
    await onSave({
      id: generateId(),
      date,
      ...(weight && { weight: parseFloat(weight) }),
      ...(bodyFat && { bodyFat: parseFloat(bodyFat) }),
      ...(Object.keys(measurements).length > 0 && { measurements }),
      ...(Object.keys(inbody).length > 0 && { inbody }),
      ...(memo && { memo }),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="체형 기록">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="날짜"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="체중 (kg)"><input type="number" step="0.1" className={inputClass} value={weight} onChange={(e) => setWeight(e.target.value)} /></FormField>
          <FormField label="체지방 (%)"><input type="number" step="0.1" className={inputClass} value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} /></FormField>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[{ l: '허리', v: waist, s: setWaist }, { l: '엉덩이', v: hip, s: setHip }, { l: '가슴', v: chest, s: setChest }, { l: '팔', v: arm, s: setArm }, { l: '허벅지', v: thigh, s: setThigh }].map(({ l, v, s }) => (
            <FormField key={l} label={l}><input type="number" step="0.1" className={inputClass} value={v} onChange={(e) => s(e.target.value)} /></FormField>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="골격근량 (kg)"><input type="number" step="0.1" className={inputClass} value={skeletalMuscle} onChange={(e) => setSkeletalMuscle(e.target.value)} /></FormField>
          <FormField label="BMI"><input type="number" step="0.1" className={inputClass} value={bmi} onChange={(e) => setBmi(e.target.value)} /></FormField>
          <FormField label="내장지방"><input type="number" step="0.1" className={inputClass} value={visceralFat} onChange={(e) => setVisceralFat(e.target.value)} /></FormField>
          <FormField label="기초대사 (kcal)"><input type="number" className={inputClass} value={basalMetabolic} onChange={(e) => setBasalMetabolic(e.target.value)} /></FormField>
        </div>
        <FormField label="메모"><input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} /></FormField>
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}
