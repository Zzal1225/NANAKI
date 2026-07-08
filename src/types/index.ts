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

export interface DaySummary {
  date: string
  expenses: Expense[]
  bodyRecords: BodyRecord[]
  bodyPhotos: BodyPhotoRecord[]
  archiveItems: ArchiveItem[]
  habitLogs: (HabitLog & { habit?: Habit })[]
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

export type SearchResultType = 'records' | 'expense' | 'body' | 'bodyPhoto' | 'habit'

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

export type TabId = 'home' | 'budget' | 'body' | 'records' | 'habits'

export type SectionId =
  | 'budget-summary'
  | 'budget-categories'
  | 'body-metrics'
  | 'body-photo'
  | 'body-intervals'
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
  /** 체형 항목별 측정 주기(일) */
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
