interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
  /** 헤더용 컴팩트 */
  compact?: boolean
}

export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = '',
  compact = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`flex rounded-full border border-border bg-surface-raised ${
        compact ? 'p-0.5' : 'p-1'
      } ${className}`}
      role="tablist"
    >
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-center gap-1 rounded-full font-medium transition-all ${
              compact
                ? 'px-2.5 py-1.5 text-xs'
                : 'flex-1 gap-1.5 px-3 py-2 text-sm'
            } ${
              active
                ? 'bg-accent text-surface shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {option.icon && (
              <span className={`leading-none ${compact ? 'text-sm' : 'text-base'}`}>{option.icon}</span>
            )}
            <span className={compact ? 'whitespace-nowrap' : undefined}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
