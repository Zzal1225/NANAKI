import type { ExpenseSearchStats, SearchResult } from '../types'
import {
  getAllArchiveItems,
  getAllBodyRecords,
  getAllBpRecords,
  getAllBudgetSettings,
  getAllExerciseRecords,
  getAllExpenses,
  getAllHabits,
  getAllHospitalRecords,
  getAllPeriodRecords,
  getAllSleepRecords,
  getAllSugarRecords,
} from '../db'
import { ARCHIVE_TYPE_LABELS, formatCurrency } from '../utils/dates'
import { SEARCH_TYPE_LABELS, SUGAR_TIMING_LABELS } from '../config/sections'

function matches(q: string, ...fields: (string | undefined)[]) {
  return fields.some((f) => f?.toLowerCase().includes(q))
}

export async function unifiedSearch(query: string): Promise<SearchResult[]> {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const results: SearchResult[] = []

  const [
    archives, expenses, budgetSettings, bodies, periods, bps, sugars, sleeps, hospitals,
    exercises, habits,
  ] = await Promise.all([
    getAllArchiveItems(),
    getAllExpenses(),
    getAllBudgetSettings(),
    getAllBodyRecords(),
    getAllPeriodRecords(),
    getAllBpRecords(),
    getAllSugarRecords(),
    getAllSleepRecords(),
    getAllHospitalRecords(),
    getAllExerciseRecords(),
    getAllHabits(),
  ])

  for (const item of archives) {
    if (matches(q, item.title, item.memo, item.location, ...item.tags)) {
      results.push({
        id: item.id,
        type: 'archive',
        title: item.title,
        subtitle: ARCHIVE_TYPE_LABELS[item.type],
        date: item.date,
        snippet: item.memo ?? item.tags.map((t) => `#${t}`).join(' '),
        path: '/archive',
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
        snippet: undefined,
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
    if (matches(q, r.memo, r.weight?.toString(), r.bodyFat?.toString())) {
      results.push({
        id: r.id,
        type: 'body',
        title: r.weight ? `체중 ${r.weight}kg` : '체형 기록',
        subtitle: r.inbody ? '인바디' : undefined,
        date: r.date,
        snippet: r.memo,
        path: '/mybody',
      })
    }
  }

  for (const p of periods) {
    if (matches(q, p.memo, '생리')) {
      results.push({
        id: p.id,
        type: 'period',
        title: '생리 기록',
        date: p.startDate,
        snippet: p.memo,
        path: '/mybody',
      })
    }
  }

  for (const r of bps) {
    if (matches(q, r.memo, `${r.systolic}/${r.diastolic}`, '혈압')) {
      results.push({
        id: r.id,
        type: 'bp',
        title: `혈압 ${r.systolic}/${r.diastolic}`,
        date: r.date,
        snippet: r.memo,
        path: '/mybody',
      })
    }
  }

  for (const r of sugars) {
    if (matches(q, r.memo, r.value.toString(), '혈당')) {
      results.push({
        id: r.id,
        type: 'sugar',
        title: `혈당 ${r.value}mg/dL`,
        subtitle: r.timing ? SUGAR_TIMING_LABELS[r.timing] : undefined,
        date: r.date,
        snippet: r.memo,
        path: '/mybody',
      })
    }
  }

  for (const r of sleeps) {
    if (matches(q, r.memo, `${r.hours}시간`, '수면')) {
      results.push({
        id: r.id,
        type: 'sleep',
        title: `수면 ${r.hours}시간`,
        date: r.date,
        snippet: r.memo,
        path: '/mybody',
      })
    }
  }

  for (const r of hospitals) {
    if (matches(q, r.hospital, r.treatment, r.result, r.memo, '병원', '알러지')) {
      results.push({
        id: r.id,
        type: 'hospital',
        title: r.hospital,
        subtitle: r.treatment,
        date: r.date,
        snippet: [r.result, r.memo].filter(Boolean).join(' · '),
        path: '/mybody',
      })
    }
  }

  for (const r of exercises) {
    if (matches(q, r.type, r.memo, '운동')) {
      results.push({
        id: r.id,
        type: 'exercise',
        title: r.type,
        subtitle: r.duration ? `${r.duration}분` : undefined,
        date: r.date,
        snippet: r.memo,
        path: '/fitness',
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

  return results.sort((a, b) => b.date.localeCompare(a.date))
}

function expenseMatches(q: string, e: { categoryName: string; subItem?: string; amount: number }) {
  return matches(q, e.categoryName, e.subItem, formatCurrency(e.amount))
}

export async function searchExpenseStats(query: string): Promise<ExpenseSearchStats | null> {
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

export { SEARCH_TYPE_LABELS }
