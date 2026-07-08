import { useMemo, useState } from 'react';
import Calendar, {
  useCalendarState,
  type DayBadge,
} from '../components/common/Calendar';
import SegmentedControl from '../components/common/SegmentedControl';
import DayDetail from '../components/dashboard/DayDetail';
import HomeAnalyticsView from '../components/dashboard/HomeAnalyticsView';
import GlobalSearch from '../components/search/GlobalSearch';
import TimelineView from '../components/timeline/TimelineView';
import PageHeader from '../components/layout/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useSections } from '../context/SectionContext';
import { loadHomeAnalytics } from '../home/homeAnalytics';
import {
  getDaySummary,
  getPeriodContext,
  getAllBodyRecords,
  getAllArchiveItems,
  getExpensesByMonth,
  getHabitLogsInRange,
  getAllHabits,
  getAllExerciseRecords,
  getAllHospitalRecords,
} from '../db';

type HomeView = 'calendar' | 'analytics';

async function loadMonthBadges(
  year: number,
  month: number,
): Promise<Map<string, DayBadge>> {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const [
    expenses,
    bodyRecords,
    archiveItems,
    habitLogs,
    habits,
    exercises,
    hospitals,
  ] = await Promise.all([
    getExpensesByMonth(monthStr),
    getAllBodyRecords(),
    getAllArchiveItems(),
    getHabitLogsInRange(`${monthStr}-01`, `${monthStr}-31`),
    getAllHabits(),
    getAllExerciseRecords(),
    getAllHospitalRecords(),
  ]);

  const habitMap = new Map(habits.map((h) => [h.id, h]));
  const badges = new Map<string, DayBadge>();

  const ensure = (date: string) => {
    if (!badges.has(date)) badges.set(date, { date });
    return badges.get(date)!;
  };

  for (const e of expenses) {
    ensure(e.date).hasBudget = true;
  }
  for (const r of bodyRecords) {
    if (r.date.startsWith(monthStr)) ensure(r.date).hasBody = true;
  }
  for (const a of archiveItems) {
    if (a.date.startsWith(monthStr)) ensure(a.date).hasArchive = true;
  }
  for (const ex of exercises) {
    if (ex.date.startsWith(monthStr)) ensure(ex.date).hasFitness = true;
  }
  for (const h of hospitals) {
    if (h.date.startsWith(monthStr)) ensure(h.date).hasHealth = true;
  }
  for (const l of habitLogs) {
    if (l.completed) {
      const b = ensure(l.date);
      b.habitEmojis = b.habitEmojis ?? [];
      const emoji = habitMap.get(l.habitId)?.emoji ?? '✓';
      if (!b.habitEmojis.includes(emoji)) b.habitEmojis.push(emoji);
    }
  }

  return badges;
}

export default function HomePage() {
  const { isSectionEnabled, enabledSections } = useSections();
  const [view, setView] = useState<HomeView>('calendar');
  const { year, month, selectedDate, setSelectedDate, setMonthYear } =
    useCalendarState();

  const { data: badges, reload: reloadBadges } = useAsync(
    () => loadMonthBadges(year, month),
    [year, month],
  );
  const {
    data: daySummary,
    loading: dayLoading,
    reload: reloadDay,
  } = useAsync(
    () => (selectedDate ? getDaySummary(selectedDate) : Promise.resolve(null)),
    [selectedDate],
  );
  const showTimeline = enabledSections.includes('home-timeline');
  const { data: periodContext, loading: timelineLoading } = useAsync(
    () =>
      selectedDate && showTimeline
        ? getPeriodContext(selectedDate, 7)
        : Promise.resolve(null),
    [selectedDate, showTimeline],
  );
  const { data: analytics, loading: analyticsLoading } = useAsync(
    () => (view === 'analytics' ? loadHomeAnalytics() : Promise.resolve(null)),
    [view],
  );

  const badgeMap = useMemo(
    () => badges ?? new Map<string, DayBadge>(),
    [badges],
  );

  return (
    <div className='flex flex-col gap-5'>
      <PageHeader title="Nanaki" tab="home" />

      <SegmentedControl
        value={view}
        onChange={setView}
        options={[
          { value: 'calendar', label: '달력보기', icon: '📅' },
          { value: 'analytics', label: '분석보기', icon: '📊' },
        ]}
      />

      {view === 'calendar' ? (
        <div key="calendar" className="home-view-enter-left flex flex-col gap-5">
          {isSectionEnabled('home-search') && <GlobalSearch previewCount={3} />}

          {isSectionEnabled('home-calendar') && (
            <Calendar
              year={year}
              month={month}
              onMonthChange={(y, m) => {
                setMonthYear(y, m);
                reloadBadges();
                reloadDay();
              }}
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
            <p className="py-12 text-center text-sm text-text-muted">분석 데이터를 불러오는 중…</p>
          ) : (
            <HomeAnalyticsView
              data={analytics}
              showComparison={isSectionEnabled('home-comparison')}
            />
          )}
        </div>
      )}
    </div>
  );
}
