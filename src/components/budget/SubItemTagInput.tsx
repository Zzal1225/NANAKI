import { useId, useMemo, useRef, useState } from 'react'
import { filterSubItemTags } from '../../budget/subItemTags'
import { inputClass } from '../common/Modal'

interface SubItemTagInputProps {
  value: string
  onChange: (value: string) => void
  tags: string[]
  placeholder?: string
}

export default function SubItemTagInput({
  value,
  onChange,
  tags,
  placeholder = '예: 식재료',
}: SubItemTagInputProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const suggestions = useMemo(() => filterSubItemTags(tags, value), [tags, value])
  const showSuggestions = focused && suggestions.length > 0

  const pick = (tag: string) => {
    onChange(tag)
    setFocused(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          window.setTimeout(() => setFocused(false), 150)
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls={showSuggestions ? listId : undefined}
      />
      {showSuggestions && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-[110] max-h-40 overflow-y-auto rounded-xl border border-accent/25 bg-surface-overlay py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          {suggestions.map((tag) => (
            <li key={tag} role="option">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-raised"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(tag)}
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
