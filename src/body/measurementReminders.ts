import { addDays, format, parseISO } from 'date-fns'
import type { BodyMetricKey, BodyRecord } from '../types'

export const BODY_METRIC_LABELS: Record<BodyMetricKey, string> = {
  weight: '체중',
  bodyFat: '체지방',
  waist: '허리',
  hip: '엉덩이',
  chest: '가슴',
  arm: '팔',
  thigh: '허벅지',
  calf: '종아리',
}

export const DEFAULT_BODY_INTERVALS: Record<BodyMetricKey, number> = {
  weight: 7,
  bodyFat: 14,
  waist: 14,
  hip: 14,
  chest: 30,
  arm: 30,
  thigh: 30,
  calf: 30,
}

export function getMetricValue(record: BodyRecord, metric: BodyMetricKey): number | undefined {
  if (metric === 'weight') return record.weight
  if (metric === 'bodyFat') return record.bodyFat
  return record.measurements?.[metric]
}

export function findLastMetricDate(records: BodyRecord[], metric: BodyMetricKey): string | undefined {
  for (const r of records) {
    if (getMetricValue(r, metric) !== undefined) return r.date
  }
  return undefined
}

export function getNextDueDate(lastDate: string | undefined, intervalDays: number): string | null {
  if (!lastDate) return null
  return format(addDays(parseISO(lastDate), intervalDays), 'yyyy-MM-dd')
}

export function isMeasurementDue(lastDate: string | undefined, intervalDays: number, today: string): boolean {
  const next = getNextDueDate(lastDate, intervalDays)
  if (!next) return true
  return next <= today
}
