# 블로그 발행 트래커 — 2026-07 신규 3편 (기록·통계 / 축구 포메이션 / 풋살 6대6 포지션)

> 작성: 2026-07-09 (115차). 초안 3편 × 3채널 = 9파일 전부 작성 완료. **아직 미발행 — 내일부터 차례대로 발행.**
> 근거: 네이버 서치어드바이저 실측 키워드 + 네이버 블로그 유입경로 (2026-07-09 사용자 제공).
> 원칙: 같은 날 몰아 발행 금지(스팸 페널티). 자체도메인 → 네이버 → 티스토리 순, 하루 이상 간격.

---

## 발행 순서 & 체크리스트

### 1편) 조기축구 경기 기록·통계 앱 (기록·통계) — slug: `soccer-team-stats-app`
- 타깃 키워드: 조기축구 기록용 앱 / 축구팀 엑셀관리 / appsheet 출석부 / 조기축구 통계
- [ ] **자체도메인** — 코드 push → Vercel 배포 시 라이브: `/guide/soccer-team-stats-app`
  - 파일: `src/lib/guides/posts/soccer-team-stats-app.tsx` (registry 등록 완료, sitemap 자동)
  - 발행 후: 네이버 서치어드바이저 수집요청 + GSC URL 검사 → 색인요청 (자체도메인만!)
- [ ] **네이버** — `docs/blog-guide-soccer-team-stats-app-naver.md` 붙여넣기 (추가 작업 없음)
- [ ] **티스토리** — `docs/blog-guide-soccer-team-stats-app-tistory.md` 붙여넣기 (추가 작업 없음)

### 2편) 축구 포메이션 짜는 법 (전술) — slug: `soccer-formation-guide`
- 타깃 키워드: 축구 포메이션 짜기 / 축구 라인업 짜기 / 축구 포지션 짜는 앱 / 4-4-2 / 4-3-3
- 카니발 방지: 기존 `lineup-position-builder`="빌더 사용법" ↔ 이 글="포메이션 선택법(언제 뭘)"
- [ ] **자체도메인** — `/guide/soccer-formation-guide` (파일: `src/lib/guides/posts/soccer-formation-guide.tsx`)
  - 발행 후: 서치어드바이저 수집요청 + GSC 색인요청 (자체도메인만)
- [ ] **네이버** — `docs/blog-guide-soccer-formation-guide-naver.md`
- [ ] **티스토리** — `docs/blog-guide-soccer-formation-guide-tistory.md`

### 3편) 풋살 6대6 포지션 (전술) — slug: `futsal-6v6-positions`
- 타깃 키워드: 풋살 6대6 포지션 / 6명 풋살 포지션 / 풋살 6대6 포메이션 / FIXO ALA PIVO / pivo fixo
- 카니발 방지: 기존 `futsal-tactics-app`="전술판 툴" ↔ 이 글="포지션 역할 설명"
- [ ] **자체도메인** — `/guide/futsal-6v6-positions` (파일: `src/lib/guides/posts/futsal-6v6-positions.tsx`)
  - 발행 후: 서치어드바이저 수집요청 + GSC 색인요청 (자체도메인만)
- [ ] **네이버** — `docs/blog-guide-futsal-6v6-positions-naver.md`
- [ ] **티스토리** — `docs/blog-guide-futsal-6v6-positions-tistory.md`

---

## 발행 일정

- **자체도메인 3편: 2026-07-09 push로 일괄 배포·라이브** (publishedAt 전부 7/9). 자체 도메인은 스팸 위험 낮아 동시 배포 무방.
- **네이버·티스토리: 반드시 하루씩 띄워 순차 발행** (사용자 수동 붙여넣기). 권장 순서 아래.

| 날짜 | 네이버 | 티스토리 |
|------|--------|---------|
| 7/10(금) | 1편 기록·통계 | — |
| 7/11(토) | 2편 포메이션 | 1편 기록·통계 |
| 7/12(일) | 3편 풋살포지션 | 2편 포메이션 |
| 7/13(월) | — | 3편 풋살포지션 |

> 자체도메인 발행(push) 후: 3편 각각 네이버 서치어드바이저 수집요청 + GSC URL 색인요청.

## 발행 후 후속 (채널별 — 절대 혼동 금지)
- **자체도메인만**: 네이버 서치어드바이저 수집요청 + GSC URL 색인요청
- **네이버·티스토리**: 추가 작업 0 (플랫폼 자동 색인). 서치어드바이저 추천 금지.

## 사실 검증 완료 (코드 대조 2026-07-09)
- 기록·통계: `getRecordsData.ts`(득점·도움·MVP·출석률·팀전적), `getGoalkeeperStats`(무실점), `getDefenderStats.ts`(수비 포인트 무실점쿼터×2+무실점경기×3), 레거시 이관.
- 포메이션: `formations.ts` 11인제 10종 + 8·9·10인제. 11인제만 역할가이드 노출(8~10인제 조용히 미노출).
- 풋살: `formations.ts` 풋살 3~8인, 6인(=6대6) 2-2-1·1-3-1·2-1-2 / 5인 1-2-1. `positionRoles/base/futsal.ts` FIXO·ALA·PIVO 역할.
- 수치: "150여 팀"(현재 152, 데모 제외 실측). 평점(OVR)은 잠정도입·노출최소화 정책이라 3편 모두 미언급.
