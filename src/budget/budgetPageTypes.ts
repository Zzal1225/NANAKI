import type { Expense, UserOwnedInput } from '../types'

export type SummaryView = 'total' | 'variable' | 'fixed' | 'orphan'

export type PendingFixedSave = {
  expense: UserOwnedInput<Expense>
  options: { viewMonth: string; previous?: Expense | null; isRecurringMonthly: boolean }
}

export function budgetSuggestDismissKey(month: string) {
  return `nanaki-budget-suggest-dismiss-${month}`
}
