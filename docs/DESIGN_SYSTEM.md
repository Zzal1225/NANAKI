# 디자인 시스템

## 스택

- **Tailwind CSS v4** — `@import 'tailwindcss'` + `@theme` 블록
- **Pretendard Variable** — `public/fonts/PretendardVariable.woff2` 로컬 로드
- **lucide-react** — 아이콘

설정 파일: `src/index.css`, 폼 유틸: `src/components/common/Modal.tsx`

---

## 디자인 토큰 (`src/index.css`)

`@theme`에 CSS 변수로 정의 → Tailwind 유틸 클래스로 사용.

### Surface (배경 계층)

| 토큰 | 값 | 클래스 | 용도 |
|------|-----|--------|------|
| `--color-surface` | `#1a1625` | `bg-surface` | 페이지 배경 |
| `--color-surface-raised` | `#241f33` | `bg-surface-raised` | 카드, 모달 |
| `--color-surface-overlay` | `#2e2840` | `bg-surface-overlay` | hover, 입력 중첩 |

### Text

| 토큰 | 클래스 | 용도 |
|------|--------|------|
| `--color-text-primary` | `text-text-primary` | 본문, 제목 |
| `--color-text-secondary` | `text-text-secondary` | 라벨, 부제 |
| `--color-text-muted` | `text-text-muted` | 보조, placeholder |

### Accent & Semantic

| 토큰 | 클래스 | 용도 |
|------|--------|------|
| `--color-accent` | `bg-accent`, `text-accent` | CTA, 활성 탭, 뱃지 |
| `--color-accent-dim` | `bg-accent-dim` | 버튼 hover |
| `--color-success` | `text-success` | 변동 지출 등 |
| `--color-warning` | `text-warning` | 예산 제안 배너 등 |
| `--color-danger` | `text-danger` | 에러, 초과 예산 |
| `--color-budget` | `text-budget` | 고정지출, 가계부 강조 |
| `--color-body` | `text-body` | 건강 · 체형 강조 |
| `--color-archive` | `text-archive` | 기록 탭 |
| `--color-habit-good` / `habit-bad` | — | 습관 |

### Border

| 토큰 | 클래스 |
|------|--------|
| `--color-border` | `border-border` |

### Font

```css
--font-sans: 'Pretendard Variable', Pretendard, system-ui, sans-serif;
```

---

## 전역 스타일 규칙

| 대상 | 처리 |
|------|------|
| `*` | `-webkit-tap-highlight-color: transparent` |
| `body` | `bg-surface`, `min-height: 100dvh`, `overscroll-behavior: none` |
| `input[type=number]` | 스핀 버튼 숨김 |
| `input[type=date]` | `color-scheme: dark`, 달력 아이콘 `invert(1)` |

---

## 레이아웃

`src/components/layout/Layout.tsx`

- `max-w-lg` 중앙 컬럼 (모바일 퍼스트)
- `px-4 pb-24` — 하단 탭바 여백
- 고정 하단 `nav`: `bg-surface-raised/95 backdrop-blur-lg`
- 활성 탭: `text-accent`, 비활성: `text-text-muted`
- 탭: 홈(상단 🏠) · 가계부 · 건강 · 생활 · 기록 · 습관 (`src/config/sections.ts`)
- 상단: **Nanaki** 텍스트(추후 로고) + 홈 아이콘 · 하단 탭 5개

---

## 공통 컴포넌트

### `Card` / `StatCard` — `src/components/common/Card.tsx`

```tsx
<Card className="...">          // rounded-2xl border bg-surface-raised p-4
<StatCard label value onClick /> // 요약 숫자 카드 (가계부 상단)
```

- 클릭 가능 시 `active:scale-[0.98]`

### `Modal` — `src/components/common/Modal.tsx`

- 모바일: bottom sheet (`items-end`), sm+: 중앙 다이얼로그
- `z-[100]`, 배경 `bg-black/60 backdrop-blur-sm`
- 본문 `max-h-[90dvh] overflow-y-auto`

**내보내는 폼 클래스 (페이지에서 import해 재사용):**

| export | 용도 |
|--------|------|
| `FormField` | 라벨 + children 세로 배치 |
| `inputClass` | 전폭 입력 (`w-full`) |
| `inputInlineClass` | flex 행 내 입력 (`flex-1 min-w-0`) |
| `selectClass` / `selectInlineClass` | select |
| `btnPrimary` | 저장 등 주 액션 |
| `btnSecondary` / `btnDanger` | 보조·위험 |

```tsx
import Modal, { FormField, inputClass, btnPrimary } from '../components/common/Modal'
```

**주의:** `inputClass`는 `w-full` 포함 → flex 한 줄 안에서는 `inputInlineClass` 사용.

### 도메인 컴포넌트

| 경로 | 역할 |
|------|------|
| `components/budget/*` | 가계부 UI (`BudgetOverview`, `ExpenseModal`, `BudgetSummarySection` …) |
| `components/body/*` | 체형 UI (`BodyMetricsSection`, `BodyPhotoSection`, 측정 주기) |
| `components/supplements/*` | 영양제 UI (요약 · 캘린더 · 추가 모달 · 합산 성분) |
| `components/search/GlobalSearch.tsx` | 홈 통합 검색 |
| `components/settings/SectionSettings.tsx` | 탭·섹션 ON/OFF |
| `components/pwa/InstallPrompt.tsx` | PWA 설치 (prod) |
| `components/pwa/UpdatePrompt.tsx` | SW 업데이트 배너 |

---

## 컴포넌트 작성 패턴

1. **페이지 vs 컴포넌트 vs 도메인 로직**  
   - 라우트 조합 · 상태 → `src/pages/*Page.tsx`  
   - 재사용·도메인 UI → `src/components/{domain}/`  
   - 계산·집계 (프레임워크 무관) → `src/budget/`, `src/body/`, `src/supplements/` 등  
   - 예: `HealthPage` → 체형 섹션 + `SupplementsSummarySection` → `/health/supplements`

2. **스타일**  
   - Tailwind 유틸만 사용 (별도 CSS Module 없음)  
   - 색·간격은 `@theme` 토큰 클래스 우선  
   - 카드: `rounded-2xl border border-border bg-surface-raised`  
   - 뱃지: `rounded-full bg-accent px-3 py-1.5 text-xs`

3. **데이터**  
   - `useAsync` + `src/db` CRUD  
   - 도메인 계산 → `src/budget/`, `src/utils/format.ts` 등

4. **아이콘**  
   - `lucide-react`, 크기 14–20px, `text-text-muted` 또는 컨텍스트 색

5. **모달 폼**  
   - `Modal` + `form.gap-4` + `btnPrimary` submit  
   - validation 에러만 `text-danger text-xs` (설명 문구 임의 추가 지양)

6. **페이지 헤더**  
   - `PageHeader` — 가계부 외 탭은 **subtitle 없음** (타이틀만)

---

## 간격·타이포 관례

| 용도 | 클래스 |
|------|--------|
| 페이지 섹션 간격 | `gap-5`, `pt-4` |
| 카드 내부 | `gap-1.5` ~ `gap-3`, `p-4` |
| 섹션 제목 | `text-sm font-semibold text-text-secondary` |
| 페이지 제목 | `text-xl font-bold` |
| 금액 강조 | `text-xl font-bold text-accent` |
| 숫자 입력 | `tabular-nums` |
