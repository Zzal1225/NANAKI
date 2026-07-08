import { maxBudgetMonth } from '../utils/dates'

export function shiftBudgetMonth(month: string, delta: number, startMonth: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta)
  const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

  if (delta > 0 && next > maxBudgetMonth()) return null
  if (delta < 0 && next < startMonth) return null

  return next
}

export function canShiftBudgetMonth(month: string, delta: number, startMonth: string) {
  return shiftBudgetMonth(month, delta, startMonth) !== null
}
