import type { AppSettings, SectionId, SectionMeta, TabId } from '../types'
import { LOCAL_USER_ID } from './user'

export const ALL_TABS: { id: TabId; label: string; path: string; alwaysOn?: boolean }[] = [
  { id: 'home', label: '홈', path: '/', alwaysOn: true },
  { id: 'budget', label: '가계부', path: '/budget' },
  { id: 'body', label: '체형', path: '/body' },
  { id: 'records', label: '기록', path: '/records' },
  { id: 'habits', label: '습관', path: '/habits' },
]

export const ALL_SECTIONS: SectionMeta[] = [
  { id: 'home-search', label: '통합 검색', tab: 'home', defaultEnabled: true },
  { id: 'home-comparison', label: '30일 비교 카드 (분석보기)', tab: 'home', defaultEnabled: true },
  { id: 'home-calendar', label: '캘린더', tab: 'home', defaultEnabled: true },
  { id: 'home-timeline', label: '기간 연결 분석', tab: 'home', defaultEnabled: true },

  { id: 'budget-summary', label: '예산 요약', tab: 'budget', group: '가계부', defaultEnabled: true },
  { id: 'budget-categories', label: '카테고리별 예산', tab: 'budget', group: '가계부', defaultEnabled: true },

  { id: 'body-metrics', label: '체중 · 둘레', tab: 'body', group: '체형', defaultEnabled: true },
  { id: 'body-photo', label: '눈바디', tab: 'body', group: '체형', defaultEnabled: true },
  { id: 'body-intervals', label: '측정 주기', tab: 'body', group: '체형', defaultEnabled: true },

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
  habit: '습관',
}
