# DECISIONS

왜 이렇게 설계했는가. 기능 추가 전 충돌 여부 확인.

---

## 제품

**Q. 홈을 하단 탭에서 뺀 이유?**  
A. 홈은 기능이 아니라 **Dashboard**.

**Q. 검색 중심?**  
A. 라이프 로그 가치는 쌓기보다 **다시 찾기**.

**Q. 멀티유저/공유 냉장고 없음?**  
A. “나는 나를 키운다” — 1인 도구.

---

## 인프라

**Q. IndexedDB?**  
A. PWA 오프라인·설치 앱.

**Q. Dexie 아니고 `idb`?**  
A. 스키마를 얇게 직접 통제.

**Q. Firebase 안 씀?**  
A. 1차 = 로컬 퍼스트. 클라우드는 Supabase Phase 4–5.

**Q. 모든 레코드 `userId`?**  
A. 추후 Auth·Migration 자리. backfill 구현은 서버 이후.

**Q. Expense에 `categoryName` 중복?**  
A. `categoryId`=관계, `categoryName`=이름 변경·CSV용 **스냅샷**.

---

## 가계부

**Q. 은행/카드/OCR 없음?**  
A. 범위·보안·유지비. 수동 기록이 철학과 맞음.

**Q. 미래 월 +3개월?**  
A. 선입력은 필요, 무한 미래는 노이즈. 전 탭 통일.

**Q. 도넛 ≠ 예산 차트?**  
A. 조각 = **사용 비중**. 예산 UI는 아래.

---

## 건강 · 알림

**Q. 체중/둘레/눈바디 분리?**  
A. 주기·UX·오늘 할 일 due가 다름.

**Q. 백그라운드 푸시 없음?**  
A. 로컬「오늘 할 일」먼저. FCM은 **로그인·동기화 이후 옵션**.  
채널 분리: `notifications/` (builder) vs `push/PushProvider`.

**Q. 영양제 외부 API 없음?**  
A. 핵심은 내 성분 합산·복용률.

---

## 생활

**Q. 냉장고 status 컬럼 없음?**  
A. `expiresAt`으로 계산 — 중복 상태 버그 방지.

**Q. 구매주기 store 없음?**  
A. Expense 집계로 충분, 중복 데이터 방지.
