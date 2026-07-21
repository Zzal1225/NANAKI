# 기록 (archive)

경로: `/records`  
**상태: 작업 중** (MVP 미완성)

---

## 목적

개인 경험(제품·장소·시술 등)을 남겨 **검색**.  
생활 냉장고 등과 **링크** 가능한 아카이브.

---

## 포함

- CRUD (`product` / `place` / `treatment` / `other`)
- 별점 · 태그 · 메모 · 월 필터 · 검색 · 통합 검색

## 예정

- 유형 정리 · **활동(운동)** 통합 (구 운동 탭)

---

## 제외

| 제외 | 이유 |
|------|------|
| SNS 공유 | 로컬 프라이버시 |
| 서버 풀텍스트 | 로컬 MVP |
| 대용량 갤러리 | 눈바디와 역할 분리 |

---

## 데이터 (필드 + 왜)

### ArchiveItem

| 필드 | 설명 |
|------|------|
| id, date | |
| type | product / place / treatment / other |
| title | |
| rating?, tags, memo?, location? | |

**왜 미디어 store를 안 붙이나?** 눈바디(`bodyPhotos`)와 역할 분리, 용량.

상태: **작업 중**. ROADMAP상 고도화·활동 통합 예정.
