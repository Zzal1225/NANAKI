import { useState, useEffect, useRef, useId, useMemo } from 'react'
import { Plus, Settings, Trash2, X, ChevronRight } from 'lucide-react'
import { Card, StatCard } from '../components/common/Card'
import Modal, { inputClass, inputInlineClass, selectClass, selectInlineClass, btnPrimary, btnSecondary } from '../components/common/Modal'
import { useAsync } from '../hooks/useAsync'
import {
  generateId,
  getExpensesByMonth,
  getAllExpenses,
  saveExpense,
  deleteExpense,
  migrateLegacyExpenses,
} from '../db'
import { findRecurringVersionForMonth, isRecurringCheckboxChecked, saveFixedExpense } from '../budget/recurringFixed'
import { getBudgetDataStartMonth } from '../budget/budgetRange'
import {
  currentMonth,
  formatCurrency,
  formatDate,
  formatMonth,
  maxBudgetMonth,
  todayISO,
  formatFixedDay,
  fixedDayToDate,
} from '../utils/dates'
import type { BudgetCategory, BudgetSettings, CategoryBudgetItem, Expense, ExpenseType, UserOwnedInput } from '../types'
import PageHeader from '../components/layout/PageHeader'
import { useSections } from '../context/SectionContext'
import BudgetOverview, { BudgetBar, type CategorySpendSlice } from '../components/budget/BudgetOverview'
import { computeBudgetOverviewStats } from '../budget/budgetOverviewStats'
import SubItemTagInput from '../components/budget/SubItemTagInput'
import { collectSubItemTags } from '../budget/subItemTags'
import {
  ensureBudgetSettingsForMonth,
  mergeProvidedCategories,
  saveMonthCategoryBudget,
  getCategoryBudgetTotal,
  getEnabledCategories,
  isCategoryBudgetUnset,
  formatBudgetLabel,
  resolveEnabledCategoryIds,
  DEFAULT_CATEGORY_BUDGET,
  getPreviousMonthBudgetSettings,
  getPreviousMonth,
  copyBudgetFromPreviousMonth,
  hasConfiguredCategoryBudget,
} from '../budget/monthSettings'
import {
  filterCategoryExpenses,
  findOrphanExpenses,
  expenseDisplayLabel,
  summarizeSubItemSpending,
} from '../budget/categoryMatch'
import { type ExpenseSortMode, sortExpenses } from '../budget/spendingStats'

async function loadBudgetData(month: string) {
  const settings = await ensureBudgetSettingsForMonth(month)
  await migrateLegacyExpenses(settings.categories)
  const expenses = await getExpensesByMonth(month)
  const allExpenses = await getAllExpenses()
  const startMonth = await getBudgetDataStartMonth()
  return { settings, expenses, allExpenses, startMonth }
}

type SummaryView = 'total' | 'variable' | 'fixed' | 'orphan'

const budgetSuggestDismissKey = (month: string) => `nanaki-budget-suggest-dismiss-${month}`

type PendingFixedSave = {
  expense: UserOwnedInput<Expense>
  options: { viewMonth: string; previous?: Expense | null; isRecurringMonthly: boolean }
}

