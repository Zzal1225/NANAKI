import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { PantryStatus } from '../types'
import { todayISO } from '../utils/dates'

export const PANTRY_SOON_DAYS = 6

export function daysUntilExpiry(expiresAt: string, today = todayISO()) {
  return differenceInCalendarDays(parseISO(expiresAt), parseISO(today))
}

/** 여유 ≥7 · 임박 1–6 · 폐기 ≤0 */
export function getPantryStatus(expiresAt: string, today = todayISO()): PantryStatus {
  const days = daysUntilExpiry(expiresAt, today)
  if (days <= 0) return 'expired'
  if (days <= PANTRY_SOON_DAYS) return 'soon'
  return 'fresh'
}

export const PANTRY_STATUS_META: Record<
  PantryStatus,
  { label: string; emoji: string; className: string }
> = {
  fresh: { label: '여유', emoji: '🟢', className: 'text-success' },
  soon: { label: '임박', emoji: '🟡', className: 'text-warning' },
  expired: { label: '폐기 필요', emoji: '🔴', className: 'text-danger' },
}

export function formatRemainingDays(days: number) {
  if (days > 0) return `${days}일`
  if (days === 0) return '오늘까지'
  return `${Math.abs(days)}일 지남`
}
