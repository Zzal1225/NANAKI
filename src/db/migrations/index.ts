import {
  compactBudgetItemsToCategoryTotals,
  ensureEnabledCategoryBudgets,
  createDefaultBudgetItems,
  getDefaultEnabledCategoryIds,
  getGlobalCategories,
  resolveEnabledCategoryIds,
  totalFromBudgetItems,
} from '../../budget/monthSettings'
import { purgeBudgetLinkedFixedExpenses } from '../../budget/fixedBudgetSync'
import { getAllBudgetSettings, getAppSettings, saveAppSettings, saveBudgetSettings } from '../index'

/** AppSettings.schemaVersion — 새 마이그레이션 추가 시 증가 */
export const CURRENT_SCHEMA_VERSION = 1

async function migrateV1_budgetModernModel() {
  const globalCats = await getGlobalCategories()
  const allMonths = await getAllBudgetSettings()
  const allRemovedIds: string[] = []

  for (const settings of allMonths) {
    const oldCategories = settings.categories
    const compacted = compactBudgetItemsToCategoryTotals(
      settings.budgetItems ?? [],
      globalCats,
      oldCategories,
    )
    allRemovedIds.push(...compacted.removedIds)

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

    await saveBudgetSettings({
      ...settings,
      categories: globalCats,
      budgetItems,
      enabledCategoryIds,
      totalBudget: totalFromBudgetItems(budgetItems),
    })
  }

  await purgeBudgetLinkedFixedExpenses(allRemovedIds)
}

const MIGRATIONS: Record<number, () => Promise<void>> = {
  1: migrateV1_budgetModernModel,
}

/** 앱 시작 시 한 번 실행 — schemaVersion 기준 순차 마이그레이션 */
export async function runMigrations() {
  const app = await getAppSettings()
  let version = app.schemaVersion ?? 0

  while (version < CURRENT_SCHEMA_VERSION) {
    const next = version + 1
    const run = MIGRATIONS[next]
    if (run) await run()
    version = next
  }

  if (version !== (app.schemaVersion ?? 0)) {
    await saveAppSettings({ ...app, schemaVersion: version })
  }
}
