import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface-raised p-4 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-sm font-semibold text-text-secondary ${className}`}>{children}</h3>
}

export function StatCard({
  label,
  value,
  sub,
  emptyText,
  color = 'text-accent',
  valueClassName = 'text-xl font-bold',
  onClick,
}: {
  label: string
  value?: string
  sub?: string
  emptyText?: string
  color?: string
  /** 금액 등 value 글자 크기 · 기본 text-xl */
  valueClassName?: string
  onClick?: () => void
}) {
  return (
    <Card className="flex flex-col gap-1" onClick={onClick}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-text-muted">{label}</span>
        {onClick && <ChevronRight size={14} className="shrink-0 text-text-muted" />}
      </div>
      {emptyText ? (
        <span className="text-sm leading-snug text-text-muted">{emptyText}</span>
      ) : (
        <span className={`tabular-nums ${valueClassName} ${color}`}>{value}</span>
      )}
      {sub && <span className="text-xs text-text-secondary">{sub}</span>}
    </Card>
  )
}
