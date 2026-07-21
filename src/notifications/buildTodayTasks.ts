import type { TodayTask, TodayTasksInput } from './types'

/**
 * 도메인 데이터 → 오늘 할 일 목록.
 * 로컬 대시보드와 추후 푸시 페이로드가 동일 입력을 쓰도록 채널과 분리한다.
 */
export function buildTodayTasks(input: TodayTasksInput): TodayTask[] {
  const tasks: TodayTask[] = []

  for (const label of input.body.dueMetricLabels) {
    tasks.push({
      id: `body:${label}`,
      kind: 'body',
      label,
      done: input.body.doneLabels.has(label),
      href: '/health',
    })
  }

  for (const s of input.supplements) {
    tasks.push({
      id: `supplement:${s.id}`,
      kind: 'supplement',
      label: s.label,
      done: s.done,
      href: '/health/supplements',
    })
  }

  for (const r of input.routines) {
    if (!r.due && !r.doneToday) continue
    tasks.push({
      id: `life-routine:${r.id}`,
      kind: 'life-routine',
      label: r.name,
      done: r.doneToday,
      href: '/life',
    })
  }

  for (const p of input.pantry) {
    tasks.push({
      id: `pantry:${p.id}`,
      kind: 'pantry',
      label: `${p.name} ${p.statusLabel}`,
      done: false,
      href: '/life',
    })
  }

  return tasks
}
