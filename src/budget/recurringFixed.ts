import { generateId, getAllExpenses, removeExpenseById, saveExpense } from '../db'
import type { UserOwnedInput } from '../types'
import type { Expense } from '../types'
import { fixedDayToDate } from '../utils/dates'

export const VIRTUAL_EXPENSE_SEP = '__'

export function getExpenseEffectiveFrom(expense: Expense): string {
  return expense.effectiveFrom ?? expense.date.slice(0, 7)
}

/** DB에 저장된 반복 고정지출 버전 정의 (월별 가상 레코드 제외) */
export function isRecurringVersionDefinition(expense: Expense): boolean {
  return expense.type === 'fixed' && !!expense.isRecurringMonthly && !expense.id.includes(VIRTUAL_EXPENSE_SEP)
}

export function isLegacyRecurringMaster(expense: Expense): boolean {
  return expense.type === 'fixed' && expense.recurringTemplateId === expense.id
}

export function getTemplateStartMonth(versions: Expense[]): string {
  const starts = versions.map((v) => v.recurringStartMonth ?? getExpenseEffectiveFrom(v))
  return starts.sort()[0] ?? ''
}

export function getTemplateEndMonth(versions: Expense[]): string | undefined {
  const ends = versions.map((v) => v.recurringEndMonth).filter(Boolean) as string[]
  if (!ends.length) return undefined
  return ends.sort().reverse()[0]
}

export function isRecurringActiveForMonth(versions: Expense[], month: string): boolean {
  if (!versions.length) return false
  const start = getTemplateStartMonth(versions)
  const end = getTemplateEndMonth(versions)
  if (month < start) return false
  if (end && month > end) return false
  return true
}

export function isRecurringCheckboxChecked(
  expense: UserOwnedInput<Expense> | Expense,
  viewMonth: string,
  all: Expense[],
): boolean {
  if (!expense.isRecurringMonthly || !expense.recurringTemplateId) return false
  const versions = all.filter(
    (e) => isRecurringVersionDefinition(e) && e.recurringTemplateId === expense.recurringTemplateId,
  )
  if (!versions.length) return false
  if (!isRecurringActiveForMonth(versions, viewMonth)) return false
  const end = getTemplateEndMonth(versions)
  return !(end && end === viewMonth)
}

export function pickRecurringVersionForMonth(versions: Expense[], month: string): Expense | null {
  const applicable = versions.filter((v) => getExpenseEffectiveFrom(v) <= month)
  if (!applicable.length) return null
  return applicable.sort((a, b) =>
    getExpenseEffectiveFrom(b).localeCompare(getExpenseEffectiveFrom(a)),
  )[0]
}

export function groupRecurringVersions(all: Expense[]): Map<string, Expense[]> {
  const groups = new Map<string, Expense[]>()
  for (const expense of all) {
    if (!isRecurringVersionDefinition(expense) || !expense.recurringTemplateId) continue
    const list = groups.get(expense.recurringTemplateId) ?? []
    list.push(expense)
    groups.set(expense.recurringTemplateId, list)
  }
  return groups
}

export function materializeRecurringExpense(version: Expense, month: string): Expense {
  const day = version.fixedDay ?? (parseInt(version.date.slice(8), 10) || 1)
  return {
    ...version,
    id: `${version.id}${VIRTUAL_EXPENSE_SEP}${month}`,
    date: fixedDayToDate(month, day),
  }
}

export function appendRecurringExpenses(all: Expense[], physical: Expense[], month: string): Expense[] {
  const groups = groupRecurringVersions(all)
  const virtual: Expense[] = []

  for (const [templateId, versions] of groups) {
    if (!isRecurringActiveForMonth(versions, month)) continue

    const version = pickRecurringVersionForMonth(versions, month)
    if (!version) continue

    const hasInMonth = physical.some(
      (e) =>
        e.id === version.id ||
        e.id === `${version.id}${VIRTUAL_EXPENSE_SEP}${month}` ||
        (e.recurringTemplateId === templateId &&
          getMonthFromDate(e.date) === month &&
          !e.isRecurringMonthly),
    )
    if (!hasInMonth) {
      virtual.push(materializeRecurringExpense(version, month))
    }
  }

  return [...physical, ...virtual]
}

function getMonthFromDate(date: string) {
  return date.slice(0, 7)
}

export function findRecurringVersionForMonth(all: Expense[], expense: Expense, month: string): Expense {
  const templateId = expense.recurringTemplateId ?? expense.id
  const versions = all.filter(
    (e) => isRecurringVersionDefinition(e) && e.recurringTemplateId === templateId,
  )
  if (!versions.length) return expense
  return pickRecurringVersionForMonth(versions, month) ?? expense
}

function getPreviousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function resolveExpenseViewMonth(id: string, fallbackMonth: string): string {
  const idx = id.indexOf(VIRTUAL_EXPENSE_SEP)
  if (idx === -1) return fallbackMonth
  return id.slice(idx + VIRTUAL_EXPENSE_SEP.length)
}

