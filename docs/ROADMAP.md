# ROADMAP

“이 기능은 왜 없나요?” → 이 문서로 답한다.

---

## 전략

```
탭 MVP(로컬) → PWA 실사용 → UX → 스키마 확정 → Supabase → 로그인·동기화 → (옵션) FCM
```

Migration/backfill은 **Supabase 이후**. 지금은 `userId` 자리만.

**MVP 완성 표기:** 사용자가 「이 탭은 MVP 완성」이라고 하기 전에는 문서·커밋에 완료로 쓰지 않는다.  
→ `.cursor/rules/mvp-status.mdc`

---

## 상태

| 영역 | 상태 | 한 줄 |
|------|------|------|
| 가계부 | **MVP 완성** | [modules/accounting.md](./modules/accounting.md) |
| 건강 | 작업 중 | [modules/health.md](./modules/health.md) |
| 생활 | 작업 중 | [modules/routine.md](./modules/routine.md) |
| 기록 | 작업 중 | [modules/archive.md](./modules/archive.md) |
| 습관 | 작업 중 | [modules/habit.md](./modules/habit.md) |
| 홈 | 작업 중 | 오늘 할 일 등 부분 구현 |
| PWA 배포 | 예정 | Netlify · 실사용 |
| 로그인·동기화 | 후순위 | 로컬 검증 후 |
| FCM | 옵션 | 동기화 이후 |

---

## Phase

1. **탭 MVP** — 가계부만 완성 · 나머지 탭 작업 중
2. **PWA 실사용** — HTTPS · install · 2주 피드백
3. **스키마 확정** — ERD 문서
4. **Supabase** — 테이블 · RLS
5. **Auth · 동기화** — (+ 옵션 FCM)

---

## 빠른 답변

| 질문 | 답 |
|------|-----|
| 건강/생활이 없어 보이나요? | **작업 중.** 가계부만 MVP 완성으로 확정 |
| 은행/카드/OCR? | 의도적 제외 — accounting 모듈 |
| 백그라운드 푸시? | 후순위 — 오늘 할 일(로컬) 먼저 |
| 공유 냉장고? | 1인 제품 제외 |
| 운동 탭? | 제거 → 추후 기록/활동 |

---

## Git

`main`만. 커밋 `{타입}: {한국어}` — feat / fix / refactor / style / docs.  
탭 MVP 완성을 커밋 메시지에 넣지 말 것 (사용자 승인 전).
