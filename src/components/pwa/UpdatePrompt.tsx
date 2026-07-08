import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { applyPendingUpdate, getPendingUpdate, subscribeUpdateAvailable } from '../../pwa/updatePrompt'

export default function UpdatePrompt() {
  const [updateFn, setUpdateFn] = useState<(() => void | Promise<void>) | null>(null)

  useEffect(() => {
    const handleUpdate = (fn: () => void | Promise<void>) => {
      setUpdateFn(() => () => {
        void applyPendingUpdate(fn)
      })
    }

    const pending = getPendingUpdate()
    if (pending) handleUpdate(pending)

    const unsubscribe = subscribeUpdateAvailable(handleUpdate)

    const onNeedRefresh = (event: Event) => {
      const fn = (event as CustomEvent<{ updateSW?: () => void | Promise<void> }>).detail?.updateSW
      if (fn) handleUpdate(fn)
    }

    window.addEventListener('nanaki-need-refresh', onNeedRefresh)

    return () => {
      unsubscribe()
      window.removeEventListener('nanaki-need-refresh', onNeedRefresh)
    }
  }, [])

  if (!updateFn) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] border-b border-accent/50 bg-surface-raised px-4 py-2.5 shadow-lg backdrop-blur-lg pt-[max(0.625rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent/25 text-accent">
            <RefreshCw size={14} />
          </span>
          새 버전 사용 가능
        </span>
        <button
          type="button"
          onClick={updateFn}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-surface hover:bg-accent-dim"
        >
          <RefreshCw size={12} /> 업데이트
        </button>
      </div>
    </div>
  )
}
