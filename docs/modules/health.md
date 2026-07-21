# 건강 (health)

경로: `/health` · `/health/supplements`  
**상태: 작업 중** (MVP 미완성)

---

## 목적

몸 측정·변화 기록 · 영양제 성분/복용 관리.

---

## 포함

**체형**

| 섹션 | 기능 |
|------|------|
| 체중 | 기록 · **전 측정 대비** 변화량 · 주기 |
| 신체둘레 | 기본 허리/엉덩이/허벅지/팔 + **부위 추가** · 주기 |
| 눈바디 | 업로드 · 이전 30% 오버레이 · compare-slider · 주기 |

홈「오늘 할 일」에 섹션별 due.

**영양제** — 제품·성분 합산 · 복용 캘린더·복용률 · 포그라운드 `alarmTime` 알람.

---

## 제외

| 제외 | 이유 |
|------|------|
| 영양제 외부 API | 핵심은 내 성분 분석 |
| 카메라 가이드라인 UI | 오버레이로 각도 유도 |
| 생리·혈압·혈당·수면·병원 UI | 범위 축소 (store 호환만) |
| 운동 탭 | 추후 기록/활동 |
| 백그라운드 푸시 복용 알림 | 알림 전략 후순위 |

---

## 데이터 (필드 + 왜)

### BodyRecord

| 필드 | 설명 |
|------|------|
| id, date | |
| weight?, bodyFat? | |
| measurements? | `{ [partId]: cm }` |

같은 날 묶음 저장. UI 입력은 섹션 분리.

### BodyPhotoRecord

| 필드 | 설명 |
|------|------|
| id, date | |
| mimeType | `image/jpeg` |
| blob | Blob — **JSON 백업 제외** (용량) |

업로드: max **1200px**, JPEG **0.8**.

### AppSettings (체형)

| 필드 | 설명 |
|------|------|
| bodySectionIntervals | `weight` \| `circumference` \| `photo` (일) |
| circumferenceParts | `{ id, name, builtin? }` |

**왜 메트릭마다 주기 안 두고 섹션 3개?** due·UX 단위가 섹션.

### SupplementProduct / IntakeLog

제품에 nutrients·schedule·purchaseHistory.  
완료는 `productId + date + scheduleKey` 로그.

---

## 프로세스 — 눈바디

```
1. 사진 선택
2. 첫 사진? → 각도 안내 모달 → 압축 저장
3. 이후? → 이전 사진 30% 오버레이 확인 → 저장
4. compressBodyPhoto(1200, 0.8)
5. saveBodyPhoto (Blob)
6. 목록 · 비교 슬라이더 갱신
```

## 프로세스 — 오늘 할 일(체형)

```
intervals로 due?
  → 체중 / 신체둘레 / 눈바디 라벨
  → 오늘 기록 있으면 done
  → 홈 체크리스트
```
