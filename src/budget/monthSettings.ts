import { getAllBudgetSettings, getAppSettings, getBudgetSettings, saveAppSettings, saveBudgetSettings, generateId } from '../db'
import type { BudgetCategory, BudgetSettings, CategoryBudgetItem, UserOwnedInput } from '../types'
import { DEFAULT_CATEGORIES, DEFAULT_ENABLED_CATEGORY_NAMES, formatCurrency, resolveLegacyCategoryName } from '../utils/dates'

export const DEFAULT_CATEGORY_BUDGET = 0
export const BUDGET_UNSET_LABEL = '예산 미설정'

export function getPreviousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 이전 달 예산 설정 (없으면 null) */
export async function getPreviousMonthBudgetSettings(month: string): Promise<BudgetSettings | null> {
  return getBudgetSettings(getPreviousMonth(month))
}

export function hasConfiguredCategoryBudget(settings: BudgetSettings): boolean {
  return (settings.budgetItems ?? []).some((i) => i.isCategoryTotal && i.amount > 0)
}

/** 이전 달 카테고리 예산·활성 목록을 현재 월에 복사 */
export async function copyBudgetFromPreviousMonth(month: string): Promise<boolean> {
  const prev = await getPreviousMonthBudgetSettings(month)
  if (!prev || !hasConfiguredCategoryBudget(prev)) return false

  const settings = await ensureBudgetSettingsForMonth(month)
  const categories = mergeProvidedCategories(settings.categories)
  const enabled = resolveEnabledCategoryIds(prev, categories)
  const prevItems = prev.budgetItems ?? []

  const budgetItems: CategoryBudgetItem[] = enabled.map((categoryId) => {
    const prevTotal = prevItems.find((i) => i.categoryId === categoryId && i.isCategoryTotal)
    const existingTotal = settings.budgetItems?.find(
      (i) => i.categoryId === categoryId && i.isCategoryTotal,
    )
    return {
      id: existingTotal?.id ?? generateId(),
      categoryId,
      amount: prevTotal?.amount ?? 0,
      isCategoryTotal: true,
    }
  })

  await saveMonthCategoryBudget(month, budgetItems, enabled)
  return true
}

export function createDefaultBudgetItems(
  enabledCategoryIds: string[],
): CategoryBudgetItem[] {
  return enabledCategoryIds.map((categoryId) => ({
    id: generateId(),
    categoryId,
    amount: DEFAULT_CATEGORY_BUDGET,
    isCategoryTotal: true,
  }))
}
function createDefaultCategories(): BudgetCategory[] {
  return DEFAULT_CATEGORIES.map((c) => ({
    id: crypto.randomUUID(),
    name: c.name,
  }))
}

export function activeBudgetItems(items: CategoryBudgetItem[] | undefined): CategoryBudgetItem[] {
  return (items ?? []).filter((i) => i.amount > 0)
}

function categoryBudgetAmount(catItems: CategoryBudgetItem[]): number {
  const totalLine = catItems.find((i) => i.isCategoryTotal)
  if (totalLine) return totalLine.amount
  return catItems.filter((i) => !i.isCategoryTotal).reduce((s, i) => s + i.amount, 0)
}

export function totalFromBudgetItems(items: CategoryBudgetItem[] | undefined): number {
  const active = activeBudgetItems(items)
  const byCategory = new Map<string, CategoryBudgetItem[]>()
  for (const item of active) {
    const list = byCategory.get(item.categoryId) ?? []
    list.push(item)
    byCategory.set(item.categoryId, list)
  }
  let total = 0
  for (const catItems of byCategory.values()) {
    total += categoryBudgetAmount(catItems)
  }
  return total
}

export function getManualCategoryBudget(
  items: CategoryBudgetItem[] | undefined,
  categoryId: string,
): number {
  return (items ?? []).find((i) => i.categoryId === categoryId && i.isCategoryTotal)?.amount ?? 0
}

export function getCategoryBudgetTotal(items: CategoryBudgetItem[] | undefined, categoryId: string): number {
  return getManualCategoryBudget(items, categoryId)
}

export function isCategoryBudgetUnset(items: CategoryBudgetItem[] | undefined, categoryId: string): boolean {
  return getManualCategoryBudget(items, categoryId) <= 0
}

export function formatBudgetLabel(amount: number): string {
  return amount > 0 ? formatCurrency(amount) : BUDGET_UNSET_LABEL
}

