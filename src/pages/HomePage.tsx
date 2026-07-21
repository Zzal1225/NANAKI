import { useEffect, useMemo, useState } from 'react'
import Calendar, {
  useCalendarState,
  type DayBadge,
} from '../components/common/Calendar'
import SegmentedControl from '../components/common/SegmentedControl'
import DayDetail from '../components/dashboard/DayDetail'
import TodayTasksSection from '../components/dashboard/TodayTasksSection'
import HomeAnalyticsView from '../components/dashboard/HomeAnalyticsView'
import GlobalSearch from '../components/search/GlobalSearch'
import TimelineView from '../components/timeline/TimelineView'
import PageHeader from '../components/layout/PageHeader'
import MonthNav from '../components/layout/MonthNav'
import { useAsync } from '../hooks/useAsync'
import { useSections } from '../context/SectionContext'
import { loadHomeAnalytics } from '../home/homeAnalytics'
import {
  getDaySummary,
  getPeriodContext,
  getAllBodyRecords,
  getAllBodyPhotos,
  getAllArchiveItems,
  getExpensesByMonth,
  getHabitLogsInRange,
  getAllHabits,
  getAllLifeRoutines,
  getAllPantryItems,
  getAllSupplementProducts,
  getSupplementIntakeLogsByDate,
  getAppSettings,
} from '../db'
import { getHomeDataStartMonth } from '../utils/dataStartMonth'
import { maxNavigableMonth, todayISO } from '../utils/dates'
import { collectTodayTasks } from '../notifications'

type HomeView = 'calendar' | 'analytics'

function monthFromYearMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function parseYearMonth(monthStr: string): { year: number; month: number } {
  const [y, m] = monthStr.split('-').map(Number)
  return { year: y, month: m }
}

async function loadTodayTasks() {
  const today = todayISO()
  const [bodyRecords, bodyPhotos, settings, products, intakeLogs, routines, pantryItems] =
    await Promise.all([
      getAllBodyRecords(),
      getAllBodyPhotos(),
      getAppSettings(),
      getAllSupplementProducts(),
      getSupplementIntakeLogsByDate(today),
      getAllLifeRoutines(),
      getAllPantryItems(),
    ])

  return collectTodayTasks({
    today,
    bodyRecords,
    bodyPhotos,
    bodySectionIntervals: settings.bodySectionIntervals,
    products,
    intakeLogs,
    routines,
    pantryItems,
  })
}

async function loadMonthBadges(
  year: number,
  month: number,
): Promise<Map<string, DayBadge>> {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const [
    expenses,
    bodyRecords,
    bodyPhotos,
    archiveItems,
    habitLogs,
    habits,
    lifeRoutines,
    pantryItems,
  ] = await Promise.all([
    getExpensesByMonth(monthStr),
    getAllBodyRecords(),
    getAllBodyPhotos(),
    getAllArchiveItems(),
    getHabitLogsInRange(`${monthStr}-01`, `${monthStr}-31`),
    getAllHabits(),
    getAllLifeRoutines(),
    getAllPantryItems(),
  ])

  const habitMap = new Map(habits.map((h) => [h.id, h]))
  const badges = new Map<string, DayBadge>()

  const ensure = (date: string) => {
    if (!badges.has(date)) badges.set(date, { date })
    return badges.get(date)!
  }

  for (const e of expenses) {
    ensure(e.date).hasBudget = true
  }
  for (const r of bodyRecords) {
    if (r.date.startsWith(monthStr)) ensure(r.date).hasBody = true
  }
  for (const p of bodyPhotos) {
    if (p.date.startsWith(monthStr)) ensure(p.date).hasBodyPhoto = true
  }
  for (const a of archiveItems) {
    if (a.date.startsWith(monthStr)) ensure(a.date).hasArchive = true
  }
  for (const l of habitLogs) {
    if (l.completed) {
      const b = ensure(l.date)
      b.habitEmojis = b.habitEmojis ?? []
      const emoji = habitMap.get(l.habitId)?.emoji ?? '✓'
      if (!b.habitEmojis.includes(emoji)) b.habitEmojis.push(emoji)
    }
  }
  for (const r of lifeRoutines) {
    if (r.nextDueAt.startsWith(monthStr)) ensure(r.nextDueAt).hasLifeRoutine = true
  }
  for (const p of pantryItems) {
    if (p.expiresAt.startsWith(monthStr)) ensure(p.expiresAt).hasPantryExpiry = true
  }

  return badges
}

