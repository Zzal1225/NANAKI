import { FormField, inputClass } from '../common/Modal'

/** 섹션 헤더에 붙는 측정 주기(일) 인라인 편집 */
export function IntervalDaysField({
  days,
  disabled,
  onChange,
}: {
  days: number
  disabled?: boolean
  onChange: (days: number) => void
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-text-muted">
      <span className="shrink-0">주기</span>
      <input
        type="number"
        min={1}
        max={365}
        disabled={disabled}
        className="w-12 rounded-md border border-border bg-surface px-1.5 py-0.5 text-right text-xs tabular-nums text-text-primary"
        value={days}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (n >= 1) onChange(n)
        }}
      />
      <span>일</span>
    </label>
  )
}

export function DateField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <FormField label="날짜">
      <input
        type="date"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </FormField>
  )
}
