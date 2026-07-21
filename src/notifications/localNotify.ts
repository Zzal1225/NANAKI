/**
 * 포그라운드(로컬) Notification 채널.
 * 앱이 열려 있을 때만 동작. 백그라운드 푸시는 push/Provider 로 분리.
 * @see docs/NOTIFICATIONS.md
 */

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function canShowLocalNotification() {
  return 'Notification' in window && Notification.permission === 'granted'
}

/** 앱 포그라운드에서 OS 알림 표시 (보조 채널) */
export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (!canShowLocalNotification()) return null
  return new Notification(title, options)
}
