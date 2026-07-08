let applyingRemote = false
let mutationListener: (() => void) | null = null

export function isApplyingRemote() {
  return applyingRemote
}

export function runApplyingRemote<T>(fn: () => Promise<T>): Promise<T> {
  applyingRemote = true
  return fn().finally(() => {
    applyingRemote = false
  })
}

export function onLocalMutation(listener: () => void) {
  mutationListener = listener
  return () => {
    mutationListener = null
  }
}

export function notifyLocalMutation() {
  mutationListener?.()
}

export function stampRecord<T extends Record<string, unknown>>(record: T): T & { _updatedAt: string } {
  return { ...record, _updatedAt: new Date().toISOString() }
}
