import { NavLink, Outlet } from 'react-router-dom'
import { Home, Wallet, HeartPulse, BookMarked, CheckCircle2 } from 'lucide-react'
import { useSections } from '../../context/SectionContext'
import InstallPrompt from '../pwa/InstallPrompt'
import type { TabId } from '../../types'

const NAV_ITEMS: { to: string; tab: TabId; icon: typeof Home; label: string }[] = [
  { to: '/', tab: 'home', icon: Home, label: '홈' },
  { to: '/budget', tab: 'budget', icon: Wallet, label: '가계부' },
  { to: '/health', tab: 'health', icon: HeartPulse, label: '건강' },
  { to: '/records', tab: 'records', icon: BookMarked, label: '기록' },
  { to: '/habits', tab: 'habits', icon: CheckCircle2, label: '습관' },
]

export default function Layout() {
  const { isTabEnabled, loading } = useSections()
  const visibleNav = NAV_ITEMS.filter((item) => isTabEnabled(item.tab))

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-text-muted">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>
      {import.meta.env.PROD && <InstallPrompt />}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface-raised/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-around px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] transition-colors ${
                  isActive ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
