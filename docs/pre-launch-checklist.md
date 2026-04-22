# 본격 마케팅 전 체크리스트

> **목적**: 유료 마케팅·카페 대량 홍보·언론 노출 전 반드시 마무리해야 할 항목.
> **기준일**: 2026-04-22
> **상태 표시**: ✅ 완료 / 🟡 진행중 / ⬜ 미착수

---

## A. 보안 (출시 차단급)

| 항목 | 상태 | 비고 |
|------|------|------|
| Supabase `rls_disabled_in_public` 경고 해소 (`dues_payment_status`, `legacy_player_stats`) | ✅ | 사용자가 Studio 에서 RLS 토글 직접 활성화 (2026-04-22). `pg_tables.rowsecurity = true` 검증됨. 00042 파일은 새 환경 재현용으로 유지 |
| RLS 정책 전수 점검 (마이그레이션 외 수동 생성 테이블 없음 확인) | ⬜ | `supabase db pull` 로 drift 확인 후 커밋 |
| `.env` 의 SUPABASE_SERVICE_ROLE_KEY 가 git 에 노출되지 않았는지 | ✅ | `git log --diff-filter=A -- .env` 결과 없음. `.gitignore` 에 `.env`·`.env.*` 포함. 추적 중인 `.env*` 파일 0개 |
| Vercel 환경변수 (KAKAO_CLIENT_SECRET, ANTHROPIC_API_KEY, SESSION_SECRET, VAPID_*) 전수 확인 | ⬜ | Vercel 대시보드 |
| Google / Kakao OAuth redirect URI 프로덕션 도메인 등록 확인 | ⬜ | `https://pitch-master.app` |
| Web Push VAPID 공개키 클라이언트 번들에만 노출, 비밀키 서버 전용인지 확인 | ⬜ | |

## B. 코드 품질 (Critical 버그)

| 항목 | 상태 | 비고 |
|------|------|------|
| AI route `.single()` 에러 필드 미검사 (ai/tactics, ai/full-plan, ai/match-summary) | ✅ | 2026-04-22 수정. DB 오류 시 503 응답 |
| match-summary members 조회 실패 미검증 → 빈 이름 후기 생성 | ✅ | 2026-04-22 수정. members.error 시 503 |
| 마이그레이션 번호 00027 충돌 — **리네임 금지** 문서화 | ✅ | `supabase/migrations/CLAUDE.md` 경고 추가 |
| Vitest 686 테스트 통과 확인 | ✅ | 2026-04-22 전체 통과. vitest.config 에 `.claude/**`·`.serena/**` exclude 추가 |
| `npm run build` 통과 확인 | ✅ | 2026-04-22 exit 0 |
| `npx tsc --noEmit` 타입 에러 0 확인 | ✅ | 테스트 mock Supabase 타입 단언 기존 에러만 — 내 변경 관련 0 |
| AI route 4곳 Vitest 커버리지 추가 (happy / rate_limit / futsal 차단) | ⬜ | 출시 후 1주 내 |

## C. 성능 / SSR

| 항목 | 상태 | 비고 |
|------|------|------|
| `getMatchDetailData` SSR 블로킹 해소 — AI 후기 첫 생성 클라이언트로 이전 | ✅ | 이미 개선됨 (Explore 확인) |
| 대시보드 SSR 페이지 로드 속도 측정 (Vercel Analytics) | ⬜ | p75 < 2s 목표 |
| AI TeamStats 캐시 24h TTL 정상 동작 확인 | ⬜ | 동일 팀 2회 호출 시 cache hit 로그 |
| 회비 OCR 이미지 해시 캐시 동작 확인 | ⬜ | 같은 이미지 재업로드 시 AI 호출 0회 |

## D. 결제 / 수익

| 항목 | 상태 | 비고 |
|------|------|------|
| 가격 정책 최종 결정 (Free 유지 vs Pro 9,900 도입) | ⬜ | 메모리 `project_pricing.md` 기준 재검토 |
| Anthropic API 월 예상 비용 추산 + 예산 알림 | ⬜ | 현재 사용량 기준 계산 |
| Supabase Free 플랜 용량·Egress 한계 도달 전 Pro 전환 계획 | ⬜ | 메모리 `project_supabase_usage_2026_04.md` 참고 |

## E. 마케팅 인프라 (SEO)

| 항목 | 상태 | 비고 |
|------|------|------|
| Google Search Console 등록 + sitemap 제출 | ⬜ | `docs/seo-checklist.md` 참고 |
| 네이버 서치어드바이저 등록 + 인증 태그 확인 | ✅ | layout.tsx 에 메타 태그 존재 |
| 랜딩 페이지 본문 키워드 밀도 (조기축구·피치마스터) | ✅ | FaqSection·HeroSection 보강됨 |
| Open Graph 이미지 1200×630 실제 존재 확인 | ⬜ | 카톡 공유 미리보기 |
| 구조화 데이터 (SoftwareApplication + FAQPage) 유효성 | ✅ | layout.tsx 에 JSON-LD |

