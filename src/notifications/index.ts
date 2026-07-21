/**
 * 알림 · 오늘 할 일
 * - 1차: 로컬 대시보드 + 포그라운드 Notification
 * - 추후: push/Provider 에 FCM 추가
 * @see docs/NOTIFICATIONS.md
 */

export type { TodayTask, TodayTaskKind, TodayTasksInput } from './types'
export { buildTodayTasks } from './buildTodayTasks'
export { collectTodayTasks, type LoadTodayTasksParams } from './collectTodayTasks'
export {
  ensureNotificationPermission,
  canShowLocalNotification,
  showLocalNotification,
} from './localNotify'
export {
  getPushProvider,
  setPushProvider,
  NoopPushProvider,
  type PushProvider,
  type PushSubscriptionInfo,
} from './push/provider'
