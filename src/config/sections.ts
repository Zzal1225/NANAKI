import type { AppSettings, SectionId, SectionMeta, TabId } from '../types'
import { LOCAL_USER_ID } from './user'

/**
 * 홈은 하단 탭이 아니라 상단 Nanaki 로고 옆 아이콘으로 진입 (alwaysOn).
 * 하단 탭 5개: 가계부 · 건강 · 생활 · 기록 · 습관
 */
export const ALL_TABS: { id: TabId; label: string; path: string; alwaysOn?: boolean }[] = [
  { id: 'home', label: '홈', path: '/', alwaysOn: true },
  { id: 'budget', label: '가계부', path: '/budget' },
  { id: 'health', label: '건강', path: '/health' },
  { id: 'life', label: '생활', path: '/life' },
  { id: 'records', label: '기록', path: '/records' },
  { id: 'habits', label: '습관', path: '/habits' },
]

/** 하단 네비게이션에 노출할 탭 (홈 제외) */
export const BOTTOM_NAV_TABS = ['budget', 'health', 'life', 'records', 'habits'] as const satisfies readonly Exclude<
  TabId,
  'home'
>[]

export const ALL_SECTIONS: SectionMeta[] = [
  { id: 'home-search', label: '통합 검색', tab: 'home', defaultEnabled: true },
  { id: 'home-comparison', label: '30일 비교 카드 (분석보기)', tab: 'home', defaultEnabled: true },
  { id: 'home-calendar', label: '캘린더', tab: 'home', defaultEnabled: true },
  { id: 'home-timeline', label: '기간 연결 분석', tab: 'home', defaultEnabled: true },

  { id: 'budget-summary', label: '예산 요약', tab: 'budget', group: '가계부', defaultEnabled: true },
  { id: 'budget-categories', label: '카테고리별 예산', tab: 'budget', group: '가계부', defaultEnabled: true },

  { id: 'body-metrics', label: '체중 · 둘레', tab: 'health', group: '체형', defaultEnabled: true },
  { id: 'body-photo', label: '눈바디', tab: 'health', group: '체형', defaultEnabled: true },
  { id: 'body-intervals', label: '측정 주기', tab: 'health', group: '체형', defaultEnabled: true },
  { id: 'supplements-summary', label: '영양제', tab: 'health', group: '영양제', defaultEnabled: true },

  { id: 'life-routines', label: '반복 관리', tab: 'life', group: '생활', defaultEnabled: true },
  { id: 'life-pantry', label: '냉장고 · 소비기한', tab: 'life', group: '생활', defaultEnabled: true },
  {
    id: 'life-purchase-cycles',
    label: '구매 주기 분석',
    tab: 'life',
    group: '생활',
    defaultEnabled: true,
  },

  { id: 'records-search', label: '검색', tab: 'records', defaultEnabled: true },
  { id: 'records-list', label: '기록 목록', tab: 'records', defaultEnabled: true },

  { id: 'habits-checklist', label: '습관 체크', tab: 'habits', defaultEnabled: true },
]

export const DEFAULT_ENABLED_TABS: TabId[] = ALL_TABS.filter((t) => !t.alwaysOn).map((t) => t.id)
export const DEFAULT_ENABLED_SECTIONS: SectionId[] = ALL_SECTIONS.map((s) => s.id)

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'app-settings',
  userId: LOCAL_USER_ID,
  createdAt: '2020-01-01T00:00:00.000Z',
  enabledTabs: DEFAULT_ENABLED_TABS,
  enabledSections: DEFAULT_ENABLED_SECTIONS,
}

export function getSectionsForTab(tab: TabId): SectionMeta[] {
  return ALL_SECTIONS.filter((s) => s.tab === tab)
}

export const SEARCH_TYPE_LABELS: Record<string, string> = {
  records: '기록',
  expense: '가계부',
  body: '체형',
  bodyPhoto: '눈바디',
  supplement: '영양제',
  life: '생활',
  habit: '습관',
}
