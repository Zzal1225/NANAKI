/**
 * 영양제 알람 (MVP · 로컬 보조 채널)
 * - 주 채널: 홈「오늘 할 일」— docs/NOTIFICATIONS.md
 * - 앱이 열려 있을 때만 alarmTime 기준 setTimeout + Notification
 * - 백그라운드 푸시는 src/notifications/push (추후 FCM)
 */

import type { SupplementProduct } from '../types'
import { getActiveSupplements, formatScheduleLabel, scheduleKey } from './nutrients'
import { todayISO } from '../utils/dates'
import {
  ensureNotificationPermission,
  showLocalNotification,
} from '../notifications/localNotify'

export { ensureNotificationPermission }

type AlarmHandle = ReturnType<typeof setTimeout>

const pendingAlarms = new Map<string, AlarmHandle>()

export function clearSupplementAlarms() {
  for (const handle of pendingAlarms.values()) clearTimeout(handle)
  pendingAlarms.clear()
}

/** 오늘 복용 슬롯 중 아직 지나지 않은 alarmTime에 알림 예약 */
export function scheduleTodayAlarms(products: SupplementProduct[]) {
  clearSupplementAlarms()
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const today = todayISO()
  const now = new Date()
  const active = getActiveSupplements(products, today)

  for (const product of active) {
    product.schedule.forEach((slot, index) => {
      if (!slot.alarmTime) return
      const [hh, mm] = slot.alarmTime.split(':').map(Number)
      if (Number.isNaN(hh) || Number.isNaN(mm)) return

      const fireAt = new Date(now)
      fireAt.setHours(hh, mm, 0, 0)
      const delay = fireAt.getTime() - now.getTime()
      if (delay <= 0) return

      const key = `${product.id}|${scheduleKey(slot, index)}`
      const handle = setTimeout(() => {
        showLocalNotification('영양제 복용', {
          body: `${product.name} · ${formatScheduleLabel(slot)}`,
          tag: key,
        })
        pendingAlarms.delete(key)
      }, delay)
      pendingAlarms.set(key, handle)
    })
  }
}
