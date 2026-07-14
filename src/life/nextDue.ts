import { addDays, format, parseISO } from 'date-fns'
import type { LifeRoutine } from '../types'
import { todayISO } from '../utils/dates'

/** 마지막 실행일(없으면 오늘) + 주기 → 다음 예정일 */
export function calculateNextDueAt(lastDoneAt: string | undefined, intervalDays: number, today = todayISO()) {
  const base = lastDoneAt ?? today
  const days = Math.max(1, Math.round(intervalDays))
  return format(addDays(parseISO(base), days), 'yyyy-MM-dd')
}

export function markRoutineDone(routine: LifeRoutine, doneAt = todayISO()): LifeRoutine {
  return {
    ...routine,
    lastDoneAt: doneAt,
    nextDueAt: calculateNextDueAt(doneAt, routine.intervalDays, doneAt),
  }
}

export function daysUntilDue(nextDueAt: string, today = todayISO()) {
  const a = parseISO(today).getTime()
  const b = parseISO(nextDueAt).getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

export function formatIntervalLabel(intervalDays: number) {
  if (intervalDays % 365 === 0 && intervalDays >= 365) {
    const y = intervalDays / 365
    return `${y}년`
  }
  if (intervalDays % 30 === 0 && intervalDays >= 30) {
    const m = intervalDays / 30
    return `${m}개월`
  }
  if (intervalDays % 7 === 0 && intervalDays >= 7) {
    const w = intervalDays / 7
    return `${w}주`
  }
  return `${intervalDays}일`
}
