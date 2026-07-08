import { format, parseISO, subDays, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns'
import { ko } from 'date-fns/locale'

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function currentMonth() {
  return format(new Date(), 'yyyy-MM')
}

/** 가계부 월 이동 상한 — 이번 달 포함 +3개월 */
export function maxBudgetMonth() {
  return format(addMonths(new Date(), 3), 'yyyy-MM')
}

export function formatDate(date: string, pattern = 'M월 d일 (EEE)') {
  return format(parseISO(date), pattern, { locale: ko })
}

export function formatMonth(month: string) {
  const [y, m] = month.split('-')
  return `${y}년 ${parseInt(m)}월`
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

export function daysAgoISO(days: number) {
  return format(subDays(new Date(), days), 'yyyy-MM-dd')
}

export function getMonthDays(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(start)
  return eachDayOfInterval({ start, end })
}

export function getCalendarGrid(year: number, month: number) {
  const days = getMonthDays(year, month)
  const firstDayOfWeek = days[0].getDay()
  const padding = Array.from({ length: firstDayOfWeek }, () => null)
  return [...padding, ...days.map((d) => format(d, 'yyyy-MM-dd'))]
}

export const ARCHIVE_TYPE_LABELS: Record<string, string> = {
  product: '제품',
  place: '장소',
  treatment: '시술',
  other: '기타',
}

export const DEFAULT_CATEGORIES = [
  { name: '주거/통신' },
  { name: '식비' },
  { name: '교통/차량' },
  { name: '생활/쇼핑' },
  { name: '문화/여가' },
  { name: '의료/교육' },
  { name: '금융' },
  { name: '기타' },
]

/** 초기에 활성화되는 기본 카테고리 (주거, 식비, 교통) */
export const DEFAULT_ENABLED_CATEGORY_NAMES = ['주거/통신', '식비', '교통/차량']

/** 이전 카테고리명 → 개편 카테고리명 */
export const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  '월세/관리비': '주거/통신',
  '통신비': '주거/통신',
  '구독': '생활/쇼핑',
  '교통': '교통/차량',
  '쇼핑': '생활/쇼핑',
  '여가': '문화/여가',
}

export function resolveLegacyCategoryName(name: string): string {
  return LEGACY_CATEGORY_ALIASES[name] ?? name
}

export function formatFixedDay(day?: number) {
  if (!day) return null
  return `매월 ${day}일`
}

export function fixedDayToDate(month: string, day: number) {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const d = Math.min(Math.max(day, 1), lastDay)
  return `${month}-${String(d).padStart(2, '0')}`
}

export const HABIT_EMOJIS = ['💪', '📚', '🧘', '💧', '🏃', '😴', '🚭', '🍺', '📱', '🎯', '✨', '🌱']

export const HABIT_COLORS = [
  '#34d399', '#60a5fa', '#c4a1ff', '#f472b6', '#fbbf6a', '#fb7185',
]
