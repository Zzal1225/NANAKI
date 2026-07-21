# NANAKI

**나는 나를 키운다.**

검색 중심 개인 라이프 로그 PWA.

---

## 핵심 철학

> 모든 데이터를 기록하고, 검색 가능하게 만든다.

- 로컬 퍼스트 · 검색 가능 · 1인 운영 도구

---

## 기술 스택

React · TypeScript · Vite · Tailwind · **IndexedDB (`idb`)** · PWA  
(예정) Supabase

---

## 핵심 기능

| 영역 | 상태 |
|------|------|
| 가계부 | MVP 완성 |
| 건강 · 생활 · 기록 · 습관 · 홈 | 작업 중 |

상세: [docs/ROADMAP.md](docs/ROADMAP.md)

---

## 실행

| 명령 | URL | 용도 |
|------|-----|------|
| `npm run dev` | :5173 | UI 개발 |
| `npm run pwa` | :4173 | **설치·실사용** (저장소 분리) |

```bash
npm install && npm run pwa
```

---

## 문서

설계 기록은 `docs/` 한곳. **README는 이 파일뿐.**

```
docs/
├── ROADMAP.md · ARCHITECTURE.md · DECISIONS.md · CHANGELOG.md
└── modules/   accounting · health · routine · archive · habit
```

---

## Git

`main` · `{타입}: {한국어}` (feat / fix / refactor / style / docs)
