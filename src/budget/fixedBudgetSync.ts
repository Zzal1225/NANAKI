import { deleteExpense, getAllExpenses, saveExpense } from '../db'

import type { BudgetCategory, CategoryBudgetItem } from '../types'

import { fixedDayToDate } from '../utils/dates'

import { isRecurringVersionDefinition } from './recurringFixed'



function isBudgetLinkedRecurringMaster(expense: { id: string; recurringTemplateId?: string }) {

  return expense.recurringTemplateId === expense.id

}



/** 예산 세부항목에서 제거된 id와 연결된 고정지출 마스터 삭제 */

export async function purgeBudgetLinkedFixedExpenses(budgetItemIds: string[]) {

  if (!budgetItemIds.length) return

  const ids = new Set(budgetItemIds)

  const all = await getAllExpenses()

  for (const expense of all) {

    if (isRecurringVersionDefinition(expense) && isBudgetLinkedRecurringMaster(expense) && ids.has(expense.id)) {

      await deleteExpense(expense.id)

    }

  }

}



/** 예산의 고정 세부항목 → 반복 지출 마스터 동기화 */

export async function syncFixedBudgetExpenses(

  month: string,

  budgetItems: CategoryBudgetItem[],

  categories: BudgetCategory[],

) {

  const fixedItems = budgetItems.filter(

    (i) => !i.isCategoryTotal && i.isFixed && i.subItem?.trim() && i.amount > 0,

  )

  const fixedIds = new Set(fixedItems.map((i) => i.id))



  const all = await getAllExpenses()

  const budgetLinkedMasters = all.filter(

    (e) => isRecurringVersionDefinition(e) && isBudgetLinkedRecurringMaster(e) && budgetItems.some((bi) => bi.id === e.id),

  )



  for (const item of fixedItems) {

    const cat = categories.find((c) => c.id === item.categoryId)

    if (!cat) continue

    const day = item.fixedDay ?? 1

    const existing = all.find((e) => e.id === item.id)

    const startMonth = existing?.recurringStartMonth ?? month

    await saveExpense({

      id: item.id,

      date: fixedDayToDate(month, day),

      amount: item.amount,

      categoryId: cat.id,

      categoryName: cat.name,

      type: 'fixed',

      subItem: item.subItem!.trim(),

      fixedDay: day,

      recurringTemplateId: item.id,

      isRecurringMonthly: true,

      effectiveFrom: existing?.effectiveFrom ?? month,

      recurringStartMonth: startMonth,

    })

  }



  for (const master of budgetLinkedMasters) {

    if (!fixedIds.has(master.id)) {

      await deleteExpense(master.id)

    }

  }

}

