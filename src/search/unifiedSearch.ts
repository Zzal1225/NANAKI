import type { SearchResult } from '../types'
import {
  getAllArchiveItems,
  getAllBodyPhotos,
  getAllBodyRecords,
  getAllBudgetSettings,
  getAllExpenses,
  getAllHabits,
  getAllLifeRoutines,
  getAllPantryItems,
  getAllSupplementProducts,
} from '../db'
import { formatIntervalLabel } from '../life/nextDue'
import {
  daysUntilExpiry,
  formatRemainingDays,
  getPantryStatus,
  PANTRY_STATUS_META,
} from '../life/pantryStatus'
import { ROUTINE_GROUP_LABELS } from '../life/templates'
import { formatCurrency } from '../utils/dates'
import { ARCHIVE_TYPE_LABELS } from '../utils/dates'
import { SEARCH_TYPE_LABELS } from '../config/sections'
import { formatCurrency as formatMoney } from '../utils/format'

function matches(q: string, ...fields: (string | undefined)[]) {
  return fields.some((f) => f?.toLowerCase().includes(q))
}

export async function unifiedSearch(query: string): Promise<SearchResult[]> {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const results: SearchResult[] = []

  const [
    archives,
    expenses,
    budgetSettings,
    bodies,
    bodyPhotos,
    habits,
    supplements,
    lifeRoutines,
    pantryItems,
  ] = await Promise.all([
    getAllArchiveItems(),
    getAllExpenses(),
    getAllBudgetSettings(),
    getAllBodyRecords(),
    getAllBodyPhotos(),
    getAllHabits(),
    getAllSupplementProducts(),
    getAllLifeRoutines(),
    getAllPantryItems(),
  ])

  for (const item of archives) {
    if (matches(q, item.title, item.memo, item.location, ...item.tags)) {
      results.push({
        id: item.id,
        type: 'records',
        title: item.title,
        subtitle: ARCHIVE_TYPE_LABELS[item.type],
        date: item.date,
        snippet: item.memo ?? item.tags.map((t) => `#${t}`).join(' '),
        path: '/records',
      })
    }
  }

  for (const e of expenses) {
    if (expenseMatches(q, e)) {
      const title = e.subItem?.trim() || e.categoryName
      results.push({
        id: e.id,
        type: 'expense',
        title,
        subtitle: [e.categoryName, formatCurrency(e.amount)].filter(Boolean).join(' · '),
        date: e.date,
        path: '/budget',
      })
    }
  }

  const seenBudgetSubItems = new Set<string>()
  for (const settings of budgetSettings) {
    for (const item of settings.budgetItems ?? []) {
      if (item.isCategoryTotal || !item.subItem?.trim()) continue
      const catName = settings.categories.find((c) => c.id === item.categoryId)?.name ?? '예산'
      const key = `${catName}|${item.subItem}`
      if (seenBudgetSubItems.has(key)) continue
      if (matches(q, item.subItem, catName)) {
        seenBudgetSubItems.add(key)
        results.push({
          id: `budget-${item.id}`,
          type: 'expense',
          title: item.subItem,
          subtitle: `${catName} · 예산 ${formatCurrency(item.amount)}`,
          date: `${settings.month}-01`,
          snippet: '예산 세부항목',
          path: '/budget',
        })
      }
    }
  }

  for (const r of bodies) {
    if (
      matches(
        q,
        r.weight?.toString(),
        r.bodyFat?.toString(),
        r.measurements?.waist?.toString(),
        '체형',
        '체중',
        '건강',
      )
    ) {
      results.push({
        id: r.id,
        type: 'body',
        title: r.weight ? `체중 ${r.weight}kg` : '체형 기록',
        date: r.date,
        path: '/health',
      })
    }
  }

  for (const p of bodyPhotos) {
    if (matches(q, '눈바디', '사진', '체형', '건강')) {
      results.push({
        id: p.id,
        type: 'bodyPhoto',
        title: '눈바디',
        date: p.date,
        path: '/health',
      })
    }
  }

  for (const s of supplements) {
    const nutrientNames = s.nutrients.map((n) => n.name)
    const stores = (s.purchaseHistory ?? []).map((h) => h.store).filter(Boolean) as string[]
    const prices = (s.purchaseHistory ?? []).map((h) => String(h.price))
    if (
      matches(q, s.name, ...nutrientNames, ...stores, ...prices, '영양제', '건강')
    ) {
      const lastPurchase = [...(s.purchaseHistory ?? [])].sort((a, b) =>
        b.date.localeCompare(a.date),
      )[0]
      results.push({
        id: s.id,
        type: 'supplement',
        title: s.name,
        subtitle: lastPurchase
          ? `${formatMoney(lastPurchase.price)}${lastPurchase.store ? ` · ${lastPurchase.store}` : ''}`
          : s.endedAt
            ? '복용 종료'
            : '복용중',
        date: lastPurchase?.date ?? s.startedAt ?? s.createdAt.slice(0, 10),
        path: '/health/supplements',
      })
    }
  }

  for (const h of habits) {
    if (matches(q, h.name)) {
      results.push({
        id: h.id,
        type: 'habit',
        title: h.name,
        subtitle: h.type === 'good' ? '좋은 습관' : '나쁜 습관',
        date: h.createdAt.slice(0, 10),
        path: '/habits',
      })
    }
  }

  for (const r of lifeRoutines) {
    if (matches(q, r.name, r.notes, ROUTINE_GROUP_LABELS[r.group], '반복', '생활')) {
      results.push({
        id: r.id,
        type: 'life',
        title: r.name,
        subtitle: `${ROUTINE_GROUP_LABELS[r.group]} · ${formatIntervalLabel(r.intervalDays)} · 다음 ${r.nextDueAt}`,
        date: r.nextDueAt,
        path: '/life',
      })
    }
  }

  for (const p of pantryItems) {
    if (matches(q, p.name, p.emoji, p.unit, '냉장고', '유통기한', '생활')) {
      const status = getPantryStatus(p.expiresAt)
      const meta = PANTRY_STATUS_META[status]
      const days = daysUntilExpiry(p.expiresAt)
      results.push({
        id: p.id,
        type: 'life',
        title: `${p.emoji ? `${p.emoji} ` : ''}${p.name}`,
        subtitle: `${formatRemainingDays(days)} · ${meta.emoji} ${meta.label}`,
        date: p.expiresAt,
        path: '/life',
      })
    }
  }

  return results.sort((a, b) => b.date.localeCompare(a.date))
}

function expenseMatches(q: string, e: { categoryName: string; subItem?: string; amount: number }) {
  return matches(q, e.categoryName, e.subItem, formatCurrency(e.amount))
}

export { SEARCH_TYPE_LABELS }

export async function searchExpenseStats(query: string): Promise<import('../types').ExpenseSearchStats | null> {
  const q = query.toLowerCase().trim()
  if (!q) return null

  const expenses = await getAllExpenses()
  const matched = expenses.filter((e) => expenseMatches(q, e))
  if (matched.length === 0) return null

  const byYearMap = new Map<string, { count: number; amount: number }>()
  for (const e of matched) {
    const year = e.date.slice(0, 4)
    const cur = byYearMap.get(year) ?? { count: 0, amount: 0 }
    byYearMap.set(year, { count: cur.count + 1, amount: cur.amount + e.amount })
  }

  const byYear = [...byYearMap.entries()]
    .map(([year, data]) => ({ year, ...data }))
    .sort((a, b) => b.year.localeCompare(a.year))

  return {
    query,
    totalCount: matched.length,
    totalAmount: matched.reduce((s, e) => s + e.amount, 0),
    byYear,
  }
}
