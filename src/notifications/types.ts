/** 오늘 할 일 — 로컬 대시보드·추후 푸시 공통 모델 */

export type TodayTaskKind = 'body' | 'supplement' | 'life-routine' | 'pantry'

export type TodayTask = {
  id: string
  kind: TodayTaskKind
  /** 체크리스트에 보이는 짧은 문구 */
  label: string
  done: boolean
  href: string
}

export type TodayTasksInput = {
  today: string
  body: {
    dueMetricLabels: string[]
    /** 오늘 체중(또는 해당 지표) 기록이 있으면 done 처리용 — 라벨별 */
    doneLabels: Set<string>
  }
  supplements: {
    id: string
    label: string
    done: boolean
  }[]
  routines: {
    id: string
    name: string
    /** nextDueAt <= today */
    due: boolean
    /** lastDoneAt === today */
    doneToday: boolean
  }[]
  pantry: {
    id: string
    name: string
    /** 표시용: '유통기한 오늘' | '유통기한 임박' | '폐기 필요' */
    statusLabel: string
    /** 오늘·임박·폐기만 포함하도록 호출측에서 필터 */
  }[]
}
