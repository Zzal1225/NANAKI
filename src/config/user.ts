/** Phase 1–4: 단일 로컬 사용자. Phase 5+ Supabase auth user id로 교체 */
export const LOCAL_USER_ID = 'local-user' as const

export type LocalUserId = typeof LOCAL_USER_ID

/** Supabase 연동 이후 실제 사용자 UUID */
export type UserId = LocalUserId | (string & {})
