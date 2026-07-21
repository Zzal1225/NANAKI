import type { AppSettings, BodySectionKey, CircumferencePart, SectionId, TabId } from '../types'
import { DEFAULT_APP_SETTINGS } from './sections'
import {
  DEFAULT_BODY_SECTION_INTERVALS,
  DEFAULT_CIRCUMFERENCE_PARTS,
} from '../body/sectionConfig'

const TAB_ALIASES: Record<string, TabId> = {
  body: 'health',
  mybody: 'health',
  archive: 'records',
}

const SECTION_ALIASES: Record<string, SectionId> = {
  'body-shape': 'body-weight',
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
  'body-intervals',
  'body-metrics',
])

function migrateBodySectionIntervals(raw: AppSettings): Partial<Record<BodySectionKey, number>> {
  if (raw.bodySectionIntervals) {
    return { ...DEFAULT_BODY_SECTION_INTERVALS, ...raw.bodySectionIntervals }
  }
  const legacy = raw.bodyMeasurementIntervals
  if (!legacy) return { ...DEFAULT_BODY_SECTION_INTERVALS }
  return {
    weight: legacy.weight ?? DEFAULT_BODY_SECTION_INTERVALS.weight,
    circumference:
      legacy.waist ?? legacy.hip ?? DEFAULT_BODY_SECTION_INTERVALS.circumference,
    photo: DEFAULT_BODY_SECTION_INTERVALS.photo,
  }
}

function migrateCircumferenceParts(raw: AppSettings): CircumferencePart[] {
  if (raw.circumferenceParts?.length) return raw.circumferenceParts
  return DEFAULT_CIRCUMFERENCE_PARTS
}

export function migrateAppSettings(raw: AppSettings): AppSettings {
  const enabledTabs = [
    ...new Set(
      raw.enabledTabs
        .map((t) => TAB_ALIASES[t as string] ?? t)
        .filter((t) => !REMOVED_TABS.has(t as string)) as TabId[],
    ),
  ]

  let enabledSections = [
    ...new Set(
      raw.enabledSections
        .map((s) => SECTION_ALIASES[s as string] ?? s)
        .filter((s) => !REMOVED_SECTIONS.has(s)) as SectionId[],
    ),
  ]

  // body-metrics → 체중 + 신체둘레
  const hadLegacyMetrics = (raw.enabledSections as string[]).some(
    (s) => s === 'body-metrics' || s === 'body-shape',
  )
  if (hadLegacyMetrics) {
    if (!enabledSections.includes('body-weight')) enabledSections.push('body-weight')
    if (!enabledSections.includes('body-circumference')) {
      enabledSections.push('body-circumference')
    }
  }

  // 기존 사용자에게 영양제·생활 섹션/탭 기본 ON
  if (!enabledSections.includes('supplements-summary')) {
    enabledSections.push('supplements-summary')
  }
  if (!enabledSections.includes('life-routines')) {
    enabledSections.push('life-routines')
  }
  if (!enabledSections.includes('life-pantry')) {
    enabledSections.push('life-pantry')
  }
  if (!enabledSections.includes('life-purchase-cycles')) {
    enabledSections.push('life-purchase-cycles')
  }
  if (!enabledTabs.includes('life')) {
    enabledTabs.push('life')
  }

  // 신규 체형 섹션 기본 ON
  if (!enabledSections.includes('body-weight')) enabledSections.push('body-weight')
  if (!enabledSections.includes('body-circumference')) {
    enabledSections.push('body-circumference')
  }
  if (!enabledSections.includes('body-photo')) enabledSections.push('body-photo')

  enabledSections = [...new Set(enabledSections)]

  return {
    ...raw,
    enabledTabs: enabledTabs.length ? enabledTabs : DEFAULT_APP_SETTINGS.enabledTabs,
    enabledSections: enabledSections.length
      ? enabledSections
      : DEFAULT_APP_SETTINGS.enabledSections,
    bodySectionIntervals: migrateBodySectionIntervals(raw),
    circumferenceParts: migrateCircumferenceParts(raw),
  }
}