export function getCategoryBudgetItems(items: CategoryBudgetItem[] | undefined, categoryId: string) {
  return activeBudgetItems(items).filter((i) => i.categoryId === categoryId && !i.isCategoryTotal)
}

/** 예산 항목이 있는 카테고리만 반환 */
export function getCategoriesWithBudget(
  categories: BudgetCategory[],
  budgetItems: CategoryBudgetItem[] | undefined,
): BudgetCategory[] {
  const ids = new Set(activeBudgetItems(budgetItems).map((i) => i.categoryId))
  return categories.filter((c) => ids.has(c.id))
}

export { createDefaultCategories }

/** 앱에서 제공하는 고정 카테고리 목록 */
export const PROVIDED_CATEGORY_NAMES = DEFAULT_CATEGORIES.map((c) => c.name)

export function mergeProvidedCategories(existing: BudgetCategory[]): BudgetCategory[] {
  return DEFAULT_CATEGORIES.map(({ name }) => {
    const found = existing.find(
      (c) => c.name === name || resolveLegacyCategoryName(c.name) === name,
    )
    return found ? { id: found.id, name } : { id: crypto.randomUUID(), name }
  })
}

export function getDefaultEnabledCategoryIds(categories: BudgetCategory[]): string[] {
  return DEFAULT_ENABLED_CATEGORY_NAMES.map(
    (name) => categories.find((c) => c.name === name)?.id,
  ).filter((id): id is string => !!id)
}

/** 예전 categoryId → 현재 전역 카테고리 id (이름 기준) */
export function remapEnabledCategoryIds(
  enabledIds: string[] | undefined,
  oldCategories: BudgetCategory[],
  globalCats: BudgetCategory[],
): string[] {
  if (!enabledIds?.length) return []

  const globalIdByName = new Map(globalCats.map((c) => [c.name, c.id]))
  const oldNameById = new Map(oldCategories.map((c) => [c.id, c.name]))
  const globalIds = new Set(globalCats.map((c) => c.id))
  const remapped: string[] = []

  for (const id of enabledIds) {
    if (globalIds.has(id)) {
      remapped.push(id)
      continue
    }
    const name = oldNameById.get(id)
    const next = name ? globalIdByName.get(name) : undefined
    if (next) remapped.push(next)
  }

  return [...new Set(remapped)]
}

export function resolveEnabledCategoryIds(
  settings: BudgetSettings,
  categories: BudgetCategory[],
): string[] {
  const remapped = remapEnabledCategoryIds(
    settings.enabledCategoryIds,
    settings.categories,
    categories,
  )
  if (remapped.length) return remapped

  const fromBudget = getCategoriesWithBudget(categories, settings.budgetItems).map((c) => c.id)
  if (fromBudget.length) return fromBudget
  return getDefaultEnabledCategoryIds(categories)
}

/** 세부항목·레거시 예산 → 카테고리별 isCategoryTotal 한 줄로 통합 */
export function compactBudgetItemsToCategoryTotals(
  items: CategoryBudgetItem[],
  globalCats: BudgetCategory[],
  oldCategories: BudgetCategory[] = globalCats,
): { items: CategoryBudgetItem[]; removedIds: string[] } {
  const normalized = normalizeBudgetItems(items, oldCategories, globalCats)
  const removedIds: string[] = []
  const byCategory = new Map<string, CategoryBudgetItem[]>()

  for (const item of normalized) {
    if (!item.isCategoryTotal) removedIds.push(item.id)
    const list = byCategory.get(item.categoryId) ?? []
    list.push(item)
    byCategory.set(item.categoryId, list)
  }

  const compacted: CategoryBudgetItem[] = []
  for (const [categoryId, catItems] of byCategory) {
    const totalLine = catItems.find((i) => i.isCategoryTotal)
    const amount = categoryBudgetAmount(catItems)
    if (amount < 0) continue
    if (amount === 0 && !totalLine) continue

    compacted.push({
      id: totalLine?.id ?? generateId(),
      categoryId,
      amount,
      isCategoryTotal: true,
    })
  }

  return { items: compacted, removedIds }
}

