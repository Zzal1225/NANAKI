# 생활 탭 스펙 초안

> **NANAKI** = **나**는 **나**를 **키**운다.  
> 1인 가구로서 자신을 온전히 책임지기 위한 운영 탭입니다.  
> 상태: **2차 구현됨** · 구매 주기 · 홈 뱃지 · 기록 링크 · 알림

관련: [ROADMAP.md](./ROADMAP.md) · [DATA_SCHEMA.md](./DATA_SCHEMA.md) · [README.md](../README.md)

---

## 1. 네비게이션 · IA

### 상단 브랜드

| 요소 | 설명 |
|------|------|
| **Nanaki** (텍스트 → 추후 로고 이미지) | `/` 홈으로 이동 |
| **홈 아이콘** (상단 최우측) | `/` 홈으로 이동 · 홈일 때 accent |

홈은 **하단 탭에 두지 않습니다.**

### 하단 탭 5개

```
가계부 · 건강 · 생활 · 기록 · 습관
```

| 탭 | path | 역할 |
|----|------|------|
| 가계부 | `/budget` | 돈 |
| 건강 | `/health` | 몸 · 영양제 |
| **생활** | `/life` | 집 · 물건 · 주기 루틴 |
| 기록 | `/records` | 검색 가능한 개인 아카이브 |
| 습관 | `/habits` | 일일 체크 · 점수형 |

### 섹션 (설정 ON/OFF)

| SectionId | 라벨 | MVP |
|-----------|------|-----|
| `life-routines` | 반복 관리 | 1차 |
| `life-pantry` | 냉장고 · 소비기한 | 1차 |
| `life-purchase-cycles` | 구매 주기 분석 | 2차 · 가계부 연동 |

---

## 2. 기능 요구사항

### 2-1. 반복 관리 (`LifeRoutine`)

사용자가 **관리 항목을 직접 생성**합니다. 주기는 자유롭게 선택하고, 앱은 **권장 주기**만 안내합니다.

**그룹 예시**

| 그룹 | 예시 |
|------|------|
| 집안일 `chores` | 수건 교체, 침구 세탁, 에어컨 필터, 냉장고 정리 |
| 소모품 `consumables` | 칫솔, 면도날, 세제 |
| 건강 `health` | 치과 검진, 피부과, 건강검진 |
| 기타 `custom` | 사용자 정의 |

**카드 표시 형식**

```
수건 교체
주기: 3개월 · 마지막 실행: 2026.06.01 · 다음 예정: 2026.09.01
```

**동작**

- 항목 추가 / 편집 / 삭제 / 완료(오늘을 마지막 실행으로 갱신 → 다음 예정 재계산)
- `intervalDays` 또는 `intervalMonths` — 구현 시 일 단위로 통일 권장 (`intervalDays`)
- `suggestedIntervalDays` — 시드 템플릿별 권장값 (선택 힌트)
- 기한 임박·초과 시 홈/생활 요약에 뱃지 (홈 MVP 이후)

### 2-2. 냉장고 · 소비기한 (`PantryItem`)

```
🥚 계란
구매일: 7/5
유통기한: 7/25
남은 기간: 16일
상태: 🟢 여유 / 🟡 임박 / 🔴 폐기 필요
```

**상태 규칙 (계산, DB에 상태 enum 저장하지 않음)**

| 상태 | 조건 (초안) |
|------|-------------|
| 여유 `fresh` | 남은 일수 ≥ 7 |
| 임박 `soon` | 1 ≤ 남은 일수 ≤ 6 |
| 폐기 `expired` | 남은 일수 ≤ 0 |

임계값은 설정으로 빼도 됨 (MVP는 고정).

**필드**

- `name`, `emoji?`, `purchasedAt?`, `expiresAt`, `quantity?`, `unit?`
- 검색·기록 연결용 `tags?: string[]` 또는 이름 그대로 검색

### 2-3. 구매 주기 분석 (2차 · 가계부 연동)

```
생수
평균 구매 주기: 21일
마지막 구매: 6/20
예상 구매일: 7/11
```

