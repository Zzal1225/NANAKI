import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card } from '../common/Card'
import Modal, { FormField, inputClass, selectClass, btnPrimary } from '../common/Modal'
import { useSections } from '../../context/SectionContext'
import { useAsync } from '../../hooks/useAsync'
import {
  generateId,
  getAllPeriodRecords, savePeriodRecord, deletePeriodRecord,
  getAllBpRecords, saveBpRecord, deleteBpRecord,
  getAllSugarRecords, saveSugarRecord, deleteSugarRecord,
  getAllSleepRecords, saveSleepRecord, deleteSleepRecord,
  getAllHospitalRecords, saveHospitalRecord, deleteHospitalRecord,
} from '../../db'
import { formatDate, todayISO, formatCurrency } from '../../utils/dates'
import { SUGAR_TIMING_LABELS } from '../../config/sections'
import type {
  PeriodRecord, BloodPressureRecord, BloodSugarRecord,
  SleepRecord, HospitalRecord, BloodSugarTiming, UserOwnedInput,
} from '../../types'

export default function HealthSection() {
  const { isSectionEnabled } = useSections()
  const hasAny = ['health-period', 'health-bp', 'health-sugar', 'health-sleep', 'health-hospital']
    .some((s) => isSectionEnabled(s as never))

  if (!hasAny) return null

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-sm font-semibold text-text-secondary">건강관리</h2>
      {isSectionEnabled('health-period') && <PeriodSubSection />}
      {isSectionEnabled('health-bp') && <BpSubSection />}
      {isSectionEnabled('health-sugar') && <SugarSubSection />}
      {isSectionEnabled('health-sleep') && <SleepSubSection />}
      {isSectionEnabled('health-hospital') && <HospitalSubSection />}
    </section>
  )
}

function SubHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-xs font-medium text-text-muted">{title}</h3>
      <button onClick={onAdd} className="rounded-lg p-1 text-accent hover:bg-accent/10"><Plus size={14} /></button>
    </div>
  )
}

function PeriodSubSection() {
  const [open, setOpen] = useState(false)
  const { data, reload } = useAsync(() => getAllPeriodRecords(), [])
  return (
    <div>
      <SubHeader title="생리 기록" onAdd={() => setOpen(true)} />
      {!data?.length ? <Card className="text-sm text-text-muted">기록 없음</Card> : (
        <div className="flex flex-col gap-2">
          {data.map((r) => (
            <RecordRow key={r.id} date={formatDate(r.startDate)} text={[r.endDate && `~ ${formatDate(r.endDate)}`, r.memo].filter(Boolean).join(' · ')} onDelete={() => deletePeriodRecord(r.id).then(reload)} />
          ))}
        </div>
      )}
      <PeriodModal open={open} onClose={() => setOpen(false)} onSave={async (r) => { await savePeriodRecord(r); reload(); setOpen(false) }} />
    </div>
  )
}

function BpSubSection() {
  const [open, setOpen] = useState(false)
  const { data, reload } = useAsync(() => getAllBpRecords(), [])
  return (
    <div>
      <SubHeader title="혈압" onAdd={() => setOpen(true)} />
      {!data?.length ? <Card className="text-sm text-text-muted">기록 없음</Card> : (
        <div className="flex flex-col gap-2">
          {data.map((r) => (
            <RecordRow key={r.id} date={formatDate(r.date)} text={`${r.systolic}/${r.diastolic} mmHg${r.memo ? ` · ${r.memo}` : ''}`} onDelete={() => deleteBpRecord(r.id).then(reload)} />
          ))}
        </div>
      )}
      <BpModal open={open} onClose={() => setOpen(false)} onSave={async (r) => { await saveBpRecord(r); reload(); setOpen(false) }} />
    </div>
  )
}