export default function HomePage() {
  const { isSectionEnabled, enabledSections } = useSections()
  const [view, setView] = useState<HomeView>('calendar')
  const { year, month, selectedDate, setSelectedDate, setMonthYear } =
    useCalendarState()
  const monthStr = monthFromYearMonth(year, month)
  const maxMonth = maxNavigableMonth()
  const { data: startMonth } = useAsync(() => getHomeDataStartMonth(), [])

  useEffect(() => {
    if (startMonth && monthStr < startMonth) {
      const { year: y, month: m } = parseYearMonth(startMonth)
      setMonthYear(y, m)
    }
  }, [startMonth, monthStr, setMonthYear])

  useEffect(() => {
    if (monthStr > maxMonth) {
      const { year: y, month: m } = parseYearMonth(maxMonth)
      setMonthYear(y, m)
    }
  }, [monthStr, maxMonth, setMonthYear])

  const { data: badges, reload: reloadBadges } = useAsync(
    () => loadMonthBadges(year, month),
    [year, month],
  )
  const {
    data: daySummary,
    loading: dayLoading,
    reload: reloadDay,
  } = useAsync(
    () => (selectedDate ? getDaySummary(selectedDate) : Promise.resolve(null)),
    [selectedDate],
  )
  const showTimeline = enabledSections.includes('home-timeline')
  const { data: periodContext, loading: timelineLoading } = useAsync(
    () =>
      selectedDate && showTimeline
        ? getPeriodContext(selectedDate, 7)
        : Promise.resolve(null),
    [selectedDate, showTimeline],
  )
  const { data: analytics, loading: analyticsLoading } = useAsync(
    () => (view === 'analytics' ? loadHomeAnalytics() : Promise.resolve(null)),
    [view],
  )
  const {
    data: todayTasks,
    loading: todayTasksLoading,
    reload: reloadTodayTasks,
  } = useAsync(() => loadTodayTasks(), [])

  const badgeMap = useMemo(
    () => badges ?? new Map<string, DayBadge>(),
    [badges],
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="홈"
        tab="home"
        hideSearch
        hideAdd
        below={
          <SegmentedControl
            compact
            value={view}
            onChange={setView}
            options={[
              { value: 'calendar', label: '달력', icon: '📅' },
              { value: 'analytics', label: '분석', icon: '📊' },
            ]}
          />
        }
      >
        <MonthNav
          month={monthStr}
          minMonth={startMonth ?? undefined}
          maxMonth={maxMonth}
          onChange={(next) => {
            if (startMonth && next < startMonth) return
            if (next > maxMonth) return
            const { year: y, month: m } = parseYearMonth(next)
            setMonthYear(y, m)
            reloadBadges()
            reloadDay()
            reloadTodayTasks()
          }}
        />
      </PageHeader>

      {view === 'calendar' ? (
        <div key="calendar" className="home-view-enter-left flex flex-col gap-5">
          <TodayTasksSection tasks={todayTasks ?? []} loading={todayTasksLoading} />

          {isSectionEnabled('home-search') && <GlobalSearch previewCount={3} />}

          {isSectionEnabled('home-calendar') && (
            <Calendar
              year={year}
              month={month}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              badges={badgeMap}
            />
          )}

          <DayDetail summary={daySummary} loading={dayLoading} />

          {isSectionEnabled('home-timeline') && selectedDate && (
            <TimelineView context={periodContext} loading={timelineLoading} />
          )}
        </div>
      ) : (
        <div key="analytics" className="home-view-enter flex flex-col gap-5">
          {analyticsLoading || !analytics ? (
            <p className="py-12 text-center text-sm text-text-muted">
              분석 데이터를 불러오는 중…
            </p>
          ) : (
            <HomeAnalyticsView
              data={analytics}
              showComparison={isSectionEnabled('home-comparison')}
            />
          )}
        </div>
      )}
    </div>
  )
}