- 가계부 `Expense`의 `subItem` / `categoryName` 키워드 집계
- 동일 키 **2회 이상** 구매 시 인접 간격 평균 → 예상 구매일
- “곧 떨어질 것 같은 물건” 정렬: 예상일 초과 · 7일 이내 우선
- 구현: `src/life/purchaseCycles.ts` · 섹션 `life-purchase-cycles`

---

## 3. 기록 · 검색 연동

NANAKI의 **개인 검색 엔진** 컨셉:

```
검색: "계란"

기록
- 계란찜 레시피
- 계란 구매 기록

생활
- 계란 6개 남음
- 유통기한 7일 남음
```

| 구분 | 역할 |
|------|------|
| **기록** | 서술·레시피·일화 (Archive) |
| **생활** | 현재 재고·기한·다음에 할 일 |

**연결 방식**

- MVP: 통합 검색에서 `type: 'life'` 결과 추가 (이름·태그 매칭)
- 2차: `PantryItem.linkedArchiveIds[]` 로 기록 명시 링크 (냉장고 모달에서 선택)

검색 결과 path: `/life` (또는 항목 상세 `/life/pantry/:id` 추후)

---

## 4. 데이터 모델 초안

```typescript
type LifeRoutineGroup = 'chores' | 'consumables' | 'health' | 'custom'

interface LifeRoutine extends UserOwned {
  id: string
  name: string
  group: LifeRoutineGroup
  intervalDays: number
  suggestedIntervalDays?: number
  lastDoneAt?: string      // YYYY-MM-DD
  nextDueAt: string
  notes?: string
}

interface PantryItem extends UserOwned {
  id: string
  name: string
  emoji?: string
  purchasedAt?: string
  expiresAt: string
  quantity?: number
  unit?: string
  linkedArchiveIds?: string[]
}

type PantryStatus = 'fresh' | 'soon' | 'expired'
// getPantryStatus(expiresAt, today, thresholds) → 순수 함수
```

**IndexedDB (DB v6)**

| Store | 인덱스 |
|-------|--------|
| `lifeRoutines` | `by-nextDue`, `by-group` |
| `pantryItems` | `by-expires`, `by-name` |

---

## 5. MVP 체크리스트

### 1차 (생활 탭 최소)

- [x] `LifeRoutine` CRUD · 완료 처리 · 다음 예정 계산
- [x] 그룹별 리스트 · 권장 주기 시드 템플릿
- [x] `PantryItem` CRUD · 상태 뱃지
- [x] 통합 검색 `life` 타입
- [x] 문서·타입·DB v6

### 2차

- [x] 구매 주기 분석 (가계부 연동)
- [x] 홈 캘린더 뱃지 (기한 임박 · 반복 예정)
- [x] 기록 항목 명시 링크
- [x] 알림 (영양제 알람과 동일 패턴)

### 비범위

- 외부 쇼핑몰/바코드 자동 인식
- 공유 냉장고 (멀티 유저)

---

## 6. UI 스케치

```
[Nanaki]                    [🏠]  ← Layout 상단 (홈 최우측)
생활
────────────────
반복 관리
  [수건 교체 · 3개월 · 다음 9/1]
  [칫솔 교체 · …]
  [+ 항목 추가]

냉장고 · 소비기한
  🥚 계란 · 16일 · 🟢
  …
  [+ 추가]

[가계부][건강][생활][기록][습관]  ← 하단 5탭
```

비즈니스 로직은 `src/life/` (예: `pantryStatus.ts`, `nextDue.ts`)에 두고 UI와 분리합니다.

---

## 7. 로드맵 위치

| 순서 제안 | 이유 |
|-----------|------|
| 기록 MVP와 **병행 또는 직후** | 검색 연동 시연에 기록 결과가 필요 |
| 습관·홈 대시보드 **이전 가능** | “키운다” 핵심 서사에 생활이 직접 기여 |

진행 현황 표에는 **생활 탭 스펙 ✅ / MVP ✅ / 2차 ✅** 로 구분합니다.
