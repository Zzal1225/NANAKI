# Nanaki

기억을 기록하고, 언제든 다시 찾는 검색 중심 개인 라이프 로그 PWA

## URL 구분 (중요)

| 명령          | URL                   | 용도            | 데이터                        |
| ------------- | --------------------- | --------------- | ----------------------------- |
| `npm run dev` | http://localhost:5173 | UI 개발·수정    | **5173 전용** (PWA 설치 불가) |
| `npm run pwa` | http://localhost:4173 | **설치·실사용** | **4173 / 설치 앱 전용**       |

**5173과 4173은 저장소가 완전히 다릅니다.** 실제 기록은 4173에서 설치한 앱으로만 사용하세요.

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

| 탭          | 내용                            | MVP |
| ----------- | ------------------------------- | --- |
| 가계부 | 카테고리별 예산, 고정/변동 지출 | ✅ |
| 체형 | 체중 · 둘레 · 측정주기 · 눈바디 | ✅ |
| 기록 | 개인 검색 · 기록 보관 | 🔜 |
| 운동 | *(기록 > 활동으로 통합 예정)* | — |
| 습관        | 일일 체크                       | 🔜  |
| 홈          | 캘린더, 30일 비교, 통합 검색    | 🔜  |

로드맵: [docs/ROADMAP.md](docs/ROADMAP.md)

---

## 아키텍처 (포트폴리오)

### 폴더 구조

```
src/
├── pages/           # 탭별 페이지 (라우트 진입점)
├── components/      # UI — common · layout · budget · dashboard …
├── budget/          # 가계부 도메인 로직 (예산·반복·집계)
├── db/              # IndexedDB CRUD · 마이그레이션 · UserOwned
├── export/          # JSON/CSV 백업·복원
├── context/         # SectionContext · SyncContext
├── hooks/           # useAsync 등
├── home/            # 홈 분석 집계
├── search/          # 통합 검색
├── sync/            # 동기화 큐 (Supabase 대비)
├── pwa/             # SW 등록 · 업데이트 프롬프트
├── types/           # 공통 타입 (UserOwned 포함)
└── config/          # 섹션 ON/OFF · LOCAL_USER_ID
```

### 컴포넌트 분리

- **페이지** — 데이터 로드·상태·모달 조합 (`BudgetPage`)
- **섹션** — 탭 내부 기능 단위 (`HealthSection`, `ExerciseSection`)
- **common** — `Modal`, `Card`, `Calendar` 등 재사용 UI
- **도메인** — UI 없는 순수 로직 (`budget/recurringFixed.ts`, `categoryMatch.ts`)

### 상태 관리

- **전역**: `SectionContext` (탭·섹션 ON/OFF), `SyncContext` (동기화)
- **페이지**: React `useState` + `useAsync` (IndexedDB 비동기 로드)
- Redux/Zustand 없음 — 단일 사용자 PWA에 맞게 단순 유지

### IndexedDB

- DB: `nanaki-db` — 지출·예산·건강·습관 등 store 분리
- `UserOwned` — 모든 레코드에 `userId: 'local-user'` (Supabase 대비)
- `stampUserOwned()` / `ensureUserOwned()` — 저장·읽기 시 타임스탬프 처리
- JSON/CSV 백업·복원 지원

자세히: [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md)

### PWA

- `vite-plugin-pwa` + custom service worker (`src/sw.ts`)
- 5173(dev) / 4173(preview) **저장소 분리** — 실사용은 설치 앱만
- install prompt · 업데이트 배너

### Supabase (예정)

- Phase 4: 테이블 · RLS · IndexedDB 어댑터
- Phase 5: Auth · Migration · Desktop/Mobile 동기화
- 대규모 작업 시 `feature/supabase` 브랜치만 임시 사용

### 성능

- 탭·페이지 단위 코드 분할 (Vite lazy route 가능)
- IndexedDB 인덱스 (`by-date`, `by-month` 등)로 월별 조회
- `useMemo`로 차트·집계 데이터 캐싱

---

## 기술 스택

React 19 · TypeScript · Vite · Tailwind 4 · IndexedDB (idb) · vite-plugin-pwa

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
| [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md)     | IndexedDB · UserOwned · 가계부 구조 |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | 디자인 토큰 · UI 패턴               |
