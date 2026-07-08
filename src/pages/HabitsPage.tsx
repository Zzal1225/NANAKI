import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card } from '../components/common/Card'
import Modal, { FormField, inputClass, selectClass, btnPrimary } from '../components/common/Modal'
import { useAsync } from '../hooks/useAsync'
import {
  generateId,
  getAllHabits,
  saveHabit,
  deleteHabit,
  getHabitLogsByDate,
  toggleHabitLog,
} from '../db'
import { formatDate, todayISO, HABIT_EMOJIS, HABIT_COLORS } from '../utils/dates'
import type { Habit, HabitType, UserOwnedInput } from '../types'
import PageHeader from '../components/layout/PageHeader'
import { useSections } from '../context/SectionContext'

export default function HabitsPage() {
  const { isSectionEnabled } = useSections()
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [showModal, setShowModal] = useState(false)

  const { data: habits, reload: reloadHabits } = useAsync(() => getAllHabits(), [])
  const { data: logs, reload: reloadLogs } = useAsync(
    () => getHabitLogsByDate(selectedDate),
    [selectedDate],
  )

  const reload = () => {
    reloadHabits()
    reloadLogs()
  }

  const goodHabits = habits?.filter((h) => h.type === 'good') ?? []
  const badHabits = habits?.filter((h) => h.type === 'bad') ?? []

  const isCompleted = (habitId: string) =>
    logs?.some((l) => l.habitId === habitId && l.completed) ?? false

  const handleToggle = async (habitId: string) => {
    await toggleHabitLog(habitId, selectedDate)
    reloadLogs()
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="습관"
        tab="habits"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-accent p-2.5 text-surface"
          >
            <Plus size={18} />
          </button>
        }
      />

      {isSectionEnabled('habits-checklist') && (
      <>

      <FormField label="날짜">
        <input
          type="date"
          className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm outline-none focus:border-accent"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </FormField>

      <p className="text-sm text-text-secondary">{formatDate(selectedDate)} 습관 체크</p>

      {goodHabits.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-habit-good">좋은 습관</h2>
          <div className="flex flex-col gap-2">
            {goodHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completed={isCompleted(habit.id)}
                onToggle={() => handleToggle(habit.id)}
                onDelete={async () => { await deleteHabit(habit.id); reload() }}
              />
            ))}
          </div>
        </section>
      )}

      {badHabits.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-habit-bad">나쁜 습관</h2>
          <div className="flex flex-col gap-2">
            {badHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completed={isCompleted(habit.id)}
                onToggle={() => handleToggle(habit.id)}
                onDelete={async () => { await deleteHabit(habit.id); reload() }}
                isBad
              />
            ))}
          </div>
        </section>
      )}

      {!habits?.length && (
        <Card>
          <p className="text-sm text-text-muted">습관을 추가하고 매일 체크해보세요.</p>
        </Card>
      )}
      </>
      )}

      <HabitModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={async (habit) => {
          await saveHabit(habit)
          reload()
          setShowModal(false)
        }}
      />
    </div>
  )
}

function HabitCard({
  habit,
  completed,
  onToggle,
  onDelete,
  isBad = false,
}: {
  habit: Habit
  completed: boolean
  onToggle: () => void
  onDelete: () => void
  isBad?: boolean
}) {
  return (
    <Card
      className={`flex items-center justify-between transition-all ${
        completed
          ? isBad
            ? 'border-habit-bad/50 bg-habit-bad/10'
            : 'border-habit-good/50 bg-habit-good/10'
          : ''
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{habit.emoji}</span>
        <span className={`text-sm font-medium ${completed ? 'line-through opacity-70' : ''}`}>
          {habit.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
            completed
              ? isBad
                ? 'border-habit-bad bg-habit-bad text-white'
                : 'border-habit-good bg-habit-good text-white'
              : 'border-border'
          }`}
        >
          {completed && '✓'}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-text-muted hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Card>
  )
}

function HabitModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (h: UserOwnedInput<Habit>) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<HabitType>('good')
  const [emoji, setEmoji] = useState(HABIT_EMOJIS[0])
  const [color, setColor] = useState(HABIT_COLORS[0])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSave({
      id: generateId(),
      name: name.trim(),
      type,
      emoji,
      color,
      createdAt: new Date().toISOString(),
    })
    setName('')
  }

  return (
    <Modal open={open} onClose={onClose} title="습관 추가">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="이름">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 아침 스트레칭" required />
        </FormField>
        <FormField label="유형">
          <select className={selectClass} value={type} onChange={(e) => setType(e.target.value as HabitType)}>
            <option value="good">좋은 습관</option>
            <option value="bad">나쁜 습관</option>
          </select>
        </FormField>
        <FormField label="스티커">
          <div className="flex flex-wrap gap-2">
            {HABIT_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`rounded-lg p-2 text-xl ${emoji === e ? 'bg-accent/30 ring-2 ring-accent' : 'hover:bg-surface-overlay'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="색상">
          <div className="flex gap-2">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </FormField>
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}

