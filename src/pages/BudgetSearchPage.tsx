import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { FormField, inputClass, btnPrimary } from '../components/common/Modal'
import SubItemTagInput from '../components/budget/SubItemTagInput'
import PageHeader from '../components/layout/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { getAllExpenses } from '../db'
import { getGlobalCategories } from '../budget/monthSettings'
import {
  categoryOptions,
  getDefaultExpenseSearchRange,
  searchExpenses,
  sumExpenseAmounts,
  type ExpenseSearchFilters,
} from '../budget/expenseSearch'
import { collectSubItemTags } from '../budget/subItemTags'
import { expenseDisplayLabel } from '../budget/categoryMatch'
import { currentMonth, formatCurrency, formatDate } from '../utils/dates'
import type { Expense } from '../types'

const PAGE_SIZE = 20

function ExpenseResultRow({ expense }: { expense: Expense }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{expenseDisplayLabel(expense)}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(expense.amount)}</span>
      </div>
      <p className="text-xs text-text-muted">
        {formatDate(expense.date, 'yyyy.M.d')} · {expense.categoryName}
        {expense.type === 'fixed' ? ' · 고정' : ''}
      </p>
    </div>
  )
}

export default function BudgetSearchPage() {
  const [searchParams] = useSearchParams()
  const monthParam = searchParams.get('month') ?? currentMonth()
  const defaultRange = getDefaultExpenseSearchRange(monthParam)

  const [keyword, setKeyword] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [dateStart, setDateStart] = useState(defaultRange.dateStart)
  const [dateEnd, setDateEnd] = useState(defaultRange.dateEnd)
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [results, setResults] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const { data: categories } = useAsync(() => getGlobalCategories(), [])
  const { data: allExpenses } = useAsync(() => getAllExpenses(), [])
  const subItemTags = useMemo(() => collectSubItemTags(allExpenses ?? []), [allExpenses])

  const categoryList = useMemo(
    () => categoryOptions(categories ?? []),
    [categories],
  )

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [results])

  const buildFilters = (): ExpenseSearchFilters => ({
    keyword: keyword.trim() || undefined,
    amountMin: amountMin ? parseInt(amountMin, 10) : undefined,
    amountMax: amountMax ? parseInt(amountMax, 10) : undefined,
    dateStart,
    dateEnd,
    categoryIds: categoryIds.length ? categoryIds : undefined,
  })

  const runSearch = async () => {
    setLoading(true)
    setSearched(true)
    try {
      const matched = await searchExpenses(buildFilters())
      setResults(matched)
      setTotal(sumExpenseAmounts(matched))
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const shown = results.slice(0, visibleCount)
  const hasMore = visibleCount < results.length

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="가계부 검색"
        tab="budget"
        hideSearch
        backTo="/budget"
      />

      <Card className="flex flex-col gap-4">
        <FormField label="키워드">
          <SubItemTagInput
            value={keyword}
            onChange={setKeyword}
            tags={subItemTags}
            placeholder="예: 스타벅스, 월세"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="최소 금액">
            <input
              type="number"
              className={`${inputClass} tabular-nums`}
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              placeholder="0"
              min={0}
            />
          </FormField>
          <FormField label="최대 금액">
            <input
              type="number"
              className={`${inputClass} tabular-nums`}
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              placeholder="무제한"
              min={0}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="시작일">
            <input
              type="date"
              className={`${inputClass} tabular-nums`}
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </FormField>
          <FormField label="종료일">
            <input
              type="date"
              className={`${inputClass} tabular-nums`}
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </FormField>
        </div>

        <div>
          <p className="mb-2 text-sm text-text-secondary">카테고리</p>
          <div className="flex flex-wrap gap-2">
            {categoryList.map((cat) => {
              const active = categoryIds.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-accent text-surface'
                      : 'border border-border text-text-muted hover:border-accent/50'
                  }`}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs text-text-muted">선택하지 않으면 전체 카테고리</p>
        </div>

        <button type="button" className={btnPrimary} onClick={runSearch} disabled={loading}>
          {loading ? '검색 중…' : '검색'}
        </button>
      </Card>

      {searched && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
          <div className="border-b border-border px-3 py-3">
            <p className="text-sm font-semibold text-text-primary">
              합계 {formatCurrency(total)}
              <span className="ml-1 font-medium text-text-muted">({results.length}건)</span>
            </p>
          </div>

          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">조건에 맞는 지출이 없어요.</p>
          ) : (
            <>
              {shown.map((expense) => (
                <ExpenseResultRow key={expense.id} expense={expense} />
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="w-full border-t border-border py-3 text-sm font-medium text-text-secondary hover:bg-surface-overlay"
                >
                  더보기 ({results.length - visibleCount}건)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
