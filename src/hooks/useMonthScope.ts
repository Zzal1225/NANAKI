import { useEffect, useState } from 'react'
import { useAsync } from './useAsync'
import { currentMonth } from '../utils/dates'

type UseMonthScopeOptions = {
  /** 데이터가 있는 최초 월을 반환 */
  getStartMonth: () => Promise<string>
  /** 다음 달 이동 상한 (기본: 제한 없음) */
  maxMonth?: string
  /** 초기 월 (기본: 이번 달) */
  initialMonth?: string
}

/**
 * 탭 공통 월 범위 — 가계부처럼 데이터 최초 월(minMonth) 이전으로는 이동 불가.
 */
export function useMonthScope({
  getStartMonth,
  maxMonth,
  initialMonth = currentMonth(),
}: UseMonthScopeOptions) {
  const [month, setMonth] = useState(initialMonth)
  const { data: startMonth, loading } = useAsync(getStartMonth, [])

  useEffect(() => {
    if (startMonth && month < startMonth) {
      setMonth(startMonth)
    }
  }, [startMonth, month])

  useEffect(() => {
    if (maxMonth && month > maxMonth) {
      setMonth(maxMonth)
    }
  }, [maxMonth, month])

  return {
    month,
    setMonth,
    /** 로드 전에는 undefined → MonthNav 하한 미적용 */
    minMonth: startMonth ?? undefined,
    maxMonth,
    startMonthLoading: loading,
  }
}
