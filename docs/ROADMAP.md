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
| 건강 MVP | 내몸 · 건강 기록 | 🔜 |
| 운동 MVP | 운동 기록 | 🔜 |
| 기록 MVP | 아카이브 | 🔜 |
| 습관 MVP | 일일 체크 | 🔜 |
| 홈 대시보드 | 캘린더 · 분석 | 🔜 |
| PWA 배포 | Netlify · install | 🔜 |
| UX 개선 | 실사용 피드백 | 🔜 |
| Supabase | 테이블 · RLS | 🔜 |
| 로그인 · 동기화 | Auth · Migration | 🔜 |

### 가계부 MVP — 완료

- [x] 카테고리별 예산 · 고정/변동 지출
- [x] 고정지출 월별 반복 · 버전 관리
- [x] 도넛 차트 · 세부항목 · 전월 예산 복사
- [x] 지출 검색 · JSON/CSV 백업 호환

---

## Git

**목적: 백업 + 버전 관리.** 브랜치·태그는 최소화합니다.

- **`main`만** 사용 (일상 작업·커밋·푸시)
- Supabase·로그인처럼 **규모가 큰 작업**만 `feature/supabase` 등 임시 브랜치 → merge 후 삭제
- **태그 사용 안 함**

### 커밋 메시지 (한국어, 직관적으로)

```
feat: 가계부 탭 완성
feat: 건강 탭 추가
feat: 운동 탭 추가
feat: 기록 탭 추가
feat: 습관 탭 추가
feat: 홈 대시보드 추가
feat: PWA 적용
fix: 고정지출 월별 삭제 오류 수정
docs: README 정리
feat: Supabase 연동
feat: 로그인 기능 추가
```

기능 완성·추가 단위로 `main`에 바로 커밋합니다.

---

## 데이터 모델 원칙

로그인이 없어도 **모든 사용자 데이터 타입에 `userId`를 포함**합니다.  
**지금은 backfill·Migration을 구현하지 않습니다.**

```typescript
export const LOCAL_USER_ID = 'local-user'

interface UserOwned {
  userId: UserId
  createdAt: string
  updatedAt?: string
}
```

- **저장 시**: `stampUserOwned()` — `src/db/recordDefaults.ts`
- **읽기 시**: `ensureUserOwned()` — 백업 import 등
- **Supabase 이후**: `user_id` + RLS · Migration은 로그인 단계에서 구현

자세한 스키마: [DATA_SCHEMA.md](./DATA_SCHEMA.md)

---

## Phase별 체크리스트

### Phase 1 — 탭별 MVP 🔜

- [x] 가계부
- [ ] 건강 (내몸 · 건강)
- [ ] 운동
- [ ] 기록 (아카이브)
- [ ] 습관
- [ ] 홈 대시보드
- [x] `UserOwned` 타입 · 목업 제거

### Phase 2 — PWA · 실사용

- [ ] Netlify · HTTPS
- [ ] install · service worker 검증
- [ ] 2주 실사용 · UX 피드백

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
- [../README.md](../README.md) — 실행 · 아키텍처