export default function BudgetPage() {
  const { isSectionEnabled } = useSections()
  const [month, setMonth] = useState(currentMonth())
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editExpense, setEditExpense] = useState<UserOwnedInput<Expense> | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categoryFocusId, setCategoryFocusId] = useState<string | null>(null)
  const [showBudgetPrompt, setShowBudgetPrompt] = useState(false)
  const [budgetPromptCategory, setBudgetPromptCategory] = useState<BudgetCategory | null>(null)
  const [pendingFixedSave, setPendingFixedSave] = useState<PendingFixedSave | null>(null)
  const [summaryView, setSummaryView] = useState<SummaryView | null>(null)
  const [expenseListCategory, setExpenseListCategory] = useState<BudgetCategory | null>(null)
  const [budgetSuggestDismissed, setBudgetSuggestDismissed] = useState(
    () => localStorage.getItem(budgetSuggestDismissKey(currentMonth())) === '1',
  )
  const [applyingBudget, setApplyingBudget] = useState(false)

  const { data, reload } = useAsync(() => loadBudgetData(month), [month])
  const { data: prevMonthSettings } = useAsync(() => getPreviousMonthBudgetSettings(month), [month])

  useEffect(() => {
    setExpenseListCategory(null)
    setBudgetSuggestDismissed(localStorage.getItem(budgetSuggestDismissKey(month)) === '1')
  }, [month])

  const openExpenseModal = (expense?: Expense) => {
    if (expense?.type === 'fixed' && (expense.isRecurringMonthly ?? !!expense.recurringTemplateId)) {
      const version = findRecurringVersionForMonth(data?.allExpenses ?? [], expense, month)
      setEditExpense(version)
    } else {
      setEditExpense(expense ?? null)
    }
    setShowExpenseModal(true)
  }

  const closeExpenseModal = () => {
    setShowExpenseModal(false)
    setEditExpense(null)
  }

  const saveExpenseRecord = async (
    expense: UserOwnedInput<Expense>,
    options?: { viewMonth: string; previous?: Expense | null; isRecurringMonthly: boolean },
  ) => {
    if (expense.type === 'fixed' && options) {
      await saveFixedExpense(expense, options)
    } else {
      await saveExpense(expense)
    }
    reload()
    closeExpenseModal()
  }

  if (!data) {
    return <div className="text-text-muted">불러오는 중...</div>
  }

  const { settings, expenses, allExpenses, startMonth } = data
  const fixedExpenses = expenses.filter((e) => e.type === 'fixed')
  const variableExpenses = expenses.filter((e) => e.type === 'variable')
  const variableSpent = variableExpenses.reduce((s, e) => s + e.amount, 0)
  const fixedSpent = expenses.filter((e) => e.type === 'fixed').reduce((s, e) => s + e.amount, 0)
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const orphanExpenses = findOrphanExpenses(expenses, settings.categories)
  const budgetCategories = getEnabledCategories(settings.categories, settings)
  const {
    chartBudget,
    chartSpent,
    chartCategorySpends,
    legendCategories,
    hasUnsetBudgetCategories,
  } = computeBudgetOverviewStats(settings, expenses)

  const totalBudget = chartBudget
  const fixedBudgetFromItems = (settings.budgetItems ?? [])
    .filter((i) => !i.isCategoryTotal && i.isFixed && i.amount > 0)
    .reduce((sum, i) => sum + i.amount, 0)
  const fixedBudget = fixedBudgetFromItems > 0 ? fixedBudgetFromItems : fixedSpent
  const variableBudget = Math.max(0, totalBudget - fixedBudget)

  const emptySpendText = '지출 데이터 없음'
  const showTotalSpendEmpty = expenses.length === 0
  const showVariableSpendEmpty = variableExpenses.length === 0
  const showTotalBudgetEmpty = totalBudget === 0

  const prevMonth = getPreviousMonth(month)
  const prevHasBudget = prevMonthSettings ? hasConfiguredCategoryBudget(prevMonthSettings) : false
  const showBudgetSuggest = totalBudget === 0 && prevHasBudget && !budgetSuggestDismissed

  const dismissBudgetSuggest = () => {
    localStorage.setItem(budgetSuggestDismissKey(month), '1')
    setBudgetSuggestDismissed(true)
  }

  const applyPreviousMonthBudget = async () => {
    setApplyingBudget(true)
    try {
      const ok = await copyBudgetFromPreviousMonth(month)
      if (ok) reload()
    } finally {
      setApplyingBudget(false)
    }
  }

  const deleteExpenseInViewMonth = async (expense: Expense) => {
    await deleteExpense(expense.id, month)
    reload()
  }

  const categoryModalExpenses = expenseListCategory
    ? filterCategoryExpenses(expenses, expenseListCategory)
    : []
  const categoryModalBudget = expenseListCategory
    ? getCategoryBudgetTotal(settings.budgetItems, expenseListCategory.id)
    : 0
  const categoryModalSpent = categoryModalExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const categoryModalSlices: CategorySpendSlice[] = expenseListCategory
    ? summarizeSubItemSpending(expenses, expenseListCategory).map(({ subItem, spent }) => ({
        name: subItem,
        spent,
      }))
    : []

  const canGoNext = month < maxBudgetMonth()
  const canGoPrev = month > startMonth

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (delta > 0 && next > maxBudgetMonth()) return
    if (delta < 0 && next < startMonth) return
    setMonth(next)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="가계부"
        tab="budget"
        searchTo={`/budget/search?month=${month}`}
        actions={
          <button
            onClick={() => openExpenseModal()}
            className="rounded-xl bg-accent p-2.5 text-surface"
          >
            <Plus size={18} />
          </button>
        }
      >
        <div className="mt-1 flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            disabled={!canGoPrev}
            className={`${canGoPrev ? 'text-text-muted hover:text-text-primary' : 'cursor-not-allowed text-text-muted/30'}`}
          >
            ◀
          </button>
          <span className="text-sm text-text-secondary">{formatMonth(month)}</span>
          <button
            onClick={() => changeMonth(1)}
            disabled={!canGoNext}
            className={`${canGoNext ? 'text-text-muted hover:text-text-primary' : 'cursor-not-allowed text-text-muted/30'}`}
          >
            ▶
          </button>
        </div>
      </PageHeader>

      {showBudgetSuggest && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-4">
          <p className="text-sm leading-relaxed text-text-primary">
            {formatMonth(prevMonth)} 예산을 그대로 가져올까요?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={applyingBudget}
              onClick={applyPreviousMonthBudget}
              className={`${btnPrimary} flex-1 py-2.5 text-sm`}
            >
              {applyingBudget ? '가져오는 중…' : '가져오기'}
            </button>
            <button
              type="button"
              disabled={applyingBudget}
              onClick={dismissBudgetSuggest}
              className={`${btnSecondary} flex-1 py-2.5 text-sm`}
            >
              나중에
            </button>
          </div>
        </div>
      )}

      {isSectionEnabled('budget-summary') && (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label="총 지출"
            value={formatCurrency(totalSpent)}
            emptyText={showTotalSpendEmpty ? emptySpendText : undefined}
            color="text-danger"
            onClick={() => setSummaryView('total')}
          />
          <StatCard
            label="변동 지출"
            value={formatCurrency(variableSpent)}
            emptyText={showVariableSpendEmpty ? emptySpendText : undefined}
            color="text-success"
            onClick={() => setSummaryView('variable')}
          />
          <StatCard
            label="고정 지출"
            value={formatCurrency(fixedSpent)}
            emptyText={fixedExpenses.length === 0 ? emptySpendText : undefined}
            color="text-budget"
            onClick={() => setSummaryView('fixed')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="변동 지출 예산"
            value={formatCurrency(variableBudget)}
            emptyText={showTotalBudgetEmpty ? '예산 미설정' : undefined}
            color="text-success"
          />
          <StatCard
            label="고정 지출 예산"
            value={formatCurrency(fixedBudget)}
            emptyText={showTotalBudgetEmpty ? '예산 미설정' : undefined}
            color="text-budget"
          />
        </div>
      </div>
      )}

      {isSectionEnabled('budget-categories') && (
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-secondary">카테고리별 예산</h2>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
            title="카테고리 편집"
          >
            <Settings size={16} />
          </button>
        </div>
        <Card className="mb-3">
          <BudgetOverview
            budget={chartBudget}
            spent={chartSpent}
            categorySpends={chartCategorySpends}
            legendCategories={legendCategories}
            hasUnsetBudgetCategories={hasUnsetBudgetCategories}
            onOpenBudgetSettings={() => setShowCategoryModal(true)}
          />
        </Card>
        <div className="flex flex-col gap-2">
          {budgetCategories.map((cat) => {
            const catExpenses = filterCategoryExpenses(expenses, cat)
            const catSpent = catExpenses.reduce((s, e) => s + e.amount, 0)
            const budgetTotal = getCategoryBudgetTotal(settings.budgetItems, cat.id)

            return (
              <Card key={cat.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => setExpenseListCategory(cat)}
                    className="flex shrink-0 items-center text-sm font-semibold tabular-nums hover:opacity-80"
                  >
                    <span className={budgetTotal > 0 ? '' : 'text-sm font-medium text-text-muted'}>
                      {formatBudgetLabel(budgetTotal)}
                    </span>
                    <ChevronRight size={16} className="text-text-muted" />
                  </button>
                </div>
                <BudgetBar budget={budgetTotal} spent={catSpent} compact />
              </Card>
            )
          })}
          {orphanExpenses.length > 0 && (
            <Card className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-text-secondary">미분류 지출</span>
                <button
                  type="button"
                  onClick={() => setSummaryView('orphan')}
                  className="flex shrink-0 items-center text-sm hover:opacity-80"
                >
                  <span>{formatCurrency(orphanExpenses.reduce((s, e) => s + e.amount, 0))}</span>
                  <ChevronRight size={16} className="text-text-muted" />
                </button>
              </div>
              <p className="px-1 text-xs text-text-muted">카테고리가 변경되어 연결이 끊긴 지출</p>
            </Card>
          )}
        </div>
      </section>
      )}

      <ExpenseModal
        open={showExpenseModal}
        onClose={closeExpenseModal}
        categories={budgetCategories}
        expense={editExpense}
        viewMonth={month}
        allExpenses={allExpenses}
        onSave={async (expense, options) => {
          if (
            expense.type === 'fixed' &&
            !editExpense &&
            isCategoryBudgetUnset(settings.budgetItems, expense.categoryId)
          ) {
            setPendingFixedSave({ expense, options: options! })
            setBudgetPromptCategory(
              budgetCategories.find((c) => c.id === expense.categoryId) ?? null,
            )
            setShowBudgetPrompt(true)
            closeExpenseModal()
            return
          }
          await saveExpenseRecord(expense, options)
        }}
      />

      <BudgetUnsetPromptModal
        open={showBudgetPrompt}
        categoryName={budgetPromptCategory?.name ?? ''}
        onLater={async () => {
          if (!pendingFixedSave) return
          await saveExpenseRecord(pendingFixedSave.expense, pendingFixedSave.options)
          setPendingFixedSave(null)
          setBudgetPromptCategory(null)
          setShowBudgetPrompt(false)
        }}
        onSetBudget={() => {
          setShowBudgetPrompt(false)
          setCategoryFocusId(pendingFixedSave?.expense.categoryId ?? budgetPromptCategory?.id ?? null)
          setShowCategoryModal(true)
        }}
      />

      <ExpenseListModal
        open={!!expenseListCategory}
        onClose={() => setExpenseListCategory(null)}
        title={expenseListCategory?.name ?? ''}
        expenses={categoryModalExpenses}
        overview={
          expenseListCategory
            ? {
                budget: categoryModalBudget,
                spent: categoryModalSpent,
                slices: categoryModalSlices,
                legendCategories: categoryModalSlices.map((slice) => slice.name),
                colorMode: 'palette',
              }
            : undefined
        }
        onDelete={deleteExpenseInViewMonth}
        onEdit={(expense) => {
          setExpenseListCategory(null)
          openExpenseModal(expense)
        }}
      />

      <ExpenseListModal
        open={summaryView === 'total'}
        onClose={() => setSummaryView(null)}
        title="총 지출"
        expenses={expenses}
        showCategory
        onDelete={deleteExpenseInViewMonth}
        onEdit={(expense) => {
          setSummaryView(null)
          openExpenseModal(expense)
        }}
      />

      <ExpenseListModal
        open={summaryView === 'variable'}
        onClose={() => setSummaryView(null)}
        title="변동 지출"
        expenses={variableExpenses}
        showCategory
        onDelete={deleteExpenseInViewMonth}
        onEdit={(expense) => {
          setSummaryView(null)
          openExpenseModal(expense)
        }}
      />

      <ExpenseListModal
        open={summaryView === 'fixed'}
        onClose={() => setSummaryView(null)}
        title="고정 지출"
        expenses={expenses.filter((e) => e.type === 'fixed')}
        showCategory
        onDelete={deleteExpenseInViewMonth}
        onEdit={(expense) => {
          setSummaryView(null)
          openExpenseModal(expense)
        }}
      />

      <ExpenseListModal
        open={summaryView === 'orphan'}
        onClose={() => setSummaryView(null)}
        title="미분류 지출"
        expenses={orphanExpenses}
        showCategory
        onDelete={deleteExpenseInViewMonth}
        onEdit={(expense) => {
          setSummaryView(null)
          openExpenseModal(expense)
        }}
      />

      <CategoryEditModal
        open={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false)
          if (pendingFixedSave) {
            setEditExpense(pendingFixedSave.expense)
            setShowExpenseModal(true)
          }
          setCategoryFocusId(null)
        }}
        settings={settings}
        month={month}
        focusCategoryId={categoryFocusId}
        onSave={async (budgetItems, enabledCategoryIds) => {
          await saveMonthCategoryBudget(month, budgetItems, enabledCategoryIds)
          if (pendingFixedSave) {
            await saveFixedExpense(pendingFixedSave.expense, pendingFixedSave.options)
            setPendingFixedSave(null)
            closeExpenseModal()
          }
          reload()
          setShowCategoryModal(false)
          setCategoryFocusId(null)
        }}
      />
    </div>
  )
}