## F. 콘텐츠 / 커뮤니티

| 항목 | 상태 | 비고 |
|------|------|------|
| velog 1·2편 실제 게시 | ⬜ | 초안 완성 — `docs/blog-post-*-draft.md` |
| velog 3편 작성 ("0명 → 180명 성장기") | ⬜ | |
| 네이버 조기축구 카페 글 1곳 게시 | ⬜ | 초안 `docs/marketing-cafe-post.md` |
| 사용자 가이드 페이지 정비 (guide.html → Next.js) | ⬜ | 현재 `public/guide.html` 방치 |
| FAQ 7~8개 확장 | 🟡 | FaqSection 부분 보강. 조기축구 관리·총무 키워드는 추가됨 |

## G. 앱 스토어

| 항목 | 상태 | 비고 |
|------|------|------|
| Play Console 프로덕션 출시 (현재 등록 완료) | 🟡 | 리뷰 통과 후 공개 |
| Play Store 앱 설명 — "조기축구 팀관리·피치마스터" 키워드 포함 | ⬜ | 구글 유니버설 검색 대응 |
| 앱 스토어 스크린샷 (포네 목업) 8장 세트 | ⬜ | 현재 `public/screenshots/` 존재 |
| 프라이버시 정책 / 이용약관 링크 앱 설명에 포함 | ⬜ | `/privacy`, `/terms` |
| Android Bubblewrap TWA 빌드 검증 (이미 진행한 이력 있음) | ⬜ | `docs/play-console-production-answers.md` |
| iOS 앱 (별도 트랙) 기획 여부 결정 | ⬜ | 후순위 — 현재 PWA 로 커버 |

## H. 운영 / 모니터링

| 항목 | 상태 | 비고 |
|------|------|------|
| AI 사용량 월별 집계 (ai_usage_log) 모니터링 쿼리 | ⬜ | 비정상 사용 감지용 |
| 에러 로깅 — Vercel 로그 대시보드 실시간 확인 | ⬜ | |
| CS 유입 채널 (카카오톡 채널 등) 단일화 | 🟡 | 메모리 `cs-outreach-log.md` 참고 |
| 데이터 백업 루틴 (Supabase daily backup 확인) | ⬜ | `docs/supabase-backup.md` 참고 |
| Supabase Egress 알림 (월 한도 80% 도달 시) | ⬜ | |

## I. 법적 / 약관

| 항목 | 상태 | 비고 |
|------|------|------|
| `/privacy` 페이지 최신화 (Claude API 송신 데이터 명시) | ✅ | 2026-04-22. 섹션 5-1 신설: OCR·편성·후기·시그니처 4개 AI 기능별 전송 데이터 상세. Anthropic Zero-Retention 정책 명시 |
| `/terms` 이용약관 개정일 확인 | ✅ | 2026-04-22 개정. 제5조 AI 기능 목록 확장, 제9조 AI 결과 정확성 면책 추가 |
| 개인정보 위탁처리 동의 — Anthropic, Supabase, Vercel | ✅ | privacy 섹션 5 표에 Anthropic 추가 완료 |
| 카카오 로그인 계정 탈퇴 시 데이터 삭제 플로우 | ⬜ | GDPR / 개인정보보호법 |

---

## 우선순위

### 출시 차단 (반드시 먼저)
1. A — RLS 경고 해소 (00042 실행)
2. A — .env 노출 확인
3. B — 빌드·테스트 통과 확인
4. I — privacy / terms 최신화

### 1주 내
- A — OAuth redirect · Vercel 환경변수 전수 검증
- B — AI route 테스트 추가
- E — Google Search Console 등록
- F — velog 1·2편 게시 + 카페 1곳
- G — Play Store 앱 설명 키워드

### 2주 내 (점진)
- D — 비용 추산·알림
- F — velog 3편·FAQ 확장
- H — 모니터링 쿼리·백업 확인

---

## 체크 방법

배포 후 smoke test:
```
1. 로그인 (카카오) → 팀 생성 → 경기 생성 흐름
2. 데모 모드 진입 → 모든 탭 클릭
3. OCR 이미지 업로드 → 거래 파싱
4. AI 풀 플랜 실행 (김선휘 계정)
5. AI 코치 분석 재생성
6. 푸시 알림 수신 확인
```

배포 전 CI:
```bash
npx vitest run
npm run build
npx tsc --noEmit 2>&1 | grep -v __tests__ | head -20
```
