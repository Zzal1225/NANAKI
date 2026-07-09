import type {
  NutrientAmount,
  SupplementDayPart,
  SupplementMealRelation,
  SupplementProduct,
  SupplementSchedule,
} from '../types'

export const DAY_PART_LABELS: Record<SupplementDayPart, string> = {
  morning: '아침',
  noon: '점심',
  evening: '저녁',
  night: '취침전',
}

export const MEAL_LABELS: Record<SupplementMealRelation, string> = {
  before: '식전',
  after: '식후',
  with: '식중',
  anytime: '상관없음',
}

export function formatScheduleLabel(schedule: SupplementSchedule): string {
  const meal = schedule.meal === 'anytime' ? '' : ` ${MEAL_LABELS[schedule.meal]}`
  const alarm = schedule.alarmTime ? ` · ${schedule.alarmTime}` : ''
  return `${DAY_PART_LABELS[schedule.dayPart]}${meal}${alarm}`
}

export function scheduleKey(schedule: SupplementSchedule, index: number): string {
  return `${schedule.dayPart}:${schedule.meal}:${index}`
}

export function formatNutrient(n: NutrientAmount): string {
  return `${n.name} ${n.amount}${n.unit}`
}

export function nutrientKey(n: NutrientAmount): string {
  return `${n.name.trim().toLowerCase()}|${n.unit.trim().toLowerCase()}`
}

/** 복용 중인 제품만 (endedAt 없음 또는 오늘 이후) */
export function getActiveSupplements(products: SupplementProduct[], todayISO: string): SupplementProduct[] {
  return products.filter((p) => !p.endedAt || p.endedAt > todayISO)
}

/** 제품별 성분을 하나로 합산 + 출처 분해 */
export type AggregatedNutrient = {
  name: string
  amount: number
  unit: string
  sources: { productName: string; amount: number; unit: string }[]
}

export function aggregateNutrients(products: SupplementProduct[]): AggregatedNutrient[] {
  const map = new Map<string, AggregatedNutrient>()

  for (const product of products) {
    for (const n of product.nutrients) {
      const key = nutrientKey(n)
      const existing = map.get(key)
      if (existing) {
        existing.amount += n.amount
        existing.sources.push({ productName: product.name, amount: n.amount, unit: n.unit })
      } else {
        map.set(key, {
          name: n.name,
          amount: n.amount,
          unit: n.unit,
          sources: [{ productName: product.name, amount: n.amount, unit: n.unit }],
        })
      }
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export type NutrientPreviewChange =
  | { kind: 'increase'; name: string; unit: string; before: number; after: number; delta: number }
  | { kind: 'new'; name: string; unit: string; after: number }
  | { kind: 'unchanged'; name: string; unit: string; amount: number }

/** 추가 전후 성분 미리보기 — 변경분만 강조용 */
export function previewNutrientChanges(
  current: NutrientAmount[],
  adding: NutrientAmount[],
): NutrientPreviewChange[] {
  const beforeMap = new Map(current.map((n) => [nutrientKey(n), n]))
  const afterMap = new Map<string, NutrientAmount>()

  for (const n of current) {
    afterMap.set(nutrientKey(n), { ...n })
  }
  for (const n of adding) {
    const key = nutrientKey(n)
    const prev = afterMap.get(key)
    if (prev) {
      afterMap.set(key, { ...prev, amount: prev.amount + n.amount })
    } else {
      afterMap.set(key, { ...n })
    }
  }

  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()])
  const changes: NutrientPreviewChange[] = []

  for (const key of keys) {
    const before = beforeMap.get(key)
    const after = afterMap.get(key)!
    if (!before) {
      changes.push({ kind: 'new', name: after.name, unit: after.unit, after: after.amount })
    } else if (after.amount !== before.amount) {
      changes.push({
        kind: 'increase',
        name: after.name,
        unit: after.unit,
        before: before.amount,
        after: after.amount,
        delta: after.amount - before.amount,
      })
    } else {
      changes.push({ kind: 'unchanged', name: after.name, unit: after.unit, amount: after.amount })
    }
  }

  return changes.sort((a, b) => {
    const order = { new: 0, increase: 1, unchanged: 2 }
    return order[a.kind] - order[b.kind] || a.name.localeCompare(b.name, 'ko')
  })
}

export function searchProductsByQuery(products: SupplementProduct[], query: string): SupplementProduct[] {
  const q = query.trim().toLowerCase()
  if (!q) return products.slice(0, 20)
  return products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nutrients.some((n) => n.name.toLowerCase().includes(q)),
    )
    .slice(0, 20)
}
