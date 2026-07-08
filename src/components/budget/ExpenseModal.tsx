import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Modal, { btnPrimary, inputClass, selectClass } from '../common/Modal'
import SubItemTagInput from './SubItemTagInput'
import { isRecurringCheckboxChecked } from '../../budget/recurringFixed'
import { collectSubItemTags } from '../../budget/subItemTags'
import { formatDate, fixedDayToDate, todayISO } from '../../utils/format'
import { generateId } from '../../db'
import type { BudgetCategory, Expense, ExpenseType, UserOwnedInput } from '../../types'

type ExpenseModalProps = {
  open: boolean
  onClose: () => void
  categories: BudgetCategory[]
  expense?: UserOwnedInput<Expense> | null
  viewMonth: string
  allExpenses: Expense[]
  onSave: (
    expense: UserOwnedInput<Expense>,
    options?: { viewMonth: string; previous?: Expense | null; isRecurringMonthly: boolean },
  ) => Promise<void>
}

export default function ExpenseModal({
  open,
  onClose,
  categories,
  expense,
  viewMonth,
  allExpenses,
  onSave,
}: ExpenseModalProps) {
  const isEdit = !!expense
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [subItem, setSubItem] = useState('')
  const [type, setType] = useState<ExpenseType>('variable')
  const [fixedDay, setFixedDay] = useState('1')
  const [isRecurringMonthly, setIsRecurringMonthly] = useState(true)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const dateInputId = useId()

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const subItemTags = useMemo(
    () => collectSubItemTags(allExpenses, selectedCategory),
    [allExpenses, selectedCategory],
  )

  const openDatePicker = () => {
    const el = dateInputRef.current
    if (!el) return
    el.style.pointerEvents = 'auto'
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker()
        return
      }
    } catch {
      // showPicker rejected — fall through
    }
    el.focus()
    el.click()
  }

  useEffect(() => {
    if (!open) return
    if (expense) {
      setCategoryId(expense.categoryId)
      setAmount(String(expense.amount))
      setDate(expense.date)
      setSubItem(expense.subItem ?? '')
      setType(expense.type)
      setFixedDay(String(expense.fixedDay ?? (parseInt(expense.date.slice(8), 10) || 1)))
      setIsRecurringMonthly(isRecurringCheckboxChecked(expense, viewMonth, allExpenses))
    } else {
      setCategoryId(categories[0]?.id ?? '')
      setAmount('')
      setDate(todayISO())
      setSubItem('')
      setType('variable')
      setFixedDay('1')
      setIsRecurringMonthly(false)
    }
  }, [open, expense, categories, viewMonth, allExpenses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cat = categories.find((c) => c.id === categoryId)
    const parsedAmount = parseInt(amount, 10)
    if (!cat || !parsedAmount || parsedAmount <= 0) return

    const id = expense?.id ?? generateId()
    const trimmedSubItem = subItem.trim() || undefined

    if (type === 'fixed') {
      const day = Math.min(31, Math.max(1, parseInt(fixedDay, 10) || 1))
      await onSave(
        {
          id: expense?.id ?? generateId(),
          date: fixedDayToDate(viewMonth, day),
          amount: parsedAmount,
          categoryId: cat.id,
          categoryName: cat.name,
          type: 'fixed',
          subItem: trimmedSubItem,
          fixedDay: day,
          recurringTemplateId: expense?.recurringTemplateId,
        },
        { viewMonth, previous: expense as Expense | null | undefined, isRecurringMonthly },
      )
      return
    }

    await onSave({
      id,
      date,
      amount: parsedAmount,
      categoryId: cat.id,
      categoryName: cat.name,
      type: 'variable',
      subItem: trimmedSubItem,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? '지출 편집' : '지출 추가'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-sm text-text-secondary">지출 유형</span>
            <select className={selectClass} value={type} onChange={(e) => setType(e.target.value as ExpenseType)}>
              <option value="variable">변동지출</option>
              <option value="fixed">고정 지출</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-sm text-text-secondary">카테고리</span>
            <select className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-sm text-text-secondary">세부항목</span>
            <SubItemTagInput value={subItem} onChange={setSubItem} tags={subItemTags} />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-sm text-text-secondary">지출금액</span>
            <input
              type="number"
              className={`${inputClass} tabular-nums`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
            />
          </label>
        </div>
        {type === 'fixed' ? (
          <div className="flex items-end gap-3">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm text-text-secondary">고정 지출일</span>
              <input
                type="number"
                min={1}
                max={31}
                className={`${inputClass} tabular-nums`}
                value={fixedDay}
                onChange={(e) => setFixedDay(e.target.value)}
                required
              />
            </label>
            <label className="flex shrink-0 items-center gap-2 pb-2.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-accent"
                checked={isRecurringMonthly}
                onChange={(e) => setIsRecurringMonthly(e.target.checked)}
              />
              매 월 반복
            </label>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-text-secondary">실제 지출일</span>
            <div className="relative">
              <button
                type="button"
                onClick={openDatePicker}
                className={`${inputClass} w-full text-left tabular-nums`}
              >
                {formatDate(date)}
              </button>
              <input
                ref={dateInputRef}
                id={dateInputId}
                type="date"
                tabIndex={-1}
                aria-hidden
                className="input-date-overlay pointer-events-none absolute inset-0 h-full w-full opacity-0"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
        )}
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}
