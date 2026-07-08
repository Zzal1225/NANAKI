import type { AppSettings, SectionId, SectionMeta, TabId } from '../types'
import { LOCAL_USER_ID } from './user'

export const ALL_TABS: { id: TabId; label: string; path: string; alwaysOn?: boolean }[] = [
  { id: 'home', label: '홈', path: '/', alwaysOn: true },
  { id: 'budget', label: '가계부', path: '/budget' },
  { id: 'mybody', label: '내몸', path: '/mybody' },
  { id: 'fitness', label: '운동', path: '/fitness' },
  { id: 'archive', label: '아카이브', path: '/archive' },
  { id: 'habits', label: '습관', path: '/habits' },
]

export const ALL_SECTIONS: SectionMeta[] = [
  { id: 'home-search', label: '통합 검색', tab: 'home', defaultEnabled: true },
  { id: 'home-comparison', label: '30일 비교 카드 (분석보기)', tab: 'home', defaultEnabled: true },
  { id: 'home-calendar', label: '캘린더', tab: 'home', defaultEnabled: true },
  { id: 'home-timeline', label: '기간 연결 분석', tab: 'home', defaultEnabled: true },

  { id: 'budget-summary', label: '예산 요약', tab: 'budget', group: '가계부', defaultEnabled: true },
  { id: 'budget-categories', label: '카테고리별 예산', tab: 'budget', group: '가계부', defaultEnabled: true },

  { id: 'body-shape', label: '체형관리', tab: 'mybody', group: '내몸', defaultEnabled: true },
  { id: 'health-period', label: '생리 기록', tab: 'mybody', group: '건강관리', defaultEnabled: true },
  { id: 'health-bp', label: '혈압', tab: 'mybody', group: '건강관리', defaultEnabled: true },
  { id: 'health-sugar', label: '혈당', tab: 'mybody', group: '건강관리', defaultEnabled: true },
  { id: 'health-sleep', label: '수면', tab: 'mybody', group: '건강관리', defaultEnabled: true },
  { id: 'health-hospital', label: '병원 방문', tab: 'mybody', group: '건강관리', defaultEnabled: true },

  { id: 'fitness-exercise', label: '운동', tab: 'fitness', defaultEnabled: true },

  { id: 'archive-search', label: '검색', tab: 'archive', defaultEnabled: true },
  { id: 'archive-list', label: '기록 목록', tab: 'archive', defaultEnabled: true },

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
  archive: '아카이브',
  expense: '가계부',
  body: '체형',
  period: '생리',
  bp: '혈압',
  sugar: '혈당',
  sleep: '수면',
  hospital: '병원',
  exercise: '운동',
  habit: '습관',
}

export const SUGAR_TIMING_LABELS: Record<string, string> = {
  fasting: '공복',
  after_meal: '식후',
  before_sleep: '취침 전',
  other: '기타',
}
