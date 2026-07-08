import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import Modal, { btnPrimary, btnSecondary, inputInlineClass } from '../common/Modal'
import {
  DEFAULT_CATEGORY_BUDGET,
  getCategoryBudgetTotal,
  getPreviousMonth,
  getPreviousMonthBudgetSettings,
  hasConfiguredCategoryBudget,
  mergeProvidedCategories,
  resolveEnabledCategoryIds,
} from '../../budget/monthSettings'
import { formatMonth } from '../../utils/format'
import { generateId } from '../../db'
import type { BudgetSettings, CategoryBudgetItem } from '../../types'

type CategoryDraft = {
  categoryId: string
  totalBudget: string
}

type CategoryEditModalProps = {
  open: boolean
  onClose: () => void
  settings: BudgetSettings
  month: string
  focusCategoryId?: string | null
  onSave: (budgetItems: CategoryBudgetItem[], enabledCategoryIds: string[]) => Promise<void>
}

function buildDraftForCategory(categoryId: string, items: CategoryBudgetItem[]): CategoryDraft {
  return {
    categoryId,
    totalBudget: String(getCategoryBudgetTotal(items, categoryId)),
  }
}

function buildInitialState(settings: BudgetSettings, providedCategories: ReturnType<typeof mergeProvidedCategories>) {
  const enabledIds = resolveEnabledCategoryIds(settings, providedCategories)
  const items = settings.budgetItems ?? []
  const drafts = enabledIds.map((id) => buildDraftForCategory(id, items))
  return { enabledIds, drafts }
}

export default function CategoryEditModal({
  open,
  onClose,
  settings,
  month,
  focusCategoryId,
  onSave,
}: CategoryEditModalProps) {
  const providedCategories = mergeProvidedCategories(settings.categories)

  const [enabledIds, setEnabledIds] = useState<string[]>(() => buildInitialState(settings, providedCategories).enabledIds)
  const [drafts, setDrafts] = useState<CategoryDraft[]>(() => buildInitialState(settings, providedCategories).drafts)
  const [error, setError] = useState('')
  const [copying, setCopying] = useState(false)
  const focusRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      const initial = buildInitialState(settings, providedCategories)
      setEnabledIds(initial.enabledIds)
      setDrafts(initial.drafts)
      setError('')
    }
  }, [open, settings])

  const catName = (id: string) => providedCategories.find((c) => c.id === id)?.name ?? ''
  const enabledSet = new Set(enabledIds)
  const orderedDrafts = providedCategories
    .filter((c) => enabledSet.has(c.id))
    .map((c) => drafts.find((d) => d.categoryId === c.id))
    .filter((d): d is CategoryDraft => !!d)

  useEffect(() => {
    if (open && focusCategoryId) {
      focusRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [open, focusCategoryId, orderedDrafts.length])

  const toggleCategory = (categoryId: string) => {
    setError('')
    if (enabledSet.has(categoryId)) {
      if (enabledIds.length <= 1) {
        setError('최소 1개 카테고리는 유지해야 합니다.')
        return
      }
      setEnabledIds((prev) => prev.filter((id) => id !== categoryId))
      setDrafts((prev) => prev.filter((d) => d.categoryId !== categoryId))
    } else {
      setEnabledIds((prev) => [...prev, categoryId])
      setDrafts((prev) => [...prev, { categoryId, totalBudget: String(DEFAULT_CATEGORY_BUDGET) }])
    }
  }

  const updateTotalBudget = (categoryId: string, totalBudget: string) => {
    setDrafts((prev) => prev.map((d) => (d.categoryId === categoryId ? { ...d, totalBudget } : d)))
  }

  const handleCopyFromPrevious = async () => {
    setError('')
    setCopying(true)
    try {
      const prevMonth = getPreviousMonth(month)
      const prev = await getPreviousMonthBudgetSettings(month)
      if (!prev || !hasConfiguredCategoryBudget(prev)) {
        setError(`${formatMonth(prevMonth)} 예산 데이터가 없어요.`)
        return
      }
      const enabled = resolveEnabledCategoryIds(prev, providedCategories)
      const items = prev.budgetItems ?? []
      setEnabledIds(enabled)
      setDrafts(enabled.map((id) => buildDraftForCategory(id, items)))
    } finally {
      setCopying(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const budgetItems: CategoryBudgetItem[] = []

    for (const draft of orderedDrafts) {
      const trimmed = draft.totalBudget.trim()
      const total = trimmed === '' ? 0 : parseInt(trimmed, 10)
      if (Number.isNaN(total) || total < 0) {
        setError(`${catName(draft.categoryId)} 카테고리의 예산을 확인해주세요.`)
        return
      }

      const existingTotal = settings.budgetItems?.find(
        (item) => item.categoryId === draft.categoryId && item.isCategoryTotal,
      )
      budgetItems.push({
        id: existingTotal?.id ?? generateId(),
        categoryId: draft.categoryId,
        amount: total,
        isCategoryTotal: true,
      })
    }

    await onSave(budgetItems, enabledIds)
  }

  return (
    <Modal open={open} onClose={onClose} title="카테고리·예산 편집">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {providedCategories.map((cat) => {
            const active = enabledSet.has(cat.id)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-accent text-surface'
                    : 'border border-border text-text-muted hover:border-accent/50 hover:text-text-secondary'
                }`}
              >
                {cat.name}
                {active && <X size={12} />}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className={btnSecondary}
          disabled={copying}
          onClick={handleCopyFromPrevious}
        >
          {copying ? '불러오는 중…' : '지난 달 예산 가져오기'}
        </button>

        <div className="flex max-h-[50dvh] flex-col gap-3 overflow-y-auto">
          {orderedDrafts.map((draft) => {
            const isFocused = draft.categoryId === focusCategoryId
            return (
              <div
                key={draft.categoryId}
                ref={isFocused ? focusRowRef : undefined}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  isFocused ? 'border-accent ring-1 ring-accent/30' : 'border-border'
                }`}
              >
                <span className="min-w-0 flex-1 text-sm font-medium">{catName(draft.categoryId)}</span>
                <input
                  type="number"
                  className={`${inputInlineClass} w-32 shrink-0 tabular-nums text-sm`}
                  value={draft.totalBudget}
                  onChange={(e) => updateTotalBudget(draft.categoryId, e.target.value)}
                  placeholder="총 예산"
                  min={0}
                  autoFocus={isFocused}
                />
              </div>
            )
          })}
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}