function SugarSubSection() {
  const [open, setOpen] = useState(false)
  const { data, reload } = useAsync(() => getAllSugarRecords(), [])
  return (
    <div>
      <SubHeader title="혈당" onAdd={() => setOpen(true)} />
      {!data?.length ? <Card className="text-sm text-text-muted">기록 없음</Card> : (
        <div className="flex flex-col gap-2">
          {data.map((r) => (
            <RecordRow key={r.id} date={formatDate(r.date)} text={`${r.value} mg/dL${r.timing ? ` (${SUGAR_TIMING_LABELS[r.timing]})` : ''}${r.memo ? ` · ${r.memo}` : ''}`} onDelete={() => deleteSugarRecord(r.id).then(reload)} />
          ))}
        </div>
      )}
      <SugarModal open={open} onClose={() => setOpen(false)} onSave={async (r) => { await saveSugarRecord(r); reload(); setOpen(false) }} />
    </div>
  )
}

function SleepSubSection() {
  const [open, setOpen] = useState(false)
  const { data, reload } = useAsync(() => getAllSleepRecords(), [])
  return (
    <div>
      <SubHeader title="수면" onAdd={() => setOpen(true)} />
      {!data?.length ? <Card className="text-sm text-text-muted">기록 없음</Card> : (
        <div className="flex flex-col gap-2">
          {data.map((r) => (
            <RecordRow key={r.id} date={formatDate(r.date)} text={`${r.hours}시간${r.quality ? ` · ${'★'.repeat(r.quality)}` : ''}${r.memo ? ` · ${r.memo}` : ''}`} onDelete={() => deleteSleepRecord(r.id).then(reload)} />
          ))}
        </div>
      )}
      <SleepModal open={open} onClose={() => setOpen(false)} onSave={async (r) => { await saveSleepRecord(r); reload(); setOpen(false) }} />
    </div>
  )
}

function HospitalSubSection() {
  const [open, setOpen] = useState(false)
  const { data, reload } = useAsync(() => getAllHospitalRecords(), [])
  return (
    <div>
      <SubHeader title="병원 방문" onAdd={() => setOpen(true)} />
      {!data?.length ? <Card className="text-sm text-text-muted">기록 없음</Card> : (
        <div className="flex flex-col gap-2">
          {data.map((r) => (
            <Card key={r.id}>
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{r.hospital}</p>
                  <p className="text-xs text-text-muted">{formatDate(r.date)} · {r.treatment}</p>
                  {r.amount != null && <p className="text-xs text-budget">{formatCurrency(r.amount)}</p>}
                  {r.result && <p className="mt-1 text-xs text-text-secondary">결과: {r.result}</p>}
                  {r.memo && <p className="mt-0.5 text-xs text-text-muted">{r.memo}</p>}
                </div>
                <button onClick={() => deleteHospitalRecord(r.id).then(reload)} className="text-text-muted hover:text-danger"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <HospitalModal open={open} onClose={() => setOpen(false)} onSave={async (r) => { await saveHospitalRecord(r); reload(); setOpen(false) }} />
    </div>
  )
}

function RecordRow({ date, text, onDelete }: { date: string; text: string; onDelete: () => void }) {
  return (
    <Card className="flex items-center justify-between py-3">
      <div>
        <p className="text-xs text-text-muted">{date}</p>
        <p className="text-sm">{text}</p>
      </div>
      <button onClick={onDelete} className="text-text-muted hover:text-danger"><Trash2 size={14} /></button>
    </Card>
  )
}

function PeriodModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (r: UserOwnedInput<PeriodRecord>) => Promise<void> }) {
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')
  const [memo, setMemo] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="생리 기록">
      <form onSubmit={(e) => { e.preventDefault(); onSave({ id: generateId(), startDate, endDate: endDate || undefined, memo: memo || undefined }) }} className="flex flex-col gap-4">
        <FormField label="시작일"><input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></FormField>
        <FormField label="종료일"><input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></FormField>
        <FormField label="메모"><input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} /></FormField>
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}

function BpModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (r: UserOwnedInput<BloodPressureRecord>) => Promise<void> }) {
  const [date, setDate] = useState(todayISO())
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [memo, setMemo] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="혈압 기록">
      <form onSubmit={(e) => { e.preventDefault(); onSave({ id: generateId(), date, systolic: +systolic, diastolic: +diastolic, memo: memo || undefined }) }} className="flex flex-col gap-4">
        <FormField label="날짜"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="수축기"><input type="number" className={inputClass} value={systolic} onChange={(e) => setSystolic(e.target.value)} required /></FormField>
          <FormField label="이완기"><input type="number" className={inputClass} value={diastolic} onChange={(e) => setDiastolic(e.target.value)} required /></FormField>
        </div>
        <FormField label="메모"><input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} /></FormField>
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}

function SugarModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (r: UserOwnedInput<BloodSugarRecord>) => Promise<void> }) {
  const [date, setDate] = useState(todayISO())
  const [value, setValue] = useState('')
  const [timing, setTiming] = useState<BloodSugarTiming>('fasting')
  const [memo, setMemo] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="혈당 기록">
      <form onSubmit={(e) => { e.preventDefault(); onSave({ id: generateId(), date, value: +value, timing, memo: memo || undefined }) }} className="flex flex-col gap-4">
        <FormField label="날짜"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required /></FormField>
        <FormField label="혈당 (mg/dL)"><input type="number" className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} required /></FormField>
        <FormField label="측정 시점">
          <select className={selectClass} value={timing} onChange={(e) => setTiming(e.target.value as BloodSugarTiming)}>
            {Object.entries(SUGAR_TIMING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </FormField>
        <FormField label="메모"><input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} /></FormField>
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}

function SleepModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (r: UserOwnedInput<SleepRecord>) => Promise<void> }) {
  const [date, setDate] = useState(todayISO())
  const [hours, setHours] = useState('')
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [memo, setMemo] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="수면 기록">
      <form onSubmit={(e) => { e.preventDefault(); onSave({ id: generateId(), date, hours: +hours, quality, memo: memo || undefined }) }} className="flex flex-col gap-4">
        <FormField label="날짜"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required /></FormField>
        <FormField label="수면 시간"><input type="number" step="0.5" className={inputClass} value={hours} onChange={(e) => setHours(e.target.value)} required /></FormField>
        <FormField label="수면 질">
          <div className="flex gap-1">{([1, 2, 3, 4, 5] as const).map((n) => (
            <button key={n} type="button" onClick={() => setQuality(n)} className={`px-2 py-1 text-sm ${quality >= n ? 'text-warning' : 'text-border'}`}>★</button>
          ))}</div>
        </FormField>
        <FormField label="메모"><input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} /></FormField>
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}

function HospitalModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (r: UserOwnedInput<HospitalRecord>) => Promise<void> }) {
  const [date, setDate] = useState(todayISO())
  const [hospital, setHospital] = useState('')
  const [treatment, setTreatment] = useState('')
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState('')
  const [memo, setMemo] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="병원 방문">
      <form onSubmit={(e) => { e.preventDefault(); onSave({ id: generateId(), date, hospital, treatment, amount: amount ? +amount : undefined, result: result || undefined, memo: memo || undefined }) }} className="flex flex-col gap-4">
        <FormField label="날짜"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required /></FormField>
        <FormField label="병원"><input className={inputClass} value={hospital} onChange={(e) => setHospital(e.target.value)} required /></FormField>
        <FormField label="진료/시술 내용"><input className={inputClass} value={treatment} onChange={(e) => setTreatment(e.target.value)} required /></FormField>
        <FormField label="금액"><input type="number" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} /></FormField>
        <FormField label="결과 (예: 알러지:새우)"><input className={inputClass} value={result} onChange={(e) => setResult(e.target.value)} placeholder="알러지:새우, 정상 등" /></FormField>
        <FormField label="메모"><textarea className={`${inputClass} min-h-[60px]`} value={memo} onChange={(e) => setMemo(e.target.value)} /></FormField>
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}
