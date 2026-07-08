import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card } from '../common/Card'
import Modal, { FormField, inputClass, selectClass, btnPrimary } from '../common/Modal'
import { useAsync } from '../../hooks/useAsync'
import { generateId, getAllExerciseRecords, saveExerciseRecord, deleteExerciseRecord } from '../../db'
import { formatDate, todayISO } from '../../utils/dates'
import type { ExerciseRecord, ExerciseIntensity, UserOwnedInput } from '../../types'

export default function ExerciseSection() {
  const [open, setOpen] = useState(false)
  const { data, reload } = useAsync(() => getAllExerciseRecords(), [])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary">운동</h2>
        <button onClick={() => setOpen(true)} className="rounded-lg bg-accent/20 p-2 text-accent"><Plus size={16} /></button>
      </div>
      {!data?.length ? (
        <Card><p className="text-sm text-text-muted">운동 기록이 없습니다.</p></Card>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((r) => (
            <Card key={r.id} className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{r.type}</p>
                <p className="text-xs text-text-muted">
                  {formatDate(r.date)}
                  {r.duration && ` · ${r.duration}분`}
                  {r.intensity && ` · ${r.intensity === 'low' ? '저' : r.intensity === 'medium' ? '중' : '고'}강도`}
                  {r.calories && ` · ${r.calories}kcal`}
                </p>
                {r.memo && <p className="mt-1 text-xs text-text-secondary">{r.memo}</p>}
              </div>
              <button onClick={() => deleteExerciseRecord(r.id).then(reload)} className="text-text-muted hover:text-danger"><Trash2 size={14} /></button>
            </Card>
          ))}
        </div>
      )}
      <ExerciseModal open={open} onClose={() => setOpen(false)} onSave={async (r) => { await saveExerciseRecord(r); reload(); setOpen(false) }} />
    </section>
  )
}

function ExerciseModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (r: UserOwnedInput<ExerciseRecord>) => Promise<void> }) {
  const [date, setDate] = useState(todayISO())
  const [type, setType] = useState('')
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState<ExerciseIntensity>('medium')
  const [calories, setCalories] = useState('')
  const [memo, setMemo] = useState('')

  return (
    <Modal open={open} onClose={onClose} title="운동 기록">
      <form onSubmit={(e) => {
        e.preventDefault()
        onSave({ id: generateId(), date, type, duration: duration ? +duration : undefined, intensity, calories: calories ? +calories : undefined, memo: memo || undefined })
      }} className="flex flex-col gap-4">
        <FormField label="날짜"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required /></FormField>
        <FormField label="운동 종류"><input className={inputClass} value={type} onChange={(e) => setType(e.target.value)} placeholder="웨이트, 러닝, 요가..." required /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="시간 (분)"><input type="number" className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value)} /></FormField>
          <FormField label="칼로리"><input type="number" className={inputClass} value={calories} onChange={(e) => setCalories(e.target.value)} /></FormField>
        </div>
        <FormField label="강도">
          <select className={selectClass} value={intensity} onChange={(e) => setIntensity(e.target.value as ExerciseIntensity)}>
            <option value="low">저</option><option value="medium">중</option><option value="high">고</option>
          </select>
        </FormField>
        <FormField label="메모"><input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} /></FormField>
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}