function ExpenseListModal({
  open,
  onClose,
  title,
  expenses,
  showCategory = false,
  overview,
  onDelete,
  onEdit,
}: {
  open: boolean
  onClose: () => void
  title: string
  expenses: Expense[]
  showCategory?: boolean
  overview?: {
    budget: number
    spent: number
    slices: CategorySpendSlice[]
    legendCategories: string[]
    colorMode?: 'category' | 'palette'
  }
  onDelete: (expense: Expense) => Promise<void>
  onEdit: (expense: Expense) => void
}) {
  const [sortMode, setSortMode] = useState<ExpenseSortMode>('latest')

  useEffect(() => {
    if (open) setSortMode('latest')
  }, [open, title])

  const sorted = sortExpenses(expenses, sortMode)
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        {overview && (
          <Card className="overflow-visible">
            <BudgetOverview
              budget={overview.budget}
              spent={overview.spent}
              categorySpends={overview.slices}
              legendCategories={overview.legendCategories}
              colorMode={overview.colorMode ?? 'palette'}
            />
          </Card>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-accent">{formatCurrency(total)}</p>
          <select
            className={`${selectInlineClass} text-xs`}
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as ExpenseSortMode)}
          >
            <option value="latest">최신순</option>
            <option value="amount">금액순</option>
            <option value="frequency">빈도순</option>
          </select>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-text-muted">지출 기록이 없습니다.</p>
        ) : (
          <div className="flex max-h-[50dvh] flex-col gap-2 overflow-y-auto">
            {sorted.map((e) => {
              const isFixed = e.type === 'fixed'

              return (
                <div
                  key={e.id}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-3 py-2.5 hover:bg-surface-overlay"
                  onClick={() => onEdit(e)}
                  role="button"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{expenseDisplayLabel(e)}</p>
                      <span className="shrink-0 text-sm text-text-secondary">{formatCurrency(e.amount)}</span>
                      {isFixed && (
                        <span className="rounded-full bg-budget/20 px-1.5 py-0.5 text-[10px] text-budget">
                          고정
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-text-muted">
                      {[
                        showCategory && expenseDisplayLabel(e) !== e.categoryName ? e.categoryName : null,
                        isFixed ? (e.fixedDay ? formatFixedDay(e.fixedDay) : null) : e.date,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onDelete(e)
                    }}
                    className="shrink-0 text-text-muted hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

function ExpenseModal({
  open,
  onClose,
  categories,
  expense,
  viewMonth,
  allExpenses,
  onSave,
}: {
  open: boolean
  onClose: () => void
  categories: BudgetCategory[]
  expense?: UserOwnedInput<Expense> | null
  viewMonth: string
  allExpenses: Expense[]
  onSave: (
    e: UserOwnedInput<Expense>,
    options?: { viewMonth: string; previous?: Expense | null; isRecurringMonthly: boolean },
  ) => Promise<void>
}) {
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
            <SubItemTagInput
              value={subItem}
              onChange={setSubItem}
              tags={subItemTags}
            />
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

function BudgetUnsetPromptModal({
  open,
  categoryName,
  onLater,
  onSetBudget,
}: {
  open: boolean
  categoryName: string
  onLater: () => void | Promise<void>
  onSetBudget: () => void
}) {
  return (
    <Modal open={open} onClose={onLater} title="예산 미설정">
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-text-secondary">
          <span className="font-semibold text-text-primary">{categoryName}</span> 카테고리의 예산이 아직
          설정되지 않았습니다. 지금 예산을 설정하시겠습니까?
        </p>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={onLater}>
            나중에
          </button>
          <button type="button" className={btnPrimary} onClick={onSetBudget}>
            예산 설정
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CategoryEditModal({
  open,
  onClose,
  settings,
  month,
  focusCategoryId,
  onSave,
}: {
  open: boolean
  onClose: () => void
  settings: BudgetSettings
  month: string
  focusCategoryId?: string | null
  onSave: (budgetItems: CategoryBudgetItem[], enabledCategoryIds: string[]) => Promise<void>
}) {
  type CategoryDraft = {
    categoryId: string
    totalBudget: string
  }

  const providedCategories = mergeProvidedCategories(settings.categories)

  const buildDraftForCategory = (categoryId: string, items: CategoryBudgetItem[]): CategoryDraft => ({
    categoryId,
    totalBudget: String(getCategoryBudgetTotal(items, categoryId)),
  })

  const buildInitialState = (s: BudgetSettings) => {
    const enabledIds = resolveEnabledCategoryIds(s, providedCategories)
    const items = s.budgetItems ?? []
    const drafts = enabledIds.map((id) => buildDraftForCategory(id, items))
    return { enabledIds, drafts }
  }

  const [enabledIds, setEnabledIds] = useState<string[]>(() => buildInitialState(settings).enabledIds)
  const [drafts, setDrafts] = useState<CategoryDraft[]>(() => buildInitialState(settings).drafts)
  const [error, setError] = useState('')
  const [copying, setCopying] = useState(false)
  const focusRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      const initial = buildInitialState(settings)
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
      setDrafts((prev) => [
        ...prev,
        { categoryId, totalBudget: String(DEFAULT_CATEGORY_BUDGET) },
      ])
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
        (i) => i.categoryId === draft.categoryId && i.isCategoryTotal,
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