/** 반복 고정지출은 viewMonth부터만 삭제하고, 이전 달 기록은 유지 */
export async function deleteExpenseInMonth(id: string, viewMonth: string) {
  const masterId = id.includes(VIRTUAL_EXPENSE_SEP) ? id.slice(0, id.indexOf(VIRTUAL_EXPENSE_SEP)) : id
  const all = await getAllExpenses()
  const target = all.find((e) => e.id === masterId)

  if (target?.isRecurringMonthly && target.recurringTemplateId) {
    const templateId = target.recurringTemplateId
    const versions = all.filter(
      (e) => isRecurringVersionDefinition(e) && e.recurringTemplateId === templateId,
    )
    const startMonth = getTemplateStartMonth(versions)
    const endMonth = getPreviousMonth(viewMonth)

    if (!startMonth || endMonth < startMonth) {
      for (const version of versions) {
        await removeExpenseById(version.id)
      }
      return
    }

    for (const version of versions) {
      await saveExpense({ ...version, recurringEndMonth: endMonth })
    }
    return
  }

  await removeExpenseById(masterId)
}

async function getTemplateVersions(templateId: string) {
  const all = await getAllExpenses()
  return all.filter(
    (e) => isRecurringVersionDefinition(e) && e.recurringTemplateId === templateId,
  )
}

async function setTemplateEndMonth(templateId: string, endMonth: string) {
  const versions = await getTemplateVersions(templateId)
  for (const version of versions) {
    await saveExpense({ ...version, recurringEndMonth: endMonth })
  }
}

async function clearTemplateEndMonth(templateId: string) {
  const versions = await getTemplateVersions(templateId)
  for (const version of versions) {
    const { recurringEndMonth: _end, ...rest } = version
    await saveExpense(rest)
  }
}

export async function saveFixedExpense(
  draft: UserOwnedInput<Expense>,
  options: {
    viewMonth: string
    previous?: Expense | null
    isRecurringMonthly: boolean
  },
) {
  const { viewMonth, previous, isRecurringMonthly } = options
  const day = Math.min(31, Math.max(1, draft.fixedDay ?? 1))

  if (!isRecurringMonthly) {
    if (previous?.isRecurringMonthly && previous.recurringTemplateId) {
      const templateId = previous.recurringTemplateId
      const versions = await getTemplateVersions(templateId)
      const activeVersion = pickRecurringVersionForMonth(versions, viewMonth) ?? previous
      await setTemplateEndMonth(templateId, viewMonth)
      const from = getExpenseEffectiveFrom(activeVersion)
      await saveExpense({
        ...activeVersion,
        ...draft,
        id: activeVersion.id,
        fixedDay: day,
        recurringTemplateId: templateId,
        isRecurringMonthly: true,
        effectiveFrom: activeVersion.effectiveFrom ?? from,
        recurringStartMonth: activeVersion.recurringStartMonth ?? getTemplateStartMonth(versions),
        recurringEndMonth: viewMonth,
        date: fixedDayToDate(from, day),
      })
      return
    }

    await saveExpense({
      ...draft,
      id: previous?.id ?? draft.id,
      fixedDay: day,
      date: fixedDayToDate(viewMonth, day),
      isRecurringMonthly: false,
      recurringTemplateId: undefined,
      effectiveFrom: undefined,
      recurringStartMonth: undefined,
      recurringEndMonth: undefined,
    })
    return
  }

  const templateId = previous?.recurringTemplateId ?? draft.recurringTemplateId ?? draft.id
  const wasRecurring = !!previous?.isRecurringMonthly && !!previous.recurringTemplateId
  const amountChanged = !!previous && previous.amount !== draft.amount

  if (wasRecurring && amountChanged) {
    const versions = await getTemplateVersions(templateId)
    const startMonth = getTemplateStartMonth(versions) || viewMonth
    await clearTemplateEndMonth(templateId)
    await saveExpense({
      ...draft,
      id: generateId(),
      fixedDay: day,
      recurringTemplateId: templateId,
      isRecurringMonthly: true,
      effectiveFrom: viewMonth,
      recurringStartMonth: startMonth,
      date: fixedDayToDate(viewMonth, day),
    })
    return
  }

  if (wasRecurring && previous) {
    const versions = await getTemplateVersions(templateId)
    const startMonth = getTemplateStartMonth(versions) || getExpenseEffectiveFrom(previous)
    const from = getExpenseEffectiveFrom(previous)
    await clearTemplateEndMonth(templateId)
    await saveExpense({
      ...draft,
      id: previous.id,
      fixedDay: day,
      recurringTemplateId: templateId,
      isRecurringMonthly: true,
      effectiveFrom: previous.effectiveFrom ?? from,
      recurringStartMonth: startMonth,
      date: fixedDayToDate(from, day),
    })
    return
  }

  if (previous && !previous.isRecurringMonthly) {
    await removeExpenseById(previous.id)
  }

  await saveExpense({
    ...draft,
    id: draft.id,
    fixedDay: day,
    recurringTemplateId: templateId,
    isRecurringMonthly: true,
    effectiveFrom: viewMonth,
    recurringStartMonth: viewMonth,
    date: fixedDayToDate(viewMonth, day),
  })
}
