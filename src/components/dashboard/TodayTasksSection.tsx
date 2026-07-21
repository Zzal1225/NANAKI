import { Link } from 'react-router-dom'
import { Card } from '../common/Card'
import type { TodayTask } from '../../notifications'
import { CheckSquare, Square } from 'lucide-react'

type TodayTasksSectionProps = {
  tasks: TodayTask[]
  loading?: boolean
}

export default function TodayTasksSection({ tasks, loading }: TodayTasksSectionProps) {
  if (loading) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-primary">오늘 할 일</h2>
        <p className="text-xs text-text-muted">불러오는 중…</p>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-text-primary">오늘 할 일</h2>
        <p className="text-xs text-text-muted">오늘은 예정된 할 일이 없어요.</p>
      </Card>
    )
  }

  const remaining = tasks.filter((t) => !t.done).length

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-primary">오늘 할 일</h2>
        <span className="text-[10px] tabular-nums text-text-muted">
          {remaining > 0 ? `${remaining}건 남음` : '모두 완료'}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              to={task.href}
              className={`flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-surface-overlay ${
                task.done ? 'text-text-muted line-through' : 'text-text-primary'
              }`}
            >
              {task.done ? (
                <CheckSquare size={16} className="shrink-0 text-success" aria-hidden />
              ) : (
                <Square size={16} className="shrink-0 text-text-muted" aria-hidden />
              )}
              <span className="min-w-0 truncate">{task.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
