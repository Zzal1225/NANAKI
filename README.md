# Nanaki

기억을 기록하고, 언제든 다시 찾는 검색 중심 개인 라이프 로그 PWA

## URL 구분 (중요)

| 명령          | URL                   | 용도            | 데이터                        |
| ------------- | --------------------- | --------------- | ----------------------------- |
| `npm run dev` | http://localhost:5173 | UI 개발·수정    | **5173 전용** (PWA 설치 불가) |
| `npm run pwa` | http://localhost:4173 | **설치·실사용** | **4173 / 설치 앱 전용**       |

**5173과 4173은 저장소가 완전히 다릅니다.** 실제 기록은 4173에서 설치한 앱으로만 사용하세요.

## Architecture

```
Home
 ├── Budget   (가계부)
 ├── Health   (건강 · 체형 / 영양제)
 ├── Life     (생활 · 반복 / 냉장고)
 ├── Records  (기록 · 검색)
 └── Habits   (습관)

  ※ 홈은 하단 탭이 아니라 상단 Nanaki 로고 옆 🏠 아이콘

        ↓

   IndexedDB  (로컬 저장 · 오프라인)

        ↓

 (추후) Supabase Sync  (멀티 디바이스 · Auth)
```

## 일상 사용 (권장)

### 1. 최초 1회 — 설치

```bash
npm install
npm run pwa
```

브라우저에서 **http://localhost:4173** 접속 → 주소창 ⊕ 또는 「Nanaki 앱 설치」로 설치.

### 2. 코드 수정 후 업데이트

```bash
npm run pwa
```

설치 앱을 켠 채로 실행 후, 앱 창을 클릭하거나 최대 1분 기다리면 **「새 버전 사용 가능」→「업데이트」** 배너가 뜹니다.

### 3. UI만 빠르게 볼 때 (선택)

```bash
npm run dev
```

http://localhost:5173 — Hot Reload, IndexedDB 유지.

## 기능 · 진행

| 탭     | 내용                            | MVP |
| ------ | ------------------------------- | --- |
| 가계부 | 카테고리별 예산, 고정/변동 지출 | ✅  |
| 건강   | 체형(체중·둘레·눈바디) · 영양제 | ✅  |
| 생활   | 반복 · 냉장고 · 구매 주기 · 알림  | ✅  |
| 기록   | 개인 검색 · 기록 보관           | 🔜  |
| 습관   | 일일 체크                       | 🔜  |
| 홈     | 캘린더, 30일 비교, 통합 검색 (상단 🏠) | 🔜  |

로드맵: [docs/ROADMAP.md](docs/ROADMAP.md)

---

## 프로젝트 구조

```
src/
├── pages/           탭 단위 페이지 (Home, Budget, Health, Life, Records, Habits)
├── components/      공통 UI 및 도메인 컴포넌트
├── life/            반복 예정 · 냉장고 상태 로직
├── budget/          예산 계산, 반복지출, 집계 로직
├── db/              IndexedDB, Repository, Migration
├── search/          검색 엔진
├── sync/            Supabase 동기화 (예정)
├── types/           공통 타입
└── config/          앱 설정
```

| 폴더 | 책임 |
| ---- | ---- |
| `pages/` | 라우트 진입점. 데이터 로드·상태 조합·하위 컴포넌트 배치를 담당합니다. |
| `components/` | 재사용 UI(`common`, `layout`)와 도메인별 화면 조각(`budget`, `body`, `supplements` 등)을 담당합니다. |
| `budget/` | 예산 계산, 반복 고정지출, 카테고리 집계 등 가계부 비즈니스 로직을 담당합니다. |
| `db/` | IndexedDB CRUD, 마이그레이션, `UserOwned` 스탬프 처리를 담당합니다. |
| `search/` | 기록·지출 등 통합 검색 쿼리와 결과 정렬을 담당합니다. |
| `sync/` | Supabase 동기화 큐·백그라운드 sync (Phase 4–5 대비)를 담당합니다. |
| `types/` | 도메인 공통 TypeScript 타입 정의를 담당합니다. |
| `config/` | 탭·섹션 ON/OFF, 로컬 사용자 ID 등 앱 설정을 담당합니다. |

### 코드 품질 원칙

- **Prettier + ESLint** — `npm run format`, `npm run lint`
- **함수 단일 책임** — validation · DB · toast를 한 함수에 섞지 않음
- **컴포넌트 분리** — `BudgetPage` → `BudgetSummarySection`, `ExpenseModal` 등
- **비즈니스/UI 분리** — 계산은 `budget/`, 표시는 `components/`
- **공통 utils** — `formatMoney()`, `calculatePercent()` 등

### 상태 관리

- **전역**: `SectionContext` (탭·섹션 ON/OFF), `SyncContext` (동기화)
- **페이지**: React `useState` + `useAsync` (IndexedDB 비동기 로드)
- Redux/Zustand 없음 — 단일 사용자 PWA에 맞게 단순 유지

### IndexedDB

- DB: `nanaki-db` — 지출·예산·체형·습관 등 store 분리
- `UserOwned` — 모든 레코드에 `userId: 'local-user'` (Supabase 대비)
- JSON/CSV 백업·복원 지원

자세히: [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md)

### PWA

- `vite-plugin-pwa` + custom service worker (`src/sw.ts`)
- 5173(dev) / 4173(preview) **저장소 분리** — 실사용은 설치 앱만
- install prompt · 업데이트 배너

---

## 스크린샷

> MVP 완성 후 추가 예정. 체크리스트: [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md)

<!--
| 홈 | 가계부 |
|:---:|:---:|
| ![홈](assets/screenshots/home.png) | ![가계부](assets/screenshots/budget.png) |

| 건강 | 기록 |
|:---:|:---:|
| ![건강](assets/screenshots/health.png) | ![기록](assets/screenshots/records.png) |
-->

---

## 기술 스택

React 19 · TypeScript · Vite · Tailwind 4 · IndexedDB (idb) · vite-plugin-pwa · ESLint · Prettier

## Git

`main` 브랜치만 사용. 커밋 형식은 `{타입}: {설명}` (한국어).

| 타입       | 용도                            |
| ---------- | ------------------------------- |
| `feat`     | 새 기능 추가                    |
| `fix`      | 버그 수정                       |
| `refactor` | 코드 구조 개선 (동작 변화 없음) |
| `style`    | UI 스타일만 변경                |
| `docs`     | 문서 수정                       |

자세히: [docs/ROADMAP.md — Git](docs/ROADMAP.md#git)

## 문서

| 문서                                           | 내용                                |
| ---------------------------------------------- | ----------------------------------- |
| [docs/ROADMAP.md](docs/ROADMAP.md)             | 개발 순서 · Phase 체크리스트        |
| [docs/LIFE_TAB.md](docs/LIFE_TAB.md)           | 생활 탭 스펙 · MVP                  |
| [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md)     | IndexedDB · UserOwned · 가계부 구조 |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | 디자인 토큰 · UI 패턴               |
| [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md)     | README 스크린샷 체크리스트          |
