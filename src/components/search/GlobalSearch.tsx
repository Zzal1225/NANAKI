import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { unifiedSearch, searchExpenseStats, SEARCH_TYPE_LABELS } from '../../search/unifiedSearch'
import type { ExpenseSearchStats, SearchResult } from '../../types'
import SearchBar from '../common/SearchBar'
import { formatCurrency, formatDate } from '../../utils/dates'

const RESULTS_PAGE_SIZE = 20

interface GlobalSearchProps {
  placeholder?: string
  previewCount?: number
  initialQuery?: string
  syncQueryToUrl?: boolean
}

function SearchResultItem({ result }: { result: SearchResult }) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{result.title}</span>
        <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
          {SEARCH_TYPE_LABELS[result.type]}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span>{formatDate(result.date, 'yyyy.M.d')}</span>
        {result.subtitle && <span>· {result.subtitle}</span>}
      </div>
      {result.snippet && (
        <p className="truncate text-xs text-text-secondary">{result.snippet}</p>
      )}
    </>
  )

  if (result.type === 'expense') {
    return <div className="flex flex-col gap-0.5 px-3 py-2.5">{content}</div>
  }

  return (
    <Link to={result.path} className="flex flex-col gap-0.5 px-3 py-2.5 hover:bg-surface-overlay">
      {content}
    </Link>
  )
}

function ExpenseStatsSection({ stats }: { stats: ExpenseSearchStats }) {
  return (
    <div className="px-3 py-3">
      <p className="text-sm text-text-secondary">
        총 {stats.totalCount}건 · {formatCurrency(stats.totalAmount)}
      </p>
      <div className="mt-2 flex flex-col gap-1">
        {stats.byYear.map((y) => (
          <div
            key={y.year}
            className="flex items-center justify-between text-xs text-text-muted"
          >
            <span>{y.year}년</span>
            <span>{y.count}건 · {formatCurrency(y.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SearchResultsBody({
  loading,
  hasResults,
  expenseStats,
  results,
  visibleCount,
  isPreview,
  previewCount,
  onLoadMore,
}: {
  loading: boolean
  hasResults: boolean
  expenseStats: ExpenseSearchStats | null
  results: SearchResult[]
  visibleCount: number
  isPreview: boolean
  previewCount: number
  onLoadMore?: () => void
}) {
  if (loading) {
    return <p className="px-3 py-4 text-sm text-text-muted">검색 중...</p>
  }
  if (!hasResults) {
    return <p className="px-3 py-4 text-sm text-text-muted">검색 결과가 없습니다.</p>
  }

  const limit = isPreview ? previewCount : visibleCount
  const shown = results.slice(0, limit)
  const hasMoreResults = results.length > limit

  return (
    <>
      {!isPreview && expenseStats && <ExpenseStatsSection stats={expenseStats} />}
      {results.length > 0 && (
        <>
          <p className="border-b border-border px-3 py-2 text-xs text-text-muted">
            {results.length}건
          </p>
          <div>
            {shown.map((r) => (
              <SearchResultItem key={`${r.type}-${r.id}`} result={r} />
            ))}
          </div>
        </>
      )}
      {!isPreview && hasMoreResults && onLoadMore && (
        <div className="px-3 py-1">
          <button
            type="button"
            onClick={onLoadMore}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
          >
            더보기 ({results.length - limit}건)
          </button>
        </div>
      )}
    </>
  )
}

export default function GlobalSearch({
  placeholder = '전체 검색',
  previewCount,
  initialQuery = '',
  syncQueryToUrl = false,
}: GlobalSearchProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(initialQuery || searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [expenseStats, setExpenseStats] = useState<ExpenseSearchStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE)

  const isPreview = previewCount != null

  useEffect(() => {
    const fromUrl = initialQuery || (syncQueryToUrl ? searchParams.get('q') : null)
    if (fromUrl != null && fromUrl !== query) {
      setQuery(fromUrl)
    }
  }, [initialQuery, searchParams, syncQueryToUrl])

  useEffect(() => {
    if (syncQueryToUrl) {
      const trimmed = query.trim()
      if (trimmed) {
        setSearchParams({ q: trimmed }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    }
  }, [query, syncQueryToUrl, setSearchParams])

  useEffect(() => {
    setVisibleCount(RESULTS_PAGE_SIZE)
    if (!query.trim()) {
      setResults([])
      setExpenseStats(null)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      Promise.all([unifiedSearch(query), searchExpenseStats(query)]).then(([r, stats]) => {
        setResults(r)
        setExpenseStats(stats)
        setLoading(false)
      })
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const hasResults = results.length > 0 || expenseStats != null
  const showPreviewMore =
    isPreview &&
    query.trim() &&
    !loading &&
    hasResults &&
    (results.length > previewCount! || expenseStats != null)

  const previewPanelClass =
    'overflow-hidden rounded-2xl border border-accent/25 bg-surface-overlay shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/5'

  const fullPanelClass =
    'overflow-hidden rounded-2xl border border-border bg-surface-raised'

  const body = (
    <SearchResultsBody
      loading={loading}
      hasResults={hasResults}
      expenseStats={expenseStats}
      results={results}
      visibleCount={visibleCount}
      isPreview={isPreview}
      previewCount={previewCount ?? RESULTS_PAGE_SIZE}
      onLoadMore={
        !isPreview ? () => setVisibleCount((n) => n + RESULTS_PAGE_SIZE) : undefined
      }
    />
  )

  return (
    <div className={isPreview ? 'relative z-30' : 'flex flex-col gap-3'}>
      <SearchBar value={query} onChange={setQuery} placeholder={placeholder} />

      {query.trim() && isPreview && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden
            onClick={() => setQuery('')}
          />
          <div
            className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(360px,50dvh)] overflow-y-auto ${previewPanelClass}`}
          >
            {body}
            {showPreviewMore && (
              <div className="px-3 pb-2">
                <button
                  type="button"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(query.trim())}`)}
                  className="w-full rounded-xl py-2.5 text-sm font-medium text-accent hover:bg-accent/10"
                >
                  더보기
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {query.trim() && !isPreview && (
        <div className={fullPanelClass}>{body}</div>
      )}
    </div>
  )
}

export function SearchResultsPageHeader() {
  return (
    <header className="flex items-center gap-3">
      <Link
        to="/"
        className="rounded-lg p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
        aria-label="홈으로"
      >
        <ArrowLeft size={20} />
      </Link>
      <h1 className="text-xl font-bold">검색 결과</h1>
    </header>
  )
}
