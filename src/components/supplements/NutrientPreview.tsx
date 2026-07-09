import type { NutrientPreviewChange } from '../../supplements/nutrients'

type NutrientPreviewProps = {
  changes: NutrientPreviewChange[]
}

export default function NutrientPreview({ changes }: NutrientPreviewProps) {
  if (changes.length === 0) {
    return <p className="text-sm text-text-muted">성분을 입력하면 미리보기가 표시됩니다.</p>
  }

  const highlighted = changes.filter((c) => c.kind !== 'unchanged')
  const unchanged = changes.filter((c) => c.kind === 'unchanged')

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-overlay/50 p-3 text-sm">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-text-muted">현재</p>
        <ul className="flex flex-col gap-0.5">
          {changes
            .filter((c) => c.kind !== 'new')
            .map((c) => {
              const amount = c.kind === 'increase' ? c.before : c.kind === 'unchanged' ? c.amount : 0
              return (
                <li key={`before-${c.name}-${c.unit}`} className="text-text-secondary">
                  {c.name} {amount}
                  {c.unit}
                </li>
              )
            })}
          {changes.every((c) => c.kind === 'new') && (
            <li className="text-text-muted">복용 중인 성분 없음</li>
          )}
        </ul>
      </div>

      <div className="border-t border-border" />

      <div>
        <p className="mb-1.5 text-xs font-semibold text-text-muted">추가 후</p>
        <ul className="flex flex-col gap-1">
          {highlighted.map((c) => {
            if (c.kind === 'new') {
              return (
                <li key={`after-${c.name}`} className="font-semibold text-accent">
                  {c.name} {c.after}
                  {c.unit}
                  <span className="ml-1 text-xs font-normal">(신규)</span>
                </li>
              )
            }
            if (c.kind === 'increase') {
              return (
                <li key={`after-${c.name}`} className="font-semibold text-accent">
                  {c.name} {c.after}
                  {c.unit}
                  <span className="ml-1 text-xs font-normal">
                    (+{c.delta}
                    {c.unit})
                  </span>
                </li>
              )
            }
            return null
          })}
          {unchanged.map((c) => (
            <li key={`after-u-${c.name}`} className="text-text-muted">
              {c.name} {c.amount}
              {c.unit}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
