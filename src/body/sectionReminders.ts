import { addDays, format, parseISO } from 'date-fns'
import type { BodyPhotoRecord, BodyRecord, BodySectionKey } from '../types'
import { resolveBodySectionIntervals } from './sectionConfig'

export function getNextDueDate(lastDate: string | undefined, intervalDays: number): string | null {
  if (!lastDate) return null
  return format(addDays(parseISO(lastDate), intervalDays), 'yyyy-MM-dd')
}

export function isMeasurementDue(
  lastDate: string | undefined,
  intervalDays: number,
  today: string,
): boolean {
  const next = getNextDueDate(lastDate, intervalDays)
  if (!next) return true
  return next <= today
}

export function findLastWeightDate(records: BodyRecord[]): string | undefined {
  for (const r of records) {
    if (r.weight != null) return r.date
  }
  return undefined
}

export function findLastCircumferenceDate(records: BodyRecord[]): string | undefined {
  for (const r of records) {
    if (r.measurements && Object.values(r.measurements).some((v) => v != null)) return r.date
  }
  return undefined
}

export function findLastPhotoDate(photos: BodyPhotoRecord[]): string | undefined {
  return photos[0]?.date
}

export function getWeightDelta(current: number, previous: number | undefined): number | null {
  if (previous == null) return null
  return Math.round((current - previous) * 10) / 10
}

export function formatWeightDelta(delta: number | null): string | null {
  if (delta == null) return null
  if (delta === 0) return '전 측정 대비 0kg'
  const sign = delta > 0 ? '+' : ''
  return `전 측정 대비 ${sign}${delta}kg`
}

export function getCircumferenceDelta(
  current: number,
  previous: number | undefined,
): number | null {
  if (previous == null) return null
  return Math.round((current - previous) * 10) / 10
}

export function formatCmDelta(delta: number | null): string | null {
  if (delta == null) return null
  if (delta === 0) return '±0cm'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta}cm`
}

/** 섹션별 due 여부 */
export function getDueBodySections(params: {
  today: string
  records: BodyRecord[]
  photos: BodyPhotoRecord[]
  intervals?: Partial<Record<BodySectionKey, number>>
}): { key: BodySectionKey; doneToday: boolean }[] {
  const intervals = resolveBodySectionIntervals(params.intervals)
  const result: { key: BodySectionKey; doneToday: boolean }[] = []

  const lastWeight = findLastWeightDate(params.records)
  if (isMeasurementDue(lastWeight, intervals.weight, params.today)) {
    result.push({
      key: 'weight',
      doneToday: params.records.some((r) => r.date === params.today && r.weight != null),
    })
  }

  const lastCirc = findLastCircumferenceDate(params.records)
  if (isMeasurementDue(lastCirc, intervals.circumference, params.today)) {
    result.push({
      key: 'circumference',
      doneToday: params.records.some(
        (r) =>
          r.date === params.today &&
          !!r.measurements &&
          Object.values(r.measurements).some((v) => v != null),
      ),
    })
  }

  const lastPhoto = findLastPhotoDate(params.photos)
  if (isMeasurementDue(lastPhoto, intervals.photo, params.today)) {
    result.push({
      key: 'photo',
      doneToday: params.photos.some((p) => p.date === params.today),
    })
  }

  return result
}

/** 이전 체중 기록이 있는 레코드 (최신 제외) */
export function findPreviousWeight(
  records: BodyRecord[],
  currentId?: string,
): { weight: number; date: string } | null {
  for (const r of records) {
    if (currentId && r.id === currentId) continue
    if (r.weight != null) return { weight: r.weight, date: r.date }
  }
  return null
}

export function findPreviousCircumferenceValue(
  records: BodyRecord[],
  partId: string,
  currentId?: string,
): number | undefined {
  for (const r of records) {
    if (currentId && r.id === currentId) continue
    const v = r.measurements?.[partId]
    if (v != null) return v
  }
  return undefined
}
