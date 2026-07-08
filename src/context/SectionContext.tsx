import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SectionId, TabId } from '../types'
import { getAppSettings, saveAppSettings } from '../db'
import { ALL_TABS, DEFAULT_APP_SETTINGS, getSectionsForTab } from '../config/sections'

interface SectionContextValue {
  enabledTabs: TabId[]
  enabledSections: SectionId[]
  isTabEnabled: (tab: TabId) => boolean
  isSectionEnabled: (section: SectionId) => boolean
  toggleTab: (tab: TabId) => void
  toggleSection: (section: SectionId) => void
  loading: boolean
}

const SectionContext = createContext<SectionContextValue | null>(null)

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

export function SectionProvider({ children }: { children: ReactNode }) {
  const [enabledTabs, setEnabledTabs] = useState<TabId[]>(DEFAULT_APP_SETTINGS.enabledTabs)
  const [enabledSections, setEnabledSections] = useState<SectionId[]>(DEFAULT_APP_SETTINGS.enabledSections)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    withTimeout(getAppSettings(), 8000, DEFAULT_APP_SETTINGS)
      .then((s) => {
        setEnabledTabs(s.enabledTabs)
        setEnabledSections(s.enabledSections)
      })
      .catch(() => {
        setEnabledTabs(DEFAULT_APP_SETTINGS.enabledTabs)
        setEnabledSections(DEFAULT_APP_SETTINGS.enabledSections)
      })
      .finally(() => setLoading(false))
  }, [])

  const persist = useCallback(async (tabs: TabId[], sections: SectionId[]) => {
    await saveAppSettings({ id: 'app-settings', enabledTabs: tabs, enabledSections: sections })
  }, [])

  const isTabEnabled = useCallback(
    (tab: TabId) => {
      const meta = ALL_TABS.find((t) => t.id === tab)
      if (meta?.alwaysOn) return true
      return enabledTabs.includes(tab)
    },
    [enabledTabs],
  )

  const isSectionEnabled = useCallback(
    (section: SectionId) => enabledSections.includes(section),
    [enabledSections],
  )

  const toggleTab = useCallback(
    (tab: TabId) => {
      const meta = ALL_TABS.find((t) => t.id === tab)
      if (meta?.alwaysOn) return
      setEnabledTabs((prev) => {
        const next = prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab]
        persist(next, enabledSections)
        return next
      })
    },
    [enabledSections, persist],
  )

  const toggleSection = useCallback(
    (section: SectionId) => {
      setEnabledSections((prev) => {
        const next = prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
        persist(enabledTabs, next)
        return next
      })
    },
    [enabledTabs, persist],
  )

  const value = useMemo(
    () => ({
      enabledTabs,
      enabledSections,
      isTabEnabled,
      isSectionEnabled,
      toggleTab,
      toggleSection,
      loading,
    }),
    [enabledTabs, enabledSections, isTabEnabled, isSectionEnabled, toggleTab, toggleSection, loading],
  )

  return <SectionContext.Provider value={value}>{children}</SectionContext.Provider>
}

export function useSections() {
  const ctx = useContext(SectionContext)
  if (!ctx) throw new Error('useSections must be used within SectionProvider')
  return ctx
}

export function useTabSections(tab: TabId) {
  const { isSectionEnabled } = useSections()
  const sections = getSectionsForTab(tab)
  return sections.filter((s) => isSectionEnabled(s.id))
}
