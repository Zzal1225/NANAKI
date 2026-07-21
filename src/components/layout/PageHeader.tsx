import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Home, Plus, Search } from 'lucide-react'
import SectionSettings from '../settings/SectionSettings'
import type { TabId } from '../../types'

/** 헤더 우측 아이콘 버튼 (검색·설정) — 컴팩트 */
export const headerIconBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:border-accent/50 hover:text-text-primary'

/** 헤더 추가 버튼 — 컴팩트 */
export const headerAddBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-surface transition-transform active:scale-[0.96] hover:bg-accent-dim'

interface PageHeaderProps {
  title: string
  subtitle?: string
  tab: TabId
  searchTo?: string
  hideSearch?: boolean
  hideAdd?: boolean
  onAdd?: () => void
  backTo?: string
  actions?: ReactNode
  /** 헤더 중앙 — 월 선택 등 (타이틀 ↔ 우측 버튼) */
  children?: ReactNode
  /** 헤더 아래 — 홈 달력/분석 토글 등 */
  below?: ReactNode
}

function searchPathForTab(tab: TabId): string {
  if (tab === 'budget') return '/budget/search'
  return '/search'
}

/**
 * 단일 행 헤더
 * - [타이틀 + 홈] | [중앙: 월 선택] | [검색 · 설정 · 추가]
 * - below: 구분선 아래 보조 컨트롤
 */
export default function PageHeader({
  title,
  subtitle,
  tab,
  hideSearch = false,
  hideAdd = false,
  onAdd,
  searchTo,
  backTo,
  actions,
  children,
  below,
}: PageHeaderProps) {
  const navigate = useNavigate()
  const isHome = tab === 'home'

  return (
    <>
      <header className="sticky top-0 z-40 -mx-4 border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur-lg">
        <div className="grid h-9 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {backTo && (
              <Link
                to={backTo}
                className="-ml-1 shrink-0 rounded-lg p-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
                aria-label="뒤로"
              >
                <ArrowLeft size={18} />
              </Link>
            )}

            {isHome ? (
              <Link
                to="/"
                className="truncate text-lg font-bold tracking-tight text-text-primary hover:text-accent"
              >
                Nanaki
              </Link>
            ) : (
              <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
            )}

            {subtitle && !isHome && (
              <span className="hidden truncate text-xs text-text-muted sm:inline">{subtitle}</span>
            )}

            <Link
              to="/"
              aria-label="홈"
              title="홈"
              className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                isHome
                  ? 'text-accent'
                  : 'text-text-muted hover:bg-surface-overlay hover:text-text-primary'
              }`}
            >
              <Home size={18} strokeWidth={2} />
            </Link>
          </div>

          <div className="flex justify-center px-0.5">{children}</div>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1">
            {!hideSearch && (
              <button
                type="button"
                onClick={() => navigate(searchTo ?? searchPathForTab(tab))}
                className={headerIconBtnClass}
                title="검색"
                aria-label="검색"
              >
                <Search size={15} strokeWidth={2} />
              </button>
            )}
            <SectionSettings tab={isHome ? undefined : tab} compact />
            {!hideAdd && (
              <button
                type="button"
                onClick={onAdd}
                disabled={!onAdd}
                className={`${headerAddBtnClass} disabled:cursor-not-allowed disabled:opacity-40`}
                title="추가"
                aria-label="추가"
              >
                <Plus size={15} strokeWidth={2.5} />
              </button>
            )}
            {actions}
          </div>
        </div>
      </header>

      {below && (
        <div className="flex items-center justify-center py-1">{below}</div>
      )}
    </>
  )
}
