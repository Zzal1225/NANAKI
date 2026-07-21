/**
 * 생활 알림 (MVP · 로컬 보조 채널)
 * - 주 채널: 홈「오늘 할 일」— docs/NOTIFICATIONS.md
 * - 앱이 열려 있을 때 오전 9시(또는 진입 시) 요약 Notification
 */

import type { LifeRoutine, PantryItem } from '../types'
import { getPantryStatus } from './pantryStatus'
import { todayISO } from '../utils/dates'
import {
  ensureNotificationPermission,
  showLocalNotification,
} from '../notifications/localNotify'

export { ensureNotificationPermission }

type AlarmHandle = ReturnType<typeof setTimeout>

const pendingAlarms = new Map<string, AlarmHandle>()

export function clearLifeAlarms() {
  for (const handle of pendingAlarms.values()) clearTimeout(handle)
  pendingAlarms.clear()
}

function buildBody(routines: LifeRoutine[], pantry: PantryItem[], today: string) {
  const dueRoutines = routines.filter((r) => r.nextDueAt <= today)
  const alertPantry = pantry.filter((p) => {
    const s = getPantryStatus(p.expiresAt, today)
    return s === 'soon' || s === 'expired'
  })

  const parts: string[] = []
  if (dueRoutines.length > 0) {
    const names = dueRoutines
      .slice(0, 3)
      .map((r) => r.name)
      .join(', ')
    const more = dueRoutines.length > 3 ? ` 외 ${dueRoutines.length - 3}` : ''
    parts.push(`반복 ${dueRoutines.length}건: ${names}${more}`)
  }
  if (alertPantry.length > 0) {
    const names = alertPantry
      .slice(0, 3)
      .map((p) => (p.emoji ? `${p.emoji} ` : '') + p.name)
      .join(', ')
    const more = alertPantry.length > 3 ? ` 외 ${alertPantry.length - 3}` : ''
    parts.push(`기한 ${alertPantry.length}건: ${names}${more}`)
  }

  return { body: parts.join('\n'), count: dueRoutines.length + alertPantry.length }
}

/** 오늘 주의가 필요한 생활 항목이 있으면 알림 예약 */
export function scheduleLifeReminders(routines: LifeRoutine[], pantryItems: PantryItem[]) {
  clearLifeAlarms()
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const today = todayISO()
  const { body, count } = buildBody(routines, pantryItems, today)
  if (count === 0) return

  const key = `life|${today}`
  const now = new Date()
  const fireAt = new Date(now)
  fireAt.setHours(9, 0, 0, 0)

  const delay = fireAt.getTime() - now.getTime()
  const run = () => {
    showLocalNotification('생활 알림', { body, tag: key })
    pendingAlarms.delete(key)
  }

  if (delay > 0) {
    pendingAlarms.set(key, setTimeout(run, delay))
  } else {
    pendingAlarms.set(key, setTimeout(run, 1500))
  }
}
