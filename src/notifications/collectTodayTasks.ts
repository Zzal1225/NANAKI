import type {
  BodyPhotoRecord,
  BodyRecord,
  BodySectionKey,
  LifeRoutine,
  PantryItem,
  SupplementIntakeLog,
  SupplementProduct,
} from '../types'
import { formatScheduleLabel, scheduleKey } from '../supplements/nutrients'
import { listExpectedDosesForDate, isDoseCompleted } from '../supplements/adherence'
import { getPantryStatus, daysUntilExpiry } from '../life/pantryStatus'
import { BODY_SECTION_LABELS } from '../body/sectionConfig'
import { getDueBodySections } from '../body/sectionReminders'
import { buildTodayTasks } from './buildTodayTasks'
import type { TodayTask, TodayTasksInput } from './types'

export type LoadTodayTasksParams = {
  today: string
  bodyRecords: BodyRecord[]
  bodyPhotos: BodyPhotoRecord[]
  bodySectionIntervals?: Partial<Record<BodySectionKey, number>>
  products: SupplementProduct[]
  intakeLogs: SupplementIntakeLog[]
  routines: LifeRoutine[]
  pantryItems: PantryItem[]
}

/** DB에서 읽은 레코드로 오늘 할 일 입력 구성 후 목록 생성 */
export function collectTodayTasks(params: LoadTodayTasksParams): TodayTask[] {
  const dueSections = getDueBodySections({
    today: params.today,
    records: params.bodyRecords,
    photos: params.bodyPhotos,
    intervals: params.bodySectionIntervals,
  })

  const dueMetricLabels: string[] = []
  const doneLabels = new Set<string>()
  for (const s of dueSections) {
    const label = BODY_SECTION_LABELS[s.key]
    dueMetricLabels.push(label)
    if (s.doneToday) doneLabels.add(label)
  }

  const doses = listExpectedDosesForDate(params.products, params.today)
  const supplements = doses.map((d) => {
    const product = params.products.find((p) => p.id === d.productId)
    const slotIndex =
      product?.schedule.findIndex((_, i) => scheduleKey(product.schedule[i], i) === d.scheduleKey) ??
      -1
    const slot = product && slotIndex >= 0 ? product.schedule[slotIndex] : null
    const slotLabel = slot ? formatScheduleLabel(slot) : d.scheduleLabel
    return {
      id: `${d.productId}|${d.scheduleKey}`,
      label: `${d.productName} · ${slotLabel}`,
      done: isDoseCompleted(params.intakeLogs, d.productId, params.today, d.scheduleKey),
    }
  })

  const routines = params.routines.map((r) => ({
    id: r.id,
    name: r.name,
    due: r.nextDueAt <= params.today,
    doneToday: r.lastDoneAt === params.today,
  }))

  const pantry = params.pantryItems
    .map((p) => {
      const status = getPantryStatus(p.expiresAt, params.today)
      if (status === 'fresh') return null
      const days = daysUntilExpiry(p.expiresAt, params.today)
      const statusLabel =
        days === 0 ? '유통기한 오늘' : status === 'expired' ? '폐기 필요' : '유통기한 임박'
      return { id: p.id, name: p.name, statusLabel }
    })
    .filter((p): p is NonNullable<typeof p> => p != null)

  const input: TodayTasksInput = {
    today: params.today,
    body: { dueMetricLabels, doneLabels },
    supplements,
    routines,
    pantry,
  }

  return buildTodayTasks(input)
}
