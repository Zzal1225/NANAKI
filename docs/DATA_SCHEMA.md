# 데이터 스키마

Nanaki의 모든 사용자 데이터는 브라우저 **IndexedDB** (`nanaki-db`, v3)에 저장됩니다.  
타입 정의 원본: `src/types/index.ts`

> **멀티 사용자 전제**: Phase 1–3에서는 실제 로그인 없이 `userId: 'local-user'`를 사용합니다.  
> **Migration·backfill은 Supabase 단계(Phase 5)에서 구현** — 지금은 타입·필드 자리만 확보합니다.

## 공통 소유권 필드 (`UserOwned`)

모든 사용자 레코드(지출, 예산, 습관 등)는 아래 필드를 가집니다.

```typescript
interface UserOwned {
  userId: UserId       // 현재: 'local-user' (src/config/user.ts)
  createdAt: string    // ISO 8601
  updatedAt?: string   // 저장 시 갱신
}
```

- 저장 API: `stampUserOwned()` — `src/db/recordDefaults.ts`
- 읽기: `ensureUserOwned()` — 레거시·백업 데이터 보정
- 입력 타입: `UserOwnedInput<T>` — UI에서 `userId` 생략 가능

## 저장소(Store) 목록

| Store | Key | 인덱스 | 설명 |
|-------|-----|--------|------|
| `budgetSettings` | `id` | `by-month` | 월별 예산 설정 |
| `expenses` | `id` | `by-date` | 지출 기록 |
| `bodyRecords` | `id` | `by-date` | 체형 기록 |
| `archiveItems` | `id` | `by-date`, `by-type` | 아카이브 |
| `habits` | `id` | — | 습관 정의 |
| `habitLogs` | `id` | `by-date`, `by-habit` | 습관 체크 |
| `periodRecords` | `id` | `by-start` | 생리 기록 |
| `bpRecords` | `id` | `by-date` | 혈압 |
| `sugarRecords` | `id` | `by-date` | 혈당 |
| `sleepRecords` | `id` | `by-date` | 수면 |
| `hospitalRecords` | `id` | `by-date` | 병원 |
| `exerciseRecords` | `id` | `by-date` | 운동 |
| `appSettings` | `id` | — | 앱 전역 설정 |
| `syncQueue` | `id` | `by-synced` | 동기화 큐 |
| `syncConfig` | `id` | — | 동기화 설정 |

---

## 가계부 도메인

### 개념 관계

```
BudgetCategory (8개 고정 제공)
    └── CategoryBudgetItem[]  ← 월별 예산 (세부항목 단위)
            └── subItem: "월세", "휴대폰요금" …

Expense[]  ← 실제 지출
    ├── categoryId / categoryName  → BudgetCategory
    └── subItem                    → CategoryBudgetItem.subItem 과 문자열 매칭
```

- **카테고리**: 앱이 제공하는 8개 (`주거/통신`, `식비`, `교통/차량`, `생활/쇼핑`, `문화/여가`, `의료/교육`, `금융`, `기타`). `AppSettings.budgetCategories`에 ID·이름 저장.
- **세부항목**: 카테고리 하위 자유 입력 태그. 예: `주거/통신` + `월세`, `금융` + `대출`, `금융` + `보험`.
- **예산**: `CategoryBudgetItem` 한 건 = `(categoryId, subItem)` + 금액.
- **지출**: `Expense` 한 건 = 카테고리 + 세부항목(선택) + 금액 + 날짜.

### BudgetCategory

```typescript
interface BudgetCategory {
  id: string      // UUID, 전역 고정
  name: string    // "주거/통신" | "식비" | … (8종)
}
```

### CategoryBudgetItem

```typescript
interface CategoryBudgetItem {
  id: string
  categoryId: string
  amount: number
  subItem?: string           // 세부항목명 (예: "월세")
  isCategoryTotal?: boolean  // true면 카테고리 총 예산 (subItem 없음)
  isFixed?: boolean          // 고정지출 → 매월 Expense 자동 생성
  fixedDay?: number          // 1–31, isFixed일 때
}
```

| 필드 | 용도 |
|------|------|
| `subItem` + `amount` | 세부항목 예산 (예: 월세 500,000원) |
| `isCategoryTotal` | 카테고리 전체 상한 (세부항목 합과 별도) |
| `isFixed` | 예산 저장 시 `Expense` 마스터(`id` 동일)로 동기화 |

### BudgetSettings (월별)

```typescript
interface BudgetSettings {
  id: string
  month: string              // "YYYY-MM"
  totalBudget: number        // budgetItems 합계 (캐시)
  categories: BudgetCategory[] // 해당 월 스냅샷 (전역과 동기)
  budgetItems: CategoryBudgetItem[]
  enabledCategoryIds?: string[] // UI에 표시할 카테고리 ID
}
```

- 신규 월 생성 시 `enabledCategoryIds` 기본값: `주거/통신`, `식비`, `교통/차량`.
- `ensureBudgetSettingsForMonth()`가 월별 레코드 없으면 생성.

### Expense

```typescript
interface Expense extends UserOwned {
  id: string
  date: string               // "YYYY-MM-DD"
  amount: number
  categoryId: string
  categoryName: string
  type: 'fixed' | 'variable'
  subItem?: string
  recurringTemplateId?: string
  fixedDay?: number
}
```

| type | 생성 경로 |
|------|-----------|
| `variable` | 지출 추가 모달 (수동) |
| `fixed` | `CategoryBudgetItem.isFixed` 저장 시 `syncFixedBudgetExpenses()` |

고정지출 가상 레코드 ID: `{masterId}__{YYYY-MM}` (해당 월 조회 시 합성).

### AppSettings (전역)

```typescript
interface AppSettings {
  id: 'app-settings'
  enabledTabs: TabId[]
  enabledSections: SectionId[]
  budgetCategories?: BudgetCategory[]
}
```

---

## 기타 도메인 (요약)

| 타입 | 주요 필드 |
|------|-----------|
| `BodyRecord` | `date`, `weight`, `bodyFat`, `measurements`, `inbody` |
| `ArchiveItem` | `type`, `title`, `tags[]`, `rating`, `location` |
| `Habit` / `HabitLog` | 습관 정의 + 일별 `completed` |
| `ExerciseRecord` | `type`, `duration`, `intensity`, `calories` |
| `PeriodRecord` | `startDate`, `endDate` |
| `BloodPressureRecord` | `systolic`, `diastolic` |
| `BloodSugarRecord` | `value`, `timing` |
| `SleepRecord` | `hours`, `quality` |
| `HospitalRecord` | `hospital`, `treatment`, `amount` |

---

## 검색

- `Expense`: `categoryName`, `subItem`, `amount` 텍스트 매칭 (`unifiedSearch`)
- `CategoryBudgetItem.subItem`: 예산 세부항목도 검색 결과에 포함
- `ArchiveItem`: `title`, `memo`, `tags`, `location`

---

## 레거시 마이그레이션

| 이전 | 이후 |
|------|------|
| `Expense.memo` | `Expense.subItem` |
| `월세/관리비`, `통신비` | `주거/통신` |
| `교통` | `교통/차량` |
| `쇼핑`, `구독` | `생활/쇼핑` |
| `여가` | `문화/여가` |

`mergeProvidedCategories()`, `migrateLegacyExpenses()`가 ID 유지하며 이름만 정규화합니다.
