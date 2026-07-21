import type { UserId } from '../config/user'

export type { UserId, LocalUserId } from '../config/user'
export { LOCAL_USER_ID } from '../config/user'

export type ExpenseType = 'fixed' | 'variable'

/** Supabase RLS·동기화를 염두에 둔 공통 소유권 필드 */
export interface UserOwned {
  userId: UserId
  createdAt: string
  updatedAt?: string
}

/** 저장 API 입력 — userId/타임스탬프는 DB 레이어에서 채움 */
export type UserOwnedInput<T extends UserOwned> = Omit<T, 'userId' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<T, 'userId' | 'createdAt' | 'updatedAt'>>

export interface BudgetCategory {
  id: string
  name: string
}

export interface CategoryBudgetItem {
  id: string
  categoryId: string
  amount: number
  /** 카테고리 하위 세부항목명 */
  subItem?: string
  /** 카테고리 전체 예산 (세부항목과 별도) */
  isCategoryTotal?: boolean
  /** 고정지출 세부항목 — 매월 자동 반영 */
  isFixed?: boolean
  /** 고정지출일 (1–31) */
  fixedDay?: number
}

export interface BudgetSettings extends UserOwned {
  id: string
  month: string
  totalBudget: number
  categories: BudgetCategory[]
  budgetItems: CategoryBudgetItem[]
  /** 사용자가 선택한 활성 카테고리 ID */
  enabledCategoryIds?: string[]
  /** 무소비로 표시한 날짜 (YYYY-MM-DD) — 해당 월 누적 일수 */
  noSpendDates?: string[]
}

export interface Expense extends UserOwned {
  id: string
  date: string
  amount: number
  categoryId: string
  categoryName: string
  type: ExpenseType
  /** 카테고리 하위 세부항목명 */
  subItem?: string
  /** 고정지출 반복 템플릿 ID (버전 그룹) */
  recurringTemplateId?: string
  /** 고정지출일 (1–31), 매월 반복 시 사용 */
  fixedDay?: number
  /** 매월 반복 여부 */
  isRecurringMonthly?: boolean
  /** 이 버전 금액이 적용되기 시작하는 월 (YYYY-MM) */
  effectiveFrom?: string
  /** 반복 고정지출 시작 월 (YYYY-MM) — 등록 달부터만 자동 생성 */
  recurringStartMonth?: string
  /** 반복 고정지출 종료 월 (YYYY-MM, 포함) — 해제 시 해당 달이 마지막 */
  recurringEndMonth?: string
}

export interface BodyMeasurements {
  waist?: number
  hip?: number
  chest?: number
  arm?: number
  thigh?: number
  calf?: number
  /** 사용자 추가 둘레 부위 id → cm */
  [partId: string]: number | undefined
}

export interface BodyRecord extends UserOwned {
  id: string
  date: string
  weight?: number
  bodyFat?: number
  measurements?: BodyMeasurements
}

/** 눈바디 — 사진만 (Blob은 IndexedDB 전용, JSON 백업 제외) */
export interface BodyPhotoRecord extends UserOwned {
  id: string
  date: string
  mimeType: 'image/jpeg'
  blob: Blob
}

/** 체형 3대 섹션 */
export type BodySectionKey = 'weight' | 'circumference' | 'photo'

/** 신체 둘레 부위 (기본 + 사용자 추가) */
export interface CircumferencePart {
  id: string
  name: string
  builtin?: boolean
}

/** @deprecated 레거시 메트릭 키 — bodySectionIntervals로 이전 */
export type BodyMetricKey =
  | 'weight'
  | 'bodyFat'
  | 'waist'
  | 'hip'
  | 'chest'
  | 'arm'
  | 'thigh'
  | 'calf'

/** @deprecated CSV/레거시 import 호환용 — UI 미사용 */
export interface InBodyResult {
  skeletalMuscle?: number
  bodyFatMass?: number
  bmi?: number
  visceralFat?: number
  basalMetabolic?: number
  bodyFatPercent?: number
}

/** @deprecated 레거시 import 호환 */
export interface LegacyBodyRecord extends BodyRecord {
  muscle?: number
  inbody?: InBodyResult
  memo?: string
}

export interface PeriodRecord extends UserOwned {
  id: string
  startDate: string
  endDate?: string
  memo?: string
}

export interface BloodPressureRecord extends UserOwned {
  id: string
  date: string
  systolic: number
  diastolic: number
  memo?: string
}

export type BloodSugarTiming = 'fasting' | 'after_meal' | 'before_sleep' | 'other'

export interface BloodSugarRecord extends UserOwned {
  id: string
  date: string
  value: number
  timing?: BloodSugarTiming
  memo?: string
}

export interface SleepRecord extends UserOwned {
  id: string
  date: string
  hours: number
  quality?: 1 | 2 | 3 | 4 | 5
  memo?: string
}

export interface HospitalRecord extends UserOwned {
  id: string
  date: string
  hospital: string
  treatment: string
  amount?: number
  result?: string
  memo?: string
}

export type ExerciseIntensity = 'low' | 'medium' | 'high'

export interface ExerciseRecord extends UserOwned {
  id: string
  date: string
  type: string
  duration?: number
  intensity?: ExerciseIntensity
  calories?: number
  memo?: string
}

export type ArchiveType = 'product' | 'place' | 'treatment' | 'other'

export interface ArchiveItem extends UserOwned {
  id: string
  date: string
  type: ArchiveType
  title: string
  rating?: number
  tags: string[]
  memo?: string
  location?: string
}

