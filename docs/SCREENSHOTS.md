# 스크린샷 체크리스트

앱 MVP 완성 후 README에 넣을 스크린샷 목록입니다.  
캡처 후 `assets/screenshots/`에 저장하고 README의 스크린샷 섹션 링크를 활성화하세요.

## 캡처 환경

- **4173 PWA** (설치 앱 또는 `npm run pwa`) 기준
- 다크/라이트 중 **하나**로 통일 (현재: 다크)
- 실제 사용 데이터 또는 최소한의 자연스러운 데이터

## 필수 화면

| 파일 | 화면 | MVP | 캡처 |
|------|------|-----|------|
| `budget.png` | 가계부 · 예산/차트 | ✅ | 🔜 |
| `health.png` | 건강 · 체형/영양제 요약 | ✅ | 🔜 |
| `supplements.png` | 영양제 전용 · 복용캘린더 | ✅ | 🔜 |
| `records.png` | 기록 · 검색 | 🔜 | 🔜 |
| `habits.png` | 습관 · 점수 | 🔜 | 🔜 |
| `home.png` | 홈 · 캘린더 | 🔜 | 🔜 |

> 탭 MVP가 끝난 화면부터 미리 캡처해도 됩니다. README에는 **전체 탭 완성 후** 한꺼번에 넣는 것을 권장합니다.

## README 반영 예시

```markdown
## 스크린샷

| 홈 | 가계부 |
|:---:|:---:|
| ![홈](assets/screenshots/home.png) | ![가계부](assets/screenshots/budget.png) |

| 건강 | 영양제 |
|:---:|:---:|
| ![건강](assets/screenshots/health.png) | ![영양제](assets/screenshots/supplements.png) |
```

## 완료 시

- [ ] `assets/screenshots/`에 PNG 추가
- [ ] README 스크린샷 섹션 주석 해제
- [ ] GitHub에서 이미지 렌더 확인
- [ ] [ROADMAP.md](./ROADMAP.md) Phase 2 스크린샷 항목 체크
