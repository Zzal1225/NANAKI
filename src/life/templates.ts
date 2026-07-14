import type { LifeRoutineGroup } from '../types'

export type RoutineTemplate = {
  name: string
  group: LifeRoutineGroup
  intervalDays: number
  suggestedIntervalDays: number
}

/** 권장 주기 시드 — 사용자가 선택·수정 가능 */
export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  { name: '수건 교체', group: 'chores', intervalDays: 90, suggestedIntervalDays: 90 },
  { name: '침구 세탁', group: 'chores', intervalDays: 14, suggestedIntervalDays: 14 },
  { name: '에어컨 필터 청소', group: 'chores', intervalDays: 30, suggestedIntervalDays: 30 },
  { name: '냉장고 정리', group: 'chores', intervalDays: 30, suggestedIntervalDays: 30 },
  { name: '칫솔 교체', group: 'consumables', intervalDays: 90, suggestedIntervalDays: 90 },
  { name: '면도날 교체', group: 'consumables', intervalDays: 30, suggestedIntervalDays: 30 },
  { name: '세제 구매', group: 'consumables', intervalDays: 60, suggestedIntervalDays: 60 },
  { name: '치과 검진', group: 'health', intervalDays: 180, suggestedIntervalDays: 180 },
  { name: '피부과 방문', group: 'health', intervalDays: 90, suggestedIntervalDays: 90 },
  { name: '건강검진', group: 'health', intervalDays: 365, suggestedIntervalDays: 365 },
]

export const ROUTINE_GROUP_LABELS: Record<LifeRoutineGroup, string> = {
  chores: '집안일',
  consumables: '소모품',
  health: '건강',
  custom: '기타',
}

export const INTERVAL_PRESETS = [
  { label: '1주', days: 7 },
  { label: '2주', days: 14 },
  { label: '1개월', days: 30 },
  { label: '3개월', days: 90 },
  { label: '6개월', days: 180 },
  { label: '1년', days: 365 },
]
