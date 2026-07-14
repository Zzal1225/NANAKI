import { useEffect, useMemo, useState } from 'react'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '../common/Card'
import Modal, {
  FormField,
  btnPrimary,
  btnSecondary,
  inputClass,
  selectClass,
} from '../common/Modal'
import { useAsync } from '../../hooks/useAsync'
import {
  deleteLifeRoutine,
  generateId,
  getAllLifeRoutines,
  saveLifeRoutine,
} from '../../db'
import {
  calculateNextDueAt,
  daysUntilDue,
  formatIntervalLabel,
  markRoutineDone,
} from '../../life/nextDue'
import {
  INTERVAL_PRESETS,
  ROUTINE_GROUP_LABELS,
  ROUTINE_TEMPLATES,
  type RoutineTemplate,
} from '../../life/templates'
import { formatDate, todayISO } from '../../utils/dates'
import type { LifeRoutine, LifeRoutineGroup, UserOwnedInput } from '../../types'

const GROUP_ORDER: LifeRoutineGroup[] = ['chores', 'consumables', 'health', 'custom']

export default function LifeRoutinesSection({
  month,
  openCreateTick = 0,
}: {
  month?: string
  /** 헤더 추가 버튼 등 외부에서 생성 모달 열기 */
  openCreateTick?: number
}) {
  const { data: routines, loading, reload } = useAsync(() => getAllLifeRoutines(), [])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LifeRoutine | null>(null)
  const [seedOpen, setSeedOpen] = useState(false)

  useEffect(() => {
    if (openCreateTick <= 0) return
    setEditing(null)
    setModalOpen(true)
  }, [openCreateTick])

  const visibleRoutines = useMemo(() => {
    if (!routines) return []
    if (!month) return routines
    return routines.filter(
      (r) => r.nextDueAt.startsWith(month) || (r.lastDoneAt?.startsWith(month) ?? false),
    )
  }, [routines, month])

  const byGroup = useMemo(() => {
    const map = new Map<LifeRoutineGroup, LifeRoutine[]>()
    for (const g of GROUP_ORDER) map.set(g, [])
    for (const r of visibleRoutines) {
      const list = map.get(r.group) ?? map.get('custom')!
      list.push(r)
    }
    return map
  }, [visibleRoutines])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (routine: LifeRoutine) => {
    setEditing(routine)
    setModalOpen(true)
  }

  const handleDone = async (routine: LifeRoutine) => {
    await saveLifeRoutine(markRoutineDone(routine))
    await reload()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 반복 항목을 삭제할까요?')) return
    await deleteLifeRoutine(id)
    await reload()
  }

  const handleAddFromTemplate = async (template: RoutineTemplate) => {
    const today = todayISO()
    const record: UserOwnedInput<LifeRoutine> = {
      id: generateId(),
      name: template.name,
      group: template.group,
      intervalDays: template.intervalDays,
      suggestedIntervalDays: template.suggestedIntervalDays,
      lastDoneAt: today,
      nextDueAt: calculateNextDueAt(today, template.intervalDays, today),
    }
    await saveLifeRoutine(record)
    await reload()
    setSeedOpen(false)
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-secondary">반복 관리</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSeedOpen(true)}
            className={`${btnSecondary} w-auto px-3 py-1.5 text-xs`}
          >
            템플릿
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-accent/20 p-2 text-accent"
            aria-label="반복 항목 추가"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {loading && !routines ? (
        <Card>
          <p className="text-sm text-text-muted">불러오는 중...</p>
        </Card>
      ) : (routines?.length ?? 0) === 0 ? (
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            수건 교체 · 칫솔 · 검진처럼 주기적으로 할 일을 추가하세요.
          </p>
          <button type="button" className={btnPrimary} onClick={() => setSeedOpen(true)}>
            권장 템플릿 보기
          </button>
        </Card>
      ) : visibleRoutines.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">이 달에 예정·실행된 반복 항목이 없습니다.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {GROUP_ORDER.map((group) => {
            const list = byGroup.get(group) ?? []
            if (list.length === 0) return null
            return (
              <div key={group} className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-text-muted">{ROUTINE_GROUP_LABELS[group]}</h3>
                {list.map((routine) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    onDone={() => handleDone(routine)}
                    onEdit={() => openEdit(routine)}
                    onDelete={() => handleDelete(routine.id)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      <RoutineModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={async () => {
          setModalOpen(false)
          await reload()
        }}
      />

      <TemplatePickerModal
        open={seedOpen}
        existingNames={new Set((routines ?? []).map((r) => r.name))}
        onClose={() => setSeedOpen(false)}
        onPick={handleAddFromTemplate}
      />
    </section>
  )
}

function RoutineCard({
  routine,
  onDone,
  onEdit,
  onDelete,
}: {
  routine: LifeRoutine
  onDone: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const until = daysUntilDue(routine.nextDueAt)
  const dueLabel =
    until < 0 ? `${Math.abs(until)}일 지남` : until === 0 ? '오늘' : `${until}일 후`
  const dueClass =
    until < 0 ? 'text-danger' : until <= 7 ? 'text-warning' : 'text-text-secondary'

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{routine.name}</p>
          <p className="mt-1 text-xs text-text-muted">
            주기: {formatIntervalLabel(routine.intervalDays)}
            {routine.lastDoneAt
              ? ` · 마지막: ${formatDate(routine.lastDoneAt, 'yyyy.MM.dd')}`
              : ' · 마지막: —'}
            {' · '}
            <span className={dueClass}>
              다음: {formatDate(routine.nextDueAt, 'yyyy.MM.dd')} ({dueLabel})
            </span>
          </p>
          {routine.notes && <p className="mt-1 text-xs text-text-muted">{routine.notes}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg bg-accent/20 p-2 text-accent"
            aria-label="완료"
            title="완료"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
            aria-label="편집"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 text-text-muted hover:bg-danger/10 hover:text-danger"
            aria-label="삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Card>
  )
}

function RoutineModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: LifeRoutine | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState<LifeRoutineGroup>('chores')
  const [intervalDays, setIntervalDays] = useState(30)
  const [customDays, setCustomDays] = useState('')
  const [lastDoneAt, setLastDoneAt] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const isPreset = INTERVAL_PRESETS.some((p) => p.days === intervalDays)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setGroup(editing.group)
      setIntervalDays(editing.intervalDays)
      setCustomDays(
        INTERVAL_PRESETS.some((p) => p.days === editing.intervalDays)
          ? ''
          : String(editing.intervalDays),
      )
      setLastDoneAt(editing.lastDoneAt ?? todayISO())
      setNotes(editing.notes ?? '')
    } else {
      setName('')
      setGroup('chores')
      setIntervalDays(30)
      setCustomDays('')
      setLastDoneAt(todayISO())
      setNotes('')
    }
    setError('')
  }, [open, editing])

  const resolvedDays = customDays.trim()
    ? Math.max(1, parseInt(customDays, 10) || 1)
    : Math.max(1, intervalDays)

  const handleSave = async () => {
    if (!name.trim()) {
      setError('이름을 입력하세요.')
      return
    }
    const days = resolvedDays
    const record: UserOwnedInput<LifeRoutine> = {
      id: editing?.id ?? generateId(),
      name: name.trim(),
      group,
      intervalDays: days,
      suggestedIntervalDays: editing?.suggestedIntervalDays,
      lastDoneAt: lastDoneAt || undefined,
      nextDueAt: calculateNextDueAt(lastDoneAt || undefined, days),
      notes: notes.trim() || undefined,
    }
    await saveLifeRoutine(record)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? '반복 항목 편집' : '반복 항목 추가'}>
      <div className="flex flex-col gap-4">
        <FormField label="이름">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 수건 교체"
          />
        </FormField>

        <FormField label="그룹">
          <select
            className={selectClass}
            value={group}
            onChange={(e) => setGroup(e.target.value as LifeRoutineGroup)}
          >
            {GROUP_ORDER.map((g) => (
              <option key={g} value={g}>
                {ROUTINE_GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="주기">
          <div className="flex flex-wrap gap-2">
            {INTERVAL_PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => {
                  setIntervalDays(p.days)
                  setCustomDays('')
                }}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  !customDays && intervalDays === p.days
                    ? 'bg-accent text-surface'
                    : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            className={`${inputClass} mt-2`}
            type="number"
            min={1}
            placeholder={isPreset && !customDays ? '또는 일 수 직접 입력' : '일 수'}
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
          />
          <p className="mt-1 text-xs text-text-muted">선택: {formatIntervalLabel(resolvedDays)}</p>
        </FormField>

        <FormField label="마지막 실행일">
          <input
            type="date"
            className={inputClass}
            value={lastDoneAt}
            onChange={(e) => setLastDoneAt(e.target.value)}
          />
        </FormField>

        <FormField label="메모 (선택)">
          <input
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="참고 사항"
          />
        </FormField>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="button" className={btnPrimary} onClick={handleSave}>
          저장
        </button>
      </div>
    </Modal>
  )
}

function TemplatePickerModal({
  open,
  existingNames,
  onClose,
  onPick,
}: {
  open: boolean
  existingNames: Set<string>
  onClose: () => void
  onPick: (t: RoutineTemplate) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="권장 주기 템플릿">
      <div className="flex flex-col gap-2">
        <p className="mb-1 text-xs text-text-muted">추가 후 주기·이름을 자유롭게 수정할 수 있습니다.</p>
        {ROUTINE_TEMPLATES.map((t) => {
          const added = existingNames.has(t.name)
          return (
            <button
              key={`${t.group}-${t.name}`}
              type="button"
              disabled={added}
              onClick={() => onPick(t)}
              className={`flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left text-sm transition-colors ${
                added
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:border-accent/50 hover:bg-surface-overlay'
              }`}
            >
              <span>
                <span className="font-medium">{t.name}</span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  {ROUTINE_GROUP_LABELS[t.group]} · 권장 {formatIntervalLabel(t.suggestedIntervalDays)}
                </span>
              </span>
              <span className="text-xs text-accent">{added ? '추가됨' : '추가'}</span>
            </button>
          )
        })}
        <button type="button" className={`${btnSecondary} mt-2`} onClick={onClose}>
          닫기
        </button>
      </div>
    </Modal>
  )
}