/** 활성 카테고리마다 isCategoryTotal 예산 보장, 비활성 카테고리 예산 제거 */
export function ensureEnabledCategoryBudgets(
  budgetItems: CategoryBudgetItem[],
  enabledCategoryIds: string[],
): CategoryBudgetItem[] {
  const enabledSet = new Set(enabledCategoryIds)
  const totals = budgetItems.filter((i) => i.isCategoryTotal && enabledSet.has(i.categoryId))
  const byCategory = new Map(totals.map((i) => [i.categoryId, i]))
  const result: CategoryBudgetItem[] = []

  for (const categoryId of enabledCategoryIds) {
    const existing = byCategory.get(categoryId)
    if (existing) {
      result.push(existing)
    } else {
      result.push({
        id: generateId(),
        categoryId,
        amount: DEFAULT_CATEGORY_BUDGET,
        isCategoryTotal: true,
      })
    }
  }

  return result
}

/** 활성 카테고리 (기본 제공 순서) */
export function getEnabledCategories(
  categories: BudgetCategory[],
  settings: BudgetSettings,
): BudgetCategory[] {
  const enabledIds = new Set(resolveEnabledCategoryIds(settings, categories))
  return mergeProvidedCategories(categories).filter((c) => enabledIds.has(c.id))
}

