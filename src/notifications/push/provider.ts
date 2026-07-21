/**
 * 추후 FCM Web Push용 채널 인터페이스.
 * 1차: Noop만 — 로그인·동기화 이후 FcmPushProvider 교체.
 * @see docs/ARCHITECTURE.md §4 · docs/DECISIONS.md
 */

export type PushSubscriptionInfo = {
  endpoint: string
  keys?: Record<string, string>
}

export interface PushProvider {
  /** 브라우저·플랫폼에서 Web Push 가능 여부 */
  isSupported(): boolean
  /** 권한·구독 (서버 등록은 구현체 책임) */
  subscribe(): Promise<PushSubscriptionInfo | null>
  unsubscribe(): Promise<void>
}

/** 1차: 푸시 미사용 */
export class NoopPushProvider implements PushProvider {
  isSupported() {
    return false
  }

  async subscribe() {
    return null
  }

  async unsubscribe() {}
}

let activeProvider: PushProvider = new NoopPushProvider()

export function getPushProvider() {
  return activeProvider
}

/** 추후 FcmPushProvider 등으로 교체 */
export function setPushProvider(provider: PushProvider) {
  activeProvider = provider
}
