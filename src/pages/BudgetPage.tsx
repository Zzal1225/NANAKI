import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { saveExpense, deleteExpense } from '../db'
import { findRecurringVersionForMonth, saveFixedExpense } from '../budget/recurringFixed'
import { currentMonth, todayISO } from '../utils/format'
import type { BudgetCategory, Expense, UserOwnedInput } from '../types'
import PageHeader from '../components/layout/PageHeader'
import { useSections } from '../context/SectionContext'
import { loadBudgetPageData } from '../budget/loadBudgetPageData'
import { computeBudgetPageStats, computeCategoryModalStats } from '../budget/budgetPageStats'
import {
  budgetSuggestDismissKey,
  type PendingFixedSave,
  type SummaryView,
} from '../budget/budgetPageTypes'
import MonthNav from '../components/layout/MonthNav'
import { useMonthScope } from '../hooks/useMonthScope'
import { getBudgetDataStartMonth } from '../utils/dataStartMonth'
import {
  saveMonthCategoryBudget,
  isCategoryBudgetUnset,
  getPreviousMonthBudgetSettings,
  getPreviousMonth,
  copyBudgetFromPreviousMonth,
  hasConfiguredCategoryBudget,
} from '../budget/monthSettings'
import { countMonthZeroSpendDays, sumThisWeekSpend } from '../budget/noSpend'
import { buildSummaryTrends } from '../budget/summaryTrends'
import { getExpensesByMonth } from '../db'
import ExpenseModal from '../components/budget/ExpenseModal'
import ExpenseListModal from '../components/budget/ExpenseListModal'
import BudgetUnsetPromptModal from '../components/budget/BudgetUnsetPromptModal'
import CategoryEditModal from '../components/budget/CategoryEditModal'
import BudgetSuggestBanner from '../components/budget/BudgetSuggestBanner'
import BudgetSummarySection from '../components/budget/BudgetSummarySection'
import BudgetCategorySection from '../components/budget/BudgetCategorySection'

export default function BudgetPage() {
  const { isSectionEnabled } = useSections()
  const [searchParams, setSearchParams] = useSearchParams()
  const { month, setMonth, minMonth, maxMonth } = useMonthScope({
    getStartMonth: getBudgetDataStartMonth,
  })
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

  const today = todayISO()

  const { data, reload } = useAsync(() => loadBudgetPageData(month), [month])
  const { data: prevMonthSettings } = useAsync(() => getPreviousMonthBudgetSettings(month), [month])
  const { data: prevMonthExpenses } = useAsync(
    () => getExpensesByMonth(getPreviousMonth(month)),
    [month],
  )

  useEffect(() => {
    setExpenseListCategory(null)
    setBudgetSuggestDismissed(localStorage.getItem(budgetSuggestDismissKey(month)) === '1')
  }, [month])

  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    setEditExpense(null)
    setShowExpenseModal(true)
    const next = new URLSearchParams(searchParams)
    next.delete('add')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

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

  const { settings, expenses, allExpenses } = data
  const stats = computeBudgetPageStats(settings, expenses)
  const categoryModal = computeCategoryModalStats(expenses, expenseListCategory, settings.budgetItems)

  const prevMonth = getPreviousMonth(month)
  const prevHasBudget = prevMonthSettings ? hasConfiguredCategoryBudget(prevMonthSettings) : false
  const showBudgetSuggest = stats.totalBudget === 0 && prevHasBudget && !budgetSuggestDismissed

  const zeroSpendDays = countMonthZeroSpendDays(month, expenses, today)
  const weekSpent = sumThisWeekSpend(allExpenses, month)
  const trends = buildSummaryTrends({
    month,
    today,
    totalSpent: stats.totalSpent,
    zeroSpendDays,
    weekSpent,
    prevMonthExpenses: prevMonthExpenses ?? [],
    allExpenses,
  })

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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="가계부"
        tab="budget"
        searchTo={`/budget/search?month=${month}`}
        onAdd={() => openExpenseModal()}
      >
        <MonthNav
          month={month}
          onChange={setMonth}
          minMonth={minMonth}
          maxMonth={maxMonth}
        />
      </PageHeader>

      {showBudgetSuggest && (
        <BudgetSuggestBanner
          prevMonth={prevMonth}
          applying={applyingBudget}
          onApply={applyPreviousMonthBudget}
          onDismiss={dismissBudgetSuggest}
        />
      )}

      {isSectionEnabled('budget-summary') && (
        <BudgetSummarySection
          totalSpent={stats.totalSpent}
          variableSpent={stats.variableSpent}
          fixedSpent={stats.fixedSpent}
          fixedExpenses={stats.fixedExpenses}
          showTotalSpendEmpty={stats.showTotalSpendEmpty}
          showVariableSpendEmpty={stats.showVariableSpendEmpty}
          zeroSpendDays={zeroSpendDays}
          weekSpent={weekSpent}
          spendTrend={trends.spendTrend}
          zeroSpendTrend={trends.zeroSpendTrend}
          weekTrend={trends.weekTrend}
          onOpenSummary={setSummaryView}
        />
      )}

      {isSectionEnabled('budget-categories') && (
        <BudgetCategorySection
          settings={settings}
          expenses={expenses}
          budgetCategories={stats.budgetCategories}
          chartBudget={stats.chartBudget}
          chartSpent={stats.chartSpent}
          chartCategorySpends={stats.chartCategorySpends}
          legendCategories={stats.legendCategories}
          hasUnsetBudgetCategories={stats.hasUnsetBudgetCategories}
          orphanExpenses={stats.orphanExpenses}
          onOpenCategorySettings={() => setShowCategoryModal(true)}
          onOpenCategoryExpenses={setExpenseListCategory}
          onOpenOrphanExpenses={() => setSummaryView('orphan')}
        />
      )}

      <ExpenseModal
        open={showExpenseModal}
        onClose={closeExpenseModal}
        categories={stats.budgetCategories}
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
              stats.budgetCategories.find((c) => c.id === expense.categoryId) ?? null,
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
        expenses={categoryModal.expenses}
        overview={
          expenseListCategory
            ? {
                budget: categoryModal.budget,
                spent: categoryModal.spent,
                slices: categoryModal.slices,
                legendCategories: categoryModal.slices.map((slice) => slice.name),
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
        expenses={stats.variableExpenses}
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
        expenses={stats.fixedExpenses}
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
        expenses={stats.orphanExpenses}
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
