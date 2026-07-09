# 데이터 스키마

Nanaki의 모든 사용자 데이터는 브라우저 **IndexedDB** (`nanaki-db`, **v5**)에 저장됩니다.  
타입 정의 원본: `src/types/index.ts`

> **멀티 사용자 전제**: Phase 1–3에서는 실제 로그인 없이 `userId: 'local-user'`를 사용합니다.  
> **Migration·backfill은 Supabase 단계(Phase 5)에서 구현** — 지금은 타입·필드 자리만 확보합니다.

## 공통 소유권 필드 (`UserOwned`)

```typescript
interface UserOwned {
  userId: UserId       // 현재: 'local-user' (src/config/user.ts)
  createdAt: string    // ISO 8601
  updatedAt?: string
}
```

- 저장: `stampUserOwned()` — `src/db/recordDefaults.ts`
- 읽기: `ensureUserOwned()`
- 입력: `UserOwnedInput<T>`

## 저장소(Store) 목록

### 활성 (UI·기능에서 사용)

| Store | Key | 인덱스 | 설명 |
|-------|-----|--------|------|
| `budgetSettings` | `id` | `by-month` | 월별 예산 설정 |
| `expenses` | `id` | `by-date` | 지출 기록 |
| `bodyRecords` | `id` | `by-date` | 체중 · 둘레 측정 |
| `bodyPhotos` | `id` | `by-date` | 눈바디 사진 (Blob) |
| `supplementProducts` | `id` | — | 영양제 제품 · 구매이력 (v5) |
| `supplementIntakeLogs` | `id` | `by-date`, `by-product` | 복용 체크 (v5) |
| `archiveItems` | `id` | `by-date`, `by-type` | 기록 |
| `habits` | `id` | — | 습관 정의 |
| `habitLogs` | `id` | `by-date`, `by-habit` | 습관 체크 |
| `appSettings` | `id` | — | 앱 전역 설정 |
| `syncQueue` | `id` | `by-synced` | 동기화 큐 |
| `syncConfig` | `id` | — | 동기화 설정 |

### 레거시 (UI 미사용 · 백업 호환)

| Store | 설명 |
|-------|------|
| `periodRecords` | 생리 |
| `bpRecords` | 혈압 |
| `sugarRecords` | 혈당 |
| `sleepRecords` | 수면 |
| `hospitalRecords` | 병원 |
| `exerciseRecords` | 운동 (추후 기록>활동) |

---

## 탭 · 섹션

탭: `home` · `budget` · `health` · `records` · `habits`  
(구 `body` / `mybody` → `health` 로 마이그레이션)

건강 탭 섹션:

| SectionId | 그룹 | 내용 |
|-----------|------|------|
| `body-metrics` | 체형 | 체중 · 둘레 |
| `body-photo` | 체형 | 눈바디 |
| `body-intervals` | 체형 | 측정 주기 |
| `supplements-summary` | 영양제 | 요약 + 복용 캘린더 → `/health/supplements` |

---

## 가계부 도메인

(기존과 동일 — `BudgetCategory`, `CategoryBudgetItem`, `BudgetSettings`, `Expense`)

자세한 필드는 이전 문서·`src/types` 참고.

---

## 체형 도메인 (건강 탭 · 체형 섹션)

### BodyRecord

```typescript
interface BodyRecord extends UserOwned {
  id: string
  date: string
  weight?: number
  bodyFat?: number
  measurements?: BodyMeasurements
}
```

### BodyPhotoRecord

```typescript
interface BodyPhotoRecord extends UserOwned {
  id: string
  date: string
  mimeType: 'image/jpeg'
  blob: Blob  // JSON 백업 제외
}
```

측정 주기: `AppSettings.bodyMeasurementIntervals`

---

## 영양제 도메인 (건강 탭)

핵심: **제품 자동 검색이 아니라, 현재 복용 중인 성분 분석**.

### NutrientAmount — 이름 · 함량 · 단위 분리

```typescript
interface NutrientAmount {
  name: string    // "Vitamin A"
  amount: number  // 1000
  unit: string    // "IU"
}
```

### SupplementSchedule — 복용법 Enum 분리

문자열 `"아침 식전"` 한 덩어리로 저장하지 않음.

```typescript
type SupplementDayPart = 'morning' | 'noon' | 'evening' | 'night'
type SupplementMealRelation = 'before' | 'after' | 'with' | 'anytime'

interface SupplementSchedule {
  dayPart: SupplementDayPart
  meal: SupplementMealRelation
  alarmTime?: string  // "HH:mm"
}
```

### PurchaseHistoryEntry

```typescript
interface PurchaseHistoryEntry {
  id: string
  date: string
  price: number
  store?: string
}
```

### SupplementProduct

```typescript
interface SupplementProduct extends UserOwned {
  id: string
  name: string
  nutrients: NutrientAmount[]
  capacity?: string
  schedule: SupplementSchedule[]
  purchaseHistory: PurchaseHistoryEntry[]
  startedAt?: string
  endedAt?: string | null  // 있으면 시 복용중 목록 제외, 구매이력 유지
}
```

### SupplementIntakeLog

```typescript
interface SupplementIntakeLog extends UserOwned {
  id: string
  productId: string
  date: string
  scheduleKey: string  // `${dayPart}:${meal}:${index}`
  completed: boolean
  completedAt?: string
}
```

### 합산 성분 표기

제품별 성분을 합산하고 출처를 병기합니다.

예) Magnesium **6mg** — `종합비타민 1mg, 마그네슘 5mg`

로직: `src/supplements/nutrients.ts` → `aggregateNutrients()`

### 성분 미리보기 (추가 시)

`previewNutrientChanges(current, adding)` — 변경·신규만 강조.

### 복용률 계산

```
expected  = 해당 월 각 날짜 × (그날 복용 중이던 제품의 schedule 슬롯 수 합)
completed = 그 expected 중 IntakeLog.completed === true 인 건수
rate      = expected === 0 ? 0 : round(completed / expected * 100)
```

예) 이번 달 복용해야 하는 횟수 **120회**, 복용 완료 **112회** → **93%**

로직: `src/supplements/adherence.ts` → `calculateSupplementAdherence()`

### MVP 자동완성

1. 시드 카탈로그 (`src/supplements/catalog.ts`) + 개인 `supplementProducts`
2. DB에 있으면 성분 자동 입력
3. 없으면 수동 입력
4. 저장 후 다음부터 개인 DB 자동완성

### 알람

`src/supplements/alarms.ts` — Notification API, 앱 포그라운드에서 `alarmTime` 기준 `setTimeout` (MVP).

---

## 검색

결과 타입: `records` | `expense` | `body` | `bodyPhoto` | `supplement` | `habit`  
영양제: 제품명 · 성분 · 구매처 · 가격 → `/health/supplements`

---

## 레거시 마이그레이션

| 이전 | 이후 |
|------|------|
| TabId `body` / path `/body` | `health` / `/health` |
| DB v4 | DB v5 (`supplementProducts`, `supplementIntakeLogs`) |
| `BodyRecord.inbody` | UI 미사용 |
