import type { CategoryBudgetItem } from '../types'

/** 총 예산 대비 고정·변동 예산 분리 (UI·집계 공용) */
export function calculateFixedVariableBudget(
  totalBudget: number,
  budgetItems: CategoryBudgetItem[] | undefined,
  fixedSpent: number,
) {
  const fixedBudgetFromItems = (budgetItems ?? [])
    .filter((item) => !item.isCategoryTotal && item.isFixed && item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0)
  const fixedBudget = fixedBudgetFromItems > 0 ? fixedBudgetFromItems : fixedSpent
  const variableBudget = Math.max(0, totalBudget - fixedBudget)

  return { fixedBudget, variableBudget }
}
