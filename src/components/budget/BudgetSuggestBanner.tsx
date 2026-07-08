import { btnPrimary, btnSecondary } from '../common/Modal'
import { formatMonth } from '../../utils/format'

type BudgetSuggestBannerProps = {
  prevMonth: string
  applying: boolean
  onApply: () => void
  onDismiss: () => void
}

export default function BudgetSuggestBanner({
  prevMonth,
  applying,
  onApply,
  onDismiss,
}: BudgetSuggestBannerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-4">
      <p className="text-sm leading-relaxed text-text-primary">
        {formatMonth(prevMonth)} 예산을 그대로 가져올까요?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={applying}
          onClick={onApply}
          className={`${btnPrimary} flex-1 py-2.5 text-sm`}
        >
          {applying ? '가져오는 중…' : '가져오기'}
        </button>
        <button
          type="button"
          disabled={applying}
          onClick={onDismiss}
          className={`${btnSecondary} flex-1 py-2.5 text-sm`}
        >
          나중에
        </button>
      </div>
    </div>
  )
}
