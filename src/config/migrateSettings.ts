import type { AppSettings, SectionId, TabId } from '../types'
import { DEFAULT_APP_SETTINGS } from './sections'

const TAB_ALIASES: Record<string, TabId> = {
  body: 'health',
  mybody: 'health',
  archive: 'records',
}

const SECTION_ALIASES: Record<string, SectionId> = {
  'body-shape': 'body-metrics',
  'archive-search': 'records-search',
  'archive-list': 'records-list',
}

const REMOVED_TABS = new Set(['fitness'])
const REMOVED_SECTIONS = new Set([
  'health-period',
  'health-bp',
  'health-sugar',
  'health-sleep',
  'health-hospital',
  'fitness-exercise',
])

export function migrateAppSettings(raw: AppSettings): AppSettings {
  const enabledTabs = [
    ...new Set(
      raw.enabledTabs
        .map((t) => TAB_ALIASES[t as string] ?? t)
        .filter((t) => !REMOVED_TABS.has(t as string)) as TabId[],
    ),
  ]

  const enabledSections = [
    ...new Set(
      raw.enabledSections
        .map((s) => SECTION_ALIASES[s as string] ?? s)
        .filter((s) => !REMOVED_SECTIONS.has(s)) as SectionId[],
    ),
  ]

  // 기존 체형 사용자에게 영양제 섹션 기본 ON
  if (!enabledSections.includes('supplements-summary')) {
    enabledSections.push('supplements-summary')
  }

  return {
    ...raw,
    enabledTabs: enabledTabs.length ? enabledTabs : DEFAULT_APP_SETTINGS.enabledTabs,
    enabledSections: enabledSections.length ? enabledSections : DEFAULT_APP_SETTINGS.enabledSections,
  }
}
