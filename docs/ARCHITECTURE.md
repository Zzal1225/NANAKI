# ARCHITECTURE

탭 · 폴더 · **데이터 흐름** · **IndexedDB 스키마/관계** · 알림 레이어.

---

## 1. IA

```
[Nanaki] [🏠 홈]          ← Dashboard (하단 탭 아님)
  오늘 할 일 · 캘린더 · 분석 · 검색

하단 5탭
  가계부 /budget
  건강   /health
  생활   /life
  기록   /records
  습관   /habits
```

월 네비 공통: **최초 데이터 월 이전 불가** · **미래 +3개월** (`maxNavigableMonth`).

---

## 2. 런타임 데이터 흐름

```
사용자 입력
  ↓
도메인 로직 (budget / body / life / supplements / notifications)
  ↓
db/ Repository (idb)
  ↓
IndexedDB `nanaki-db`
  ↓
페이지 reload · 홈「오늘 할 일」재집계 · 검색
  ↓
(추후) syncQueue → Supabase
```

원칙: UI는 저장하지 않음 · 계산은 도메인 폴더 · 전역 상태 최소화.

---

## 3. 핵심 프로세스 (면접용)

### 3-1. 지출 등록 → 화면

```
사용자 → 모달 검증 → saveExpense / saveFixedExpense
  → IndexedDB expenses
  → BudgetPage reload
  → 집계(총지출·카테고리·추세) → 도넛·진행바·요약 카드
  → (홈 재진입 시) 오늘 할 일/뱃지
```

### 3-2. 오늘 할 일

```
앱/홈 진입
  → 체형·영양제·생활·냉장고 로드
  → collectTodayTasks (due 판정)
  → TodayTasksSection
  → (보조) 포그라운드 Notification
```

서버 푸시 없음 (1차).

### 3-3. 눈바디 업로드

```
사진 선택 → (첫 장: 각도 안내) / (이후: 이전 30% 오버레이 확인)
  → compress 1200px JPEG 0.8 → bodyPhotos Blob 저장
```

상세 단계·필드: 각 [modules/](./modules/).

---

## 4. 알림 레이어 (로컬 퍼스트)

| 단계 | 채널 | 앱 종료 시 |
|------|------|------------|
| 1차 | 홈「오늘 할 일」(+ 포그라운드 Notification) | 없음 (의도) |
| 추후 | FCM Web Push (`notifications/push`) | 가능 |

```
buildTodayTasks / collectTodayTasks   ← “무엇을”
  ├── 홈 UI + localNotify             ← 1차
  └── PushProvider (지금은 Noop)      ← 동기화 이후
```

**FCM 추가 시 (추후):** `FcmPushProvider` → `setPushProvider` · SW `push`/`notificationclick` · 페이로드는 `buildTodayTasks` 재사용. 할 일 집계 로직은 `push/`에 두지 않음.

---

## 5. `src/` 책임

| 경로 | 역할 |
|------|------|
| `pages/` | 라우트 · 월 스코프 |
| `components/` | UI |
| `budget/` `body/` `life/` `supplements/` | 도메인 로직 |
| `notifications/` | 오늘 할 일 · localNotify · PushProvider |
| `db/` | IndexedDB · CRUD · migration |
| `search/` `export/` `sync/` | 검색 · 백업 · 동기화(예정) |
| `config/` `types/` `hooks/` | 설정 · 타입 · useAsync/useMonthScope |

---

## 6. IndexedDB — 스토어와 관계

**DB:** `nanaki-db` · **lib:** `idb` (Dexie 아님) · **v6**  
공통: `UserOwned` = `userId`, `createdAt`, `updatedAt?`

| Store | 인덱스 | 역할 |
|-------|--------|------|
| `appSettings` | — | 탭/섹션 · 카테고리 마스터 · 체형 주기/부위 |
| `budgetSettings` | `by-month` | **월별** 예산 |
| `expenses` | `by-date` | 지출 |
| `bodyRecords` | `by-date` | 체중·둘레 |
| `bodyPhotos` | `by-date` | 눈바디 Blob (JSON 백업 제외) |
| `lifeRoutines` | `by-nextDue`, `by-group` | 반복 |
| `pantryItems` | `by-expires`, `by-name` | 냉장고 |
| `habits` | — | 습관 정의 |
| `habitLogs` | `by-date`, `by-habit` | 체크 |
| `archiveItems` | `by-date`, `by-type` | 기록 |
| `supplementProducts` | — | 영양제 |
| `supplementIntakeLogs` | `by-date`, `by-product` | 복용 |
| `syncQueue` / `syncConfig` | — | 동기화 예약 |

```
AppSettings.budgetCategories[]
        ↑ categoryId
BudgetSettings.budgetItems[] ──┐
Expense.categoryId ────────────┘
Expense.categoryName = 표시 스냅샷

BodyRecord.measurements[partId] ← AppSettings.circumferenceParts
PantryItem.linkedArchiveIds[] → ArchiveItem
Habit ← HabitLog.habitId
SupplementProduct ← SupplementIntakeLog.productId
```

`BudgetCategory`는 **별도 store 없음** (설정에 임베드).

레거시 헬스 store(혈압 등)는 백업 호환만, UI 없음.

---

## 7. 모듈

- [modules/accounting.md](./modules/accounting.md) — 가계부
- [modules/health.md](./modules/health.md) — 건강
- [modules/routine.md](./modules/routine.md) — 생활
- [modules/archive.md](./modules/archive.md) — 기록
- [modules/habit.md](./modules/habit.md) — 습관
