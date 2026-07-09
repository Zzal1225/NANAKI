# Nanaki 로드맵

개발 순서와 데이터·배포 계획입니다.

## 작업 순서

**Migration·backfill은 Supabase 연동 이후에만** 구현합니다.  
지금은 `userId`가 들어갈 **타입·필드 자리만** 설계해 둡니다.

```
탭별 MVP 완성
    ↓
PWA 배포 · 실사용
    ↓
UX 개선
    ↓
데이터 구조 확정
    ↓
Supabase 연동
    ↓
로그인 · 동기화 (Migration)
```

---

## 진행 현황

| 단계 | 내용 | 상태 |
|------|------|------|
| 가계부 MVP | 예산 · 고정/변동 · 반복 · 차트 · 검색 | ✅ |
| 체형 MVP | 체중 · 둘레 · 측정주기 · 눈바디 (건강 탭 체형 섹션) | ✅ |
| **건강 · 영양제 MVP** | 성분 합산 · 재구매 · 복용캘린더 · 복용률 | ✅ **현재** |
| 코드 품질 | BudgetPage 분리 · ESLint/Prettier · README | ✅ |
| **기록 MVP** | 검색 · 유형 · (추후 활동) | 🔜 **다음** |
| 습관 MVP | 일일 체크 · 점수 | 🔜 |
| 홈 대시보드 | 캘린더 · 분석 · 통합 검색 | 🔜 |
| PWA 배포 | Netlify · install | 🔜 |
| UX 개선 | 실사용 피드백 · 무소비 등 | 🔜 |
| Supabase | 테이블 · RLS | 🔜 |
| 로그인 · 동기화 | Auth · Migration | 🔜 |

### 가계부 MVP — 완료

- [x] 카테고리별 예산 · 고정/변동 지출
- [x] 고정지출 월별 반복 · 버전 관리
- [x] 도넛 차트 · 세부항목 · 전월 예산 복사
- [x] 지출 검색 · JSON/CSV 백업 호환

### 체형 → 건강 탭 · 영양제 — 완료

- [x] 탭명 `체형` → `건강` (`/health`, 구 `/body` 리다이렉트)
- [x] 체형 섹션: 체중 · 둘레 · 눈바디 · 측정 주기
- [x] 영양제 요약 + 전용 페이지 (`/health/supplements`)
- [x] 신규 등록 / 기존 재구매 · 성분 미리보기
- [x] 합산 성분 · 구매 이력 · 복용 캘린더 · 복용률
- [x] 복용 종료 · 알람(포그라운드 Notification)
- [x] 시드 카탈로그 + 개인 DB 자동완성

### 범위에서 제외 / 보류

| 항목 | 상태 |
|------|------|
| 생리 · 혈압 · 혈당 · 수면 · 병원 | UI 제거 (store는 백업 호환용으로만 유지) |
| 운동 탭 | 제거 → 추후 **기록 > 활동**으로 통합 |
| 영양제 외부 API 자동 검색 | 미구현 — 성분 분석이 핵심 |
| 무소비 (변동 지출 없는 날) | 가계부 UX 개선 시 |
| 홈 | 모든 탭 MVP 후 |

---

## Git

**목적: 백업 + 버전 관리.** 브랜치·태그는 최소화합니다.

- **`main`만** 사용 (일상 작업·커밋·푸시)
- Supabase·로그인처럼 **규모가 큰 작업**만 `feature/supabase` 등 임시 브랜치 → merge 후 삭제
- **태그 사용 안 함**

### 커밋 규칙

형식: `{타입}: {한국어 설명}` — 설명은 **무엇을 했는지** 직관적으로.

| 타입 | 용도 | 예시 |
|------|------|------|
| `feat` | 새 기능 추가 | `feat: 건강 탭 영양제 추가` |
| `fix` | 버그 수정 | `fix: 고정지출 월별 삭제 오류 수정` |
| `refactor` | 코드 구조 개선 (동작 변화 없음) | `refactor: BudgetPage 분리` |
| `style` | UI 스타일만 변경 | `style: 가계부 카드 간격 조정` |
| `docs` | 문서 수정 | `docs: DATA_SCHEMA 영양제 도메인 추가` |

```
feat: 가계부 탭 완성
feat: 체형 탭 추가
feat: 건강 탭으로 개편 및 영양제 MVP
fix: 고정지출 월별 삭제 오류 수정
refactor: BudgetPage 분리, ESLint/Prettier 추가 및 README 정리
docs: ROADMAP 커밋 규칙 추가
feat: 기록 탭 추가
```

기능 완성·추가 단위로 `main`에 바로 커밋합니다.

---

## 데이터 모델 원칙

로그인이 없어도 **모든 사용자 데이터 타입에 `userId`를 포함**합니다.  
**지금은 backfill·Migration을 구현하지 않습니다.**

자세한 스키마: [DATA_SCHEMA.md](./DATA_SCHEMA.md)

---

## Phase별 체크리스트

### Phase 1 — 탭별 MVP

- [x] 가계부
- [x] 건강 (체형 섹션 + 영양제)
- [x] 코드 품질 (컴포넌트 분리 · ESLint/Prettier · Architecture README)
- [ ] 기록 (검색 · 유형 · 활동 통합 예정)
- [ ] 습관
- [ ] 홈 대시보드
- [x] `UserOwned` 타입 · 목업 제거

### Phase 2 — PWA · 실사용

- [ ] Netlify · HTTPS
- [ ] install · service worker 검증
- [ ] 2주 실사용 · UX 피드백
- [ ] README 스크린샷 (`assets/screenshots/`)

### Phase 3 — 데이터 구조 확정

- [ ] Supabase ERD · Migration 스펙 (구현은 로그인 단계)

### Phase 4 — Supabase

- [ ] 테이블 · RLS · 어댑터

### Phase 5 — 로그인 · 동기화

- [ ] Migration (backfill)
- [ ] Auth · Desktop/Mobile 동기화

---

## 관련 문서

- [DATA_SCHEMA.md](./DATA_SCHEMA.md) — IndexedDB · 타입 정의
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — UI 패턴
- [SCREENSHOTS.md](./SCREENSHOTS.md) — README 스크린샷 체크리스트
- [../README.md](../README.md) — 실행 · 아키텍처
