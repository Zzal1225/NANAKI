import { LOCAL_USER_ID } from '../config/user'
import type { UserOwned } from '../types'

type LegacyTimestamps = {
  userId?: UserOwned['userId']
  createdAt?: string
  updatedAt?: string
  _updatedAt?: string
}

export function ensureUserOwned<T extends object>(record: T & LegacyTimestamps): T & UserOwned {
  const now = new Date().toISOString()
  const updatedAt = record.updatedAt ?? record._updatedAt

  return {
    ...record,
    userId: record.userId ?? LOCAL_USER_ID,
    createdAt: record.createdAt ?? updatedAt ?? now,
    ...(updatedAt ? { updatedAt } : {}),
  }
}

export function stampUserOwned<T extends object>(
  record: T & LegacyTimestamps,
): T & UserOwned {
  return {
    ...ensureUserOwned(record),
    updatedAt: new Date().toISOString(),
  }
}

export type { UserOwnedInput } from '../types'
