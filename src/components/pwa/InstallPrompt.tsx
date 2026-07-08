import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isStandalone } from '../../pwa/register'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'nanaki-install-dismissed'

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    if (installed || dismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setDeferred(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [installed, dismissed])

  if (installed || dismissed || !deferred) return null

  const install = async () => {
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferred(null)
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4">
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-accent/40 bg-surface-raised p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent">
          <Download size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Nanaki 앱 설치</p>
          <p className="text-xs text-text-secondary">홈 화면에 추가하면 오프라인에서도 사용할 수 있습니다</p>
        </div>
        <button
          onClick={install}
          className="shrink-0 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-surface"
        >
          설치
        </button>
        <button onClick={dismiss} className="shrink-0 text-text-muted hover:text-text-primary">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