export type HabitType = 'good' | 'bad'

export interface Habit extends UserOwned {
  id: string
  name: string
  type: HabitType
  emoji: string
  color: string
}

export interface HabitLog extends UserOwned {
  id: string
  habitId: string
  date: string
  completed: boolean
}

/** 생활 · 반복 관리 그룹 */
export type LifeRoutineGroup = 'chores' | 'consumables' | 'health' | 'custom'

export interface LifeRoutine extends UserOwned {
  id: string
  name: string
  group: LifeRoutineGroup
  /** 주기 (일) */
  intervalDays: number
  suggestedIntervalDays?: number
  lastDoneAt?: string
  nextDueAt: string
  notes?: string
}

/** 생활 · 냉장고 / 소비기한 */
export interface PantryItem extends UserOwned {
  id: string
  name: string
  emoji?: string
  purchasedAt?: string
  expiresAt: string
  quantity?: number
  unit?: string
  linkedArchiveIds?: string[]
}

export type PantryStatus = 'fresh' | 'soon' | 'expired'

/** 영양 성분 — 이름·함량·단위 분리 저장 */
export interface NutrientAmount {
  name: string
  amount: number
  unit: string
}

/** 복용 시간대 (문자열 한 덩어리로 저장하지 않음) */
export type SupplementDayPart = 'morning' | 'noon' | 'evening' | 'night'

/** 식사 관계 */
export type SupplementMealRelation = 'before' | 'after' | 'with' | 'anytime'

export interface SupplementSchedule {
  dayPart: SupplementDayPart
  meal: SupplementMealRelation
  /** 알람 시각 HH:mm (선택) */
  alarmTime?: string
}

export interface PurchaseHistoryEntry {
  id: string
  date: string
  price: number
  store?: string
}

/** 영양제 제품 (개인 DB · 자동완성 소스) */
export interface SupplementProduct extends UserOwned {
  id: string
  name: string
  nutrients: NutrientAmount[]
  /** 용량 표기 (예: 60정, 90캡슐) */
  capacity?: string
  schedule: SupplementSchedule[]
  purchaseHistory: PurchaseHistoryEntry[]
  /** 복용 시작일 YYYY-MM-DD */
  startedAt?: string
  /** 복용 종료일 — 있으면 복용중 목록에서 제외, 구매이력은 유지 */
  endedAt?: string | null
}

/** 일별 복용 체크 */
export interface SupplementIntakeLog extends UserOwned {
  id: string
  productId: string
  date: string
  /** schedule 슬롯 키 — `${dayPart}:${meal}:${index}` */
  scheduleKey: string
  completed: boolean
  completedAt?: string
}

export interface DaySummary {
  date: string
  expenses: Expense[]
  bodyRecords: BodyRecord[]
  bodyPhotos: BodyPhotoRecord[]
  archiveItems: ArchiveItem[]
  habitLogs: (HabitLog & { habit?: Habit })[]
  lifeRoutines: LifeRoutine[]
  pantryItems: PantryItem[]
}

export interface PeriodContext {
  centerDate: string
  startDate: string
  endDate: string
  bodyRecords: BodyRecord[]
  bodyPhotos: BodyPhotoRecord[]
  expenses: Expense[]
  habitLogs: (HabitLog & { habit?: Habit })[]
  archiveItems: ArchiveItem[]
}

export type SearchResultType =
  | 'records'
  | 'expense'
  | 'body'
  | 'bodyPhoto'
  | 'supplement'
  | 'life'
  | 'habit'

export interface ExpenseSearchStats {
  query: string
  totalCount: number
  totalAmount: number
  byYear: { year: string; count: number; amount: number }[]
}

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle?: string
  date: string
  snippet?: string
  path: string
}

export type TabId = 'home' | 'budget' | 'health' | 'life' | 'records' | 'habits'

export type SectionId =
  | 'budget-summary'
  | 'budget-categories'
  | 'body-weight'
  | 'body-circumference'
  | 'body-photo'
  /** @deprecated → body-weight + body-circumference */
  | 'body-metrics'
  /** @deprecated 섹션별 주기 인라인으로 이전 */
  | 'body-intervals'
  | 'supplements-summary'
  | 'life-routines'
  | 'life-pantry'
  | 'life-purchase-cycles'
  | 'records-search'
  | 'records-list'
  | 'habits-checklist'
  | 'home-comparison'
  | 'home-calendar'
  | 'home-search'
  | 'home-timeline'

export interface AppSettings extends UserOwned {
  id: 'app-settings'
  enabledTabs: TabId[]
  enabledSections: SectionId[]
  /** IndexedDB 데이터 모델 버전 (마이그레이션용) */
  schemaVersion?: number
  /** 모든 달에 공유되는 가계부 카테고리 */
  budgetCategories?: BudgetCategory[]
  /** 체중 / 신체둘레 / 눈바디 측정 주기(일) */
  bodySectionIntervals?: Partial<Record<BodySectionKey, number>>
  /** 신체 둘레 부위 목록 */
  circumferenceParts?: CircumferencePart[]
  /** @deprecated bodySectionIntervals 로 이전 */
  bodyMeasurementIntervals?: Partial<Record<BodyMetricKey, number>>
  /** @deprecated budgetCategories로 마이그레이션 */
  fixedCategories?: BudgetCategory[]
}

export interface SectionMeta {
  id: SectionId
  label: string
  tab: TabId
  group?: string
  defaultEnabled: boolean
}
