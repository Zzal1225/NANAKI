import { eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import type { SupplementIntakeLog, SupplementProduct } from '../types'
import { getActiveSupplements, scheduleKey } from './nutrients'

export type ExpectedDose = {
  productId: string
  productName: string
  date: string
  scheduleKey: string
  scheduleLabel: string
  alarmTime?: string
}

/**
 * 복용률 계산
 *
 * expected = 해당 월 각 날짜 × (그날 복용 중이던 제품의 schedule 슬롯 수 합)
 * completed = SupplementIntakeLog 중 completed=true 이고 해당 월·expected에 속하는 건수
 * rate = expected === 0 ? 0 : round(completed / expected * 100)
 *
 * 예) 이번 달 복용해야 하는 횟수 120회, 복용 완료 112회 → 93%
 */
export function calculateSupplementAdherence(
  products: SupplementProduct[],
  logs: SupplementIntakeLog[],
  month: string,
): { expected: number; completed: number; rate: number } {
  const expectedList = listExpectedDosesForMonth(products, month)
  const expected = expectedList.length
  if (expected === 0) return { expected: 0, completed: 0, rate: 0 }

  const completedKeys = new Set(
    logs
      .filter((l) => l.completed && l.date.startsWith(month))
      .map((l) => `${l.productId}|${l.date}|${l.scheduleKey}`),
  )

  const completed = expectedList.filter((e) =>
    completedKeys.has(`${e.productId}|${e.date}|${e.scheduleKey}`),
  ).length

  return {
    expected,
    completed,
    rate: Math.round((completed / expected) * 100),
  }
}

export function listExpectedDosesForMonth(products: SupplementProduct[], month: string): ExpectedDose[] {
  const start = startOfMonth(parseISO(`${month}-01`))
  const end = endOfMonth(start)
  const days = eachDayOfInterval({ start, end })
  const result: ExpectedDose[] = []

  for (const day of days) {
    const date = format(day, 'yyyy-MM-dd')
    const active = getActiveSupplements(products, date).filter((p) => {
      if (p.startedAt && p.startedAt > date) return false
      return true
    })
    for (const product of active) {
      product.schedule.forEach((slot, index) => {
        result.push({
          productId: product.id,
          productName: product.name,
          date,
          scheduleKey: scheduleKey(slot, index),
          scheduleLabel: `${slot.dayPart}/${slot.meal}`,
          alarmTime: slot.alarmTime,
        })
      })
    }
  }

  return result
}

export function listExpectedDosesForDate(
  products: SupplementProduct[],
  date: string,
): ExpectedDose[] {
  const active = getActiveSupplements(products, date).filter((p) => !p.startedAt || p.startedAt <= date)
  const result: ExpectedDose[] = []
  for (const product of active) {
    product.schedule.forEach((slot, index) => {
      result.push({
        productId: product.id,
        productName: product.name,
        date,
        scheduleKey: scheduleKey(slot, index),
        scheduleLabel: `${slot.dayPart}/${slot.meal}`,
        alarmTime: slot.alarmTime,
      })
    })
  }
  return result
}

export function isDoseCompleted(
  logs: SupplementIntakeLog[],
  productId: string,
  date: string,
  key: string,
): boolean {
  return logs.some(
    (l) => l.productId === productId && l.date === date && l.scheduleKey === key && l.completed,
  )
}
