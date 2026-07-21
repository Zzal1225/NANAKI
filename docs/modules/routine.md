# 생활 (routine)

경로: `/life`  
**상태: 작업 중** (MVP 미완성)

---

## 목적

1인 가구 **집·물건·주기 루틴** 운영.

---

## 포함

- 반복 관리: CRUD · 완료→`nextDueAt` · 권장 주기 템플릿
- 냉장고: 유통기한 · fresh/soon/expired **계산** · 기록 링크
- 구매 주기: 가계부 Expense 집계 (**별도 store 없음**)
- 검색 `life` · 홈 뱃지 · 포그라운드 알림

그룹: `chores` | `consumables` | `health` | `custom`

---

## 제외

| 제외 | 이유 |
|------|------|
| 바코드/쇼핑몰 연동 | 외부 의존·범위 |
| 공유 냉장고 | 1인 제품 |
| status DB 컬럼 | `expiresAt`+오늘로 파생 (불일치 방지) |

---

## 데이터 (필드 + 왜)

### LifeRoutine

| 필드 | 설명 |
|------|------|
| id, name, group | |
| intervalDays | |
| suggestedIntervalDays? | 템플릿 힌트 |
| lastDoneAt?, nextDueAt | |
| notes? | |

**왜 due 상태 컬럼 없음?** `nextDueAt`과 오늘로 계산.

### PantryItem

| 필드 | 설명 |
|------|------|
| id, name, emoji? | |
| purchasedAt?, expiresAt | |
| quantity?, unit? | |
| linkedArchiveIds? | → ArchiveItem |

---

## 프로세스 — 반복 완료

```
완료 탭
  → lastDoneAt = 오늘
  → nextDueAt = last + intervalDays
  → saveLifeRoutine
  → 목록 · 홈 뱃지 · 오늘 할 일
```

## 프로세스 — 구매 주기

```
Expense (subItem/categoryName 등) 로드
  → purchaseCycles 집계
  → 생활 탭에 표시
```
(추가 테이블 없음)
