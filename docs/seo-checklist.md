# SEO 체크리스트 · 검색 노출 전략

> **문제 진단 (2026-04-21)**: 구글에서 "조기축구 팀관리", "pitch master", "피치마스터" 검색 시 pitch-master.app 미노출.
> **원인 추정**: (1) 신규 도메인 — 자연 인덱싱까지 수주 (2) Search Console 미등록/미제출 의심 (3) 백링크 부재 (4) 랜딩 h1 에 검색 키워드 없었음 (2026-04-21 수정)

---

## A. 코드 측 개선 (완료 / 진행)

- [x] `layout.tsx` keywords 확장 — "피치마스터"(한글) / "pitch master"(공백) / "조기축구 팀관리" / "조기축구 총무" / "무료 팀 관리" 등 20+ 추가 (2026-04-21)
- [x] `HeroSection.tsx` 에 `sr-only` h2 보조 헤딩 — 크롤러·스크린리더 노출, 디자인 영향 없음 (2026-04-21)
- [x] sitemap.ts / robots.ts 기본 세팅
- [x] JSON-LD SoftwareApplication + FAQPage
- [ ] **랜딩 p·h3 본문 내 자연 키워드 밀도 재검토** — 현재는 "총무", "카톡" 중심. "조기축구 팀 관리", "피치마스터" 가 본문 안에서 반복 노출되는지 확인
- [ ] **og-image 실제 존재 & 1200×630 권장 사이즈** 검증 — 카톡 공유 미리보기에 영향

---

## B. 검색엔진 등록 (수동 작업 — 사용자가 직접 실행)

### B-1. Google Search Console
1. https://search.google.com/search-console 접속
2. 속성 추가 → 도메인 `pitch-master.app` (**DNS 인증** 권장, URL 접두어보다 범용적)
3. DNS TXT 레코드 Cloudflare 에 추가 후 "확인"
4. 속성 진입 후 **Sitemaps** 메뉴 → `https://pitch-master.app/sitemap.xml` 제출
5. **URL 검사** 에서 아래 URL 각각 "색인 생성 요청":
   - `https://pitch-master.app`
   - `https://pitch-master.app/login`
6. 1~2주 후 **성능** 리포트에서 노출 쿼리 확인

**인증 메타 태그는 이미 [layout.tsx:28](src/app/layout.tsx#L28) `verification.google` 에 있음** — DNS 인증 하든 메타 태그 인증 하든 둘 중 하나 성공하면 OK.

### B-2. 네이버 서치어드바이저
1. https://searchadvisor.naver.com 접속 (네이버 계정)
2. 사이트 등록 → `https://pitch-master.app`
3. HTML 태그 방식 인증 — 제공받은 `<meta name="naver-site-verification" content="..." />` 를 `layout.tsx` metadata 의 `verification.other` 로 추가
4. sitemap 제출: `https://pitch-master.app/sitemap.xml`
5. RSS 제출 선택 (블로그 기능 없으면 skip)
6. 네이버는 수집·노출까지 2~4주

> **네이버 우선순위 높음**: "조기축구" 검색의 한국 비중이 네이버 쪽에서 의외로 큼. 네이버 서치어드바이저 등록 꼭.

### B-3. Bing Webmaster Tools (여유 있으면)
1. https://www.bing.com/webmasters
2. Google Search Console 연동으로 1-클릭 가져오기 지원

---

## C. 콘텐츠 작업 (중장기)

### C-1. 블로그 시리즈 게시
- 상태: 초안은 있음 ([docs/blog-post-1-draft.md](docs/blog-post-1-draft.md), [blog-post-2-draft.md](docs/blog-post-2-draft.md), [blog-series-plan.md](docs/blog-series-plan.md))
- **실제 게시 여부 확인 필요** — velog 또는 티스토리에 업로드 되어 있는지
- 게시하면 각 글 본문에서 pitch-master.app 앵커 링크 1~2회 (과하면 SEO 역효과)

### C-2. 조기축구 카페 홍보 글
- 초안: [docs/marketing-cafe-post.md](docs/marketing-cafe-post.md)
- 네이버 "모두의풋살", "조기축구연합" 등 카페
- 광고성 글은 삭제·블랙리스트 주의 — **경험담 형태**로 자연스럽게
- 링크는 글 맨 마지막 1회만

### C-3. 도메인에 서브 경로 콘텐츠 추가 (선택)
- `/guide` 페이지 — 사용법 가이드 (현재 `public/guide.html` 방치 중 → Next.js 마이그레이션)
- `/changelog` 또는 `/blog` — 업데이트 히스토리
- 유기 검색 진입 페이지 늘려 사이트 권위 상승

---

## D. 모니터링 루틴

### 매주
- [ ] 구글에서 직접 검색어로 노출 여부 확인 (시크릿 창)
  - "피치마스터"
  - "pitch-master.app"
  - "조기축구 팀관리"
  - "조기축구 총무 앱"

### 매월
- [ ] Google Search Console **성능** 리포트 확인
  - 노출·클릭·CTR·평균 게재 순위
  - 신규 쿼리 발굴
- [ ] 네이버 서치어드바이저 **노출 현황**
- [ ] Vercel Analytics 유기 트래픽 비율

---

## E. 참고: 빨리 올라가는 주요 지표 (Google 기준)

| 지표 | 대략 소요 | 비고 |
|------|----------|------|
| 인덱싱 (색인됨) | 1~7일 (Search Console URL 요청 시) / 2~4주 (자연) | 이게 먼저 돼야 **모든 검색** 대상 |
| 브랜드 키워드 1위 | 인덱싱 후 즉시~2주 | "피치마스터" 같은 고유 브랜드는 빨리 1위 |
| 일반 키워드 상위 | 3~6개월 | "조기축구 팀관리" 같은 경쟁 키워드 — 백링크 + 콘텐츠 + 체류시간 누적 필요 |

**단기 목표 (1개월)**: "피치마스터"·"pitch master"·"pitch-master.app" 브랜드 검색 1페이지 노출.
**중기 목표 (3개월)**: "조기축구 팀관리" 1페이지 진입.
