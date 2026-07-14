import { NavLink, Outlet } from 'react-router-dom'
import { Home, Wallet, HeartPulse, BookMarked, CheckCircle2, ListTodo } from 'lucide-react'
import { useSections } from '../../context/SectionContext'
import InstallPrompt from '../pwa/InstallPrompt'
import { ALL_TABS, BOTTOM_NAV_TABS } from '../../config/sections'
import type { TabId } from '../../types'

const NAV_ICONS: Record<Exclude<TabId, 'home'>, typeof Home> = {
  budget: Wallet,
  health: HeartPulse,
  life: ListTodo,
  records: BookMarked,
  habits: CheckCircle2,
}

export default function Layout() {
  const { isTabEnabled, loading } = useSections()

  const visibleNav = BOTTOM_NAV_TABS.filter((tab) => isTabEnabled(tab)).map((tab) => {
    const meta = ALL_TABS.find((t) => t.id === tab)!
    return { to: meta.path, tab, icon: NAV_ICONS[tab], label: meta.label }
  })

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-text-muted">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-0">
        <Outlet />
      </main>
      {import.meta.env.PROD && <InstallPrompt />}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface-raised/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-around px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-xs transition-colors ${
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
