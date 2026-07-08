import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import SectionSettings from '../settings/SectionSettings'
import type { TabId } from '../../types'

interface PageHeaderProps {
  title: string
  subtitle?: string
  tab: TabId
  /** 검색 이동 경로 (기본: 탭별 검색) */
  searchTo?: string
  /** 검색 버튼 숨김 (검색 페이지 등) */
  hideSearch?: boolean
  /** 뒤로가기 링크 */
  backTo?: string
  /** 우측 추가 버튼 (추가, 월 이동 등) */
  actions?: ReactNode
  /** 타이틀 아래 추가 UI (월 선택 등) */
  children?: ReactNode
}

function searchPathForTab(tab: TabId): string {
  if (tab === 'budget') return '/budget/search'
  return '/search'
}

export default function PageHeader({
  title,
  subtitle,
  tab,
  hideSearch = false,
  searchTo,
  backTo,
  actions,
  children,
}: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="flex min-h-[4.25rem] items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex h-7 items-center gap-2">
          {backTo && (
            <Link
              to={backTo}
              className="-ml-1.5 shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
              aria-label="뒤로"
            >
              <ArrowLeft size={20} />
            </Link>
          )}
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        <div className="mt-0.5 min-h-5">
          {subtitle ? (
            <p className="text-sm text-text-secondary">{subtitle}</p>
          ) : (
            children
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!hideSearch && (
          <button
            type="button"
            onClick={() => navigate(searchTo ?? searchPathForTab(tab))}
            className="rounded-xl border border-border p-2.5 text-text-secondary hover:border-accent/50 hover:text-text-primary"
            title="검색"
            aria-label="검색"
          >
            <Search size={18} />
          </button>
        )}
        <SectionSettings tab={tab === 'home' ? undefined : tab} />
        {actions}
      </div>
    </header>
  )
}
