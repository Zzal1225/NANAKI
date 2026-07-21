# 가계부 (accounting)

경로: `/budget`  
**상태: MVP 완성** (사용자 확정)

---

## 목적

가계부 작성 · 예산 관리 · 카테고리별 소비 분석.

---

## 포함

- 지출 등록 (고정/변동)
- 고정지출 월별 반복·버전 (`recurringTemplateId`, `effectiveFrom`, …)
- 카테고리 마스터 · 월 예산 · 전월 복사
- 도넛(**사용** 비중) · 진행바 · 추세 · 무지출 DAY · 검색
- 월 범위: 최초 데이터 ~ 이번 달+3개월

---

## 제외 (의도적)

| 제외           | 이유                           |
| -------------- | ------------------------------ |
| OCR 영수증     | 정확도·유지비. MVP는 수동 기록 |
| 은행 연동      | 보안·심사. 로컬 퍼스트와 충돌  |
| 카드 연동      | 동일                           |
| 수입 전용 장부 | 1차는 지출·예산 중심           |
| 공동 가계부    | 1인 제품                       |
| 다중 통화      | 불필요 복잡도                  |

---

## 데이터 (필드 + 왜)

### BudgetCategory (임베드, store 없음)

| 필드 | 설명   |
| ---- | ------ |
| id   | FK     |
| name | 표시명 |

**왜 별도 store 아닌가?** 수가 적고 설정 백업에 넣기 쉬움.

### BudgetSettings (월 1문서)

| 필드                             | 설명        |
| -------------------------------- | ----------- |
| id, month                        | `YYYY-MM`   |
| totalBudget                      | 보조 총액   |
| categories / enabledCategoryIds? | 활성 스냅샷 |
| budgetItems[]                    | 아래        |

### CategoryBudgetItem

| 필드                       | 설명         |
| -------------------------- | ------------ |
| id, categoryId, amount     |              |
| subItem?, isCategoryTotal? | 세부/합계 행 |
| isFixed?, fixedDay?        | 고정 성격    |

**왜 카테고리 마스터는 AppSettings, 금액만 월별?**  
이름 변경이 전월에 반영되고, 월마다 금액만 달라지게.

### Expense

| 필드                                                     | 설명                       |
| -------------------------------------------------------- | -------------------------- |
| id, date, amount                                         |                            |
| categoryId                                               | → 카테고리 (관계)          |
| categoryName                                             | **스냅샷** (이력·CSV·검색) |
| type                                                     | `fixed` \| `variable`      |
| subItem?                                                 |                            |
| recurringTemplateId?, fixedDay?, isRecurringMonthly?     | 반복                       |
| effectiveFrom?, recurringStartMonth?, recurringEndMonth? | 버전·구간                  |

**왜 categoryName을 같이 쓰나?**  
id만 있으면 이름 변경 시 과거 목록이 깨짐.  
**관계 = id, 표시 이력 = name.**

고정지출은 DB에 매달 다 심지 않고, 조회 시 materialize.

---

## 프로세스 — 지출 저장

```
사용자
  ↓
모달 입력 · 검증
  ↓
고정? saveFixedExpense : saveExpense
  ↓
IndexedDB expenses
  ↓
BudgetPage reload → 집계 → 도넛·바·요약
```

---

## 프로세스 — 예산 진행률

```
1. 사용자가 지출 등록
2. Expense 저장
3. 해당 월 Expense 중 categoryId 필터
4. spent = 합계
5. BudgetSettings.budgetItems 에서 카테고리 budget 조회
6. progress 색·라벨: spent vs budget
   · budget≤0 → 미설정
   · spent>budget → 초과(danger)
   · 근접 → warning
   · 여유 → success
7. BudgetBar UI 업데이트
```

도넛 조각: 카테고리 spent **내림차순**, 좁으면 짧은 라벨/툴팁.  
「카테고리별 예산」제목·설정은 도넛 **아래**.

---

## UI 계층

1. 요약 (이번 달 지출 · 무지출 · 이번 주 + 추세)
2. 도넛 = 사용 비중
3. 카테고리별 예산 + 진행바