export function collectSubItems(budgetItems: CategoryBudgetItem[] | undefined): string[] {
  const names = new Set<string>()
  for (const item of budgetItems ?? []) {
    if (!item.isCategoryTotal && item.subItem?.trim()) names.add(item.subItem.trim())
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export function getSubItemsForCategory(
  budgetItems: CategoryBudgetItem[] | undefined,
  categoryId: string,
): string[] {
  return getCategoryBudgetItems(budgetItems, categoryId)
    .map((i) => i.subItem?.trim())
    .filter((s): s is string => !!s)
}

function stripLegacyCategory(raw: Record<string, unknown>): BudgetCategory {
  return {
    id: String(raw.id),
    name: String(raw.name),
  }
}

function migrateBudgetItems(settings: BudgetSettings): BudgetSettings {
  if (settings.budgetItems?.length) {
    return { ...settings, budgetItems: settings.budgetItems ?? [] }
  }
  const items: CategoryBudgetItem[] = []
  for (const c of settings.categories) {
    const raw = c as BudgetCategory & { budgetAmount?: number; budgetMemo?: string }
    if (raw.budgetAmount && raw.budgetAmount > 0) {
      items.push({
        id: crypto.randomUUID(),
        categoryId: c.id,
        amount: raw.budgetAmount,
        subItem: raw.budgetMemo?.trim() || c.name,
      })
    }
  }
  return { ...settings, budgetItems: items }
}

function normalizeBudgetItem(item: CategoryBudgetItem & { memo?: string }): CategoryBudgetItem {
  const subItem = item.subItem?.trim() || item.memo?.trim()
  const { memo: _memo, ...rest } = item
  return subItem ? { ...rest, subItem } : rest
}

function normalizeBudgetItems(
  items: CategoryBudgetItem[],
  oldCategories: BudgetCategory[],
  globalCats: BudgetCategory[],
): CategoryBudgetItem[] {
  const oldNameById = new Map(oldCategories.map((c) => [c.id, c.name]))
  const globalIdByName = new Map(globalCats.map((c) => [c.name, c.id]))

  return items.map((raw) => {
    const item = normalizeBudgetItem(raw as CategoryBudgetItem & { memo?: string })
    const oldName = oldNameById.get(item.categoryId)
    const resolvedName =
      oldName ??
      globalCats.find((c) => c.id === item.categoryId)?.name ??
      globalCats.find((c) => globalIdByName.get(c.name) === item.categoryId)?.name
    const categoryId =
      (resolvedName && globalIdByName.get(resolvedName)) ??
      (globalCats.some((c) => c.id === item.categoryId) ? item.categoryId : globalCats[0]?.id ?? item.categoryId)

    if (item.isCategoryTotal) {
      return { ...item, categoryId }
    }

    return {
      ...item,
      categoryId,
      subItem: item.subItem?.trim() || resolvedName || '항목 없음',
    }
  })
}

/** 모든 달에 공유되는 가계부 카테고리 (없으면 기본값 생성) */
export async function getGlobalCategories(): Promise<BudgetCategory[]> {
  const app = await getAppSettings()
  const sources: BudgetCategory[] = [...(app.budgetCategories ?? [])]

  if (app.fixedCategories?.length) {
    for (const c of app.fixedCategories) {
      sources.push(stripLegacyCategory(c as unknown as Record<string, unknown>))
    }
  }

  const allSettings = await getAllBudgetSettings()
  for (const s of allSettings) {
    sources.push(...s.categories.map((c) => stripLegacyCategory(c as unknown as Record<string, unknown>)))
  }

  const merged = mergeProvidedCategories(sources)
  const changed =
    !app.budgetCategories?.length ||
    app.budgetCategories.length !== merged.length ||
    merged.some((c, i) => app.budgetCategories![i]?.id !== c.id || app.budgetCategories![i]?.name !== c.name)

  if (changed) {
    await saveAppSettings({ ...app, budgetCategories: merged })
  }
  return merged
}

export async function saveGlobalCategories(categories: BudgetCategory[]) {
  const app = await getAppSettings()
  await saveAppSettings({ ...app, budgetCategories: categories })
}

export async function ensureBudgetSettingsForMonth(month: string): Promise<BudgetSettings> {
  const globalCats = await getGlobalCategories()
  const all = await getAllBudgetSettings()
  let settings = all.find((s) => s.month === month)

  if (!settings) {
    const enabledCategoryIds = getDefaultEnabledCategoryIds(globalCats)
    const budgetItems = createDefaultBudgetItems(enabledCategoryIds)
    const draft: UserOwnedInput<BudgetSettings> = {
      id: generateId(),
      month,
      totalBudget: totalFromBudgetItems(budgetItems),
      categories: globalCats,
      budgetItems,
      enabledCategoryIds,
    }
    await saveBudgetSettings(draft)
    return (await getBudgetSettings(month))!
  }

  settings = migrateBudgetItems(settings)
  const oldCategories = settings.categories
  const compacted = compactBudgetItemsToCategoryTotals(
    settings.budgetItems ?? [],
    globalCats,
    oldCategories,
  )
  if (compacted.removedIds.length) {
    const { purgeBudgetLinkedFixedExpenses } = await import('./fixedBudgetSync')
    await purgeBudgetLinkedFixedExpenses(compacted.removedIds)
  }

  let enabledCategoryIds = resolveEnabledCategoryIds(
    { ...settings, budgetItems: compacted.items },
    globalCats,
  )
  if (enabledCategoryIds.length === 0) {
    enabledCategoryIds = getDefaultEnabledCategoryIds(globalCats)
  }

  let budgetItems = ensureEnabledCategoryBudgets(compacted.items, enabledCategoryIds)
  if (budgetItems.length === 0) {
    budgetItems = createDefaultBudgetItems(enabledCategoryIds)
  }

  settings = {
    ...settings,
    categories: globalCats,
    budgetItems,
    totalBudget: totalFromBudgetItems(budgetItems),
    enabledCategoryIds,
  }
  await saveBudgetSettings(settings)
  return settings
}

export async function saveMonthCategories(_month: string, categories: BudgetCategory[]) {
  await saveGlobalCategories(categories)
}

export async function saveMonthBudgetItems(month: string, budgetItems: CategoryBudgetItem[]) {
  const settings = await ensureBudgetSettingsForMonth(month)
  await saveBudgetSettings({ ...settings, budgetItems })
}

export async function saveMonthCategoryBudget(
  month: string,
  budgetItems: CategoryBudgetItem[],
  enabledCategoryIds: string[],
) {
  const settings = await ensureBudgetSettingsForMonth(month)
  const categories = mergeProvidedCategories(settings.categories)
  await saveGlobalCategories(categories)
  const normalized = normalizeBudgetItems(budgetItems, settings.categories, categories)
  const compacted = compactBudgetItemsToCategoryTotals(normalized, categories, settings.categories)
  const validEnabled = enabledCategoryIds.filter((id) => categories.some((c) => c.id === id))
  const enabled =
    validEnabled.length ? validEnabled : getDefaultEnabledCategoryIds(categories)
  const finalItems = ensureEnabledCategoryBudgets(compacted.items, enabled)
  await saveBudgetSettings({
    ...settings,
    categories,
    budgetItems: finalItems,
    totalBudget: totalFromBudgetItems(finalItems),
    enabledCategoryIds: enabled,
  })
  const { syncFixedBudgetExpenses, purgeBudgetLinkedFixedExpenses } = await import('./fixedBudgetSync')
  await syncFixedBudgetExpenses(month, finalItems, categories)
  await purgeBudgetLinkedFixedExpenses(compacted.removedIds)
  return finalItems
}