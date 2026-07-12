---
title: 개선 백로그 — 미완료 (HIGH/MEDIUM/LOW)
summary: 우선순위별 미완료 항목 정리. HIGH=131팀 운영 직접 영향, MEDIUM=팀 50+ 시, LOW=팀 100+ 시
last_updated: 2026-07-12 (117차 회고 갱신 — 기록 CSV·종합 랭킹 커밋 완료 반영, 회비 CSV·competitors.md 갱신은 여전히 미커밋)
related: [completed-recent.md, reviews.md]
---

# 미완료 백로그

## 117차 신규 추가 (2026-07-12) — 2차 경쟁 재조사 후속 + 개발 로드맵

> **배경**: 조기싸커가 (베낀) 전술판을 **유료 Meta/인스타 광고**로 밀고(7/10~, "우리 팀도 프로처럼" 전술 애니메이션 앵글), v1.5.2에서 전술 피드 **다국어화**(해외 확장 의도). 스쿼드온도 실시간 전술보드+하이라이트 추가 → **전술판은 red ocean화**. 대응 원칙 = 베끼기 쉬운 UI 경쟁 지양, **회비·AI·성장·활성화**로 무게. 상세 [[docs/competitors.md]] §0-A. 팀관리앱 중 유료광고는 조기싸커 단독(축구고·스쿼드온·풋볼랩·동네축구·오프더볼 광고 0).

### 🟢 즉효·저비용 (당장 착수)
- [ ] **기프티콘 추천 프로그램 + 운영공지 캠페인** (성장+활성화, 바이럴 루프 증폭) — 상대팀 회장 초대→기프티콘. 있는 것=초대코드·signup_source·TwaReferrerCapture / **없는 것=추천 귀속(referredBy)·리워드 지급**. 최소안: 개인 추천코드 → 초대된 팀 회장이 **활성화(첫 경기 등록 등)까지** 하면 지급(가입만 보상=어뷰징). 운영공지(global notice) 배너로 캠페인. ⚠️ 리워드 실비용·상한·어뷰징 방지·[가짜혜택 금지](memory) 설계. **진행 중(설계·공지 초안).**
- [ ] **연말/시즌 회비 결산 리포트** (해자=회비 깊이 벌리기) — 월별 결산(`MonthlyReportClient`) 코드 재활용해 한 해 전체 수입/지출/미납/벌금/1인당 부담 한 장 요약. 총무 연말정산 직격.

### 🟡 전술판 기능 (parity/delight, 별도 트랙 — 진행 중)
- [ ] **이동 경로·화살표 드로잉** (플래그십) — 라이브 전술판에 뛰는 길·패스·압박 화살표 그리기. 현재 없음(선택표시 화살표만). ⚠️ 새 데이터(annotations)·마이그레이션·SVG 오버레이·모바일 터치 = **중대형, 별도 계획·승인 필요**. `TacticsBoard`는 (x,y) placement + `match_squads.positions` JSONB 구조.
- [ ] 상대팀 전술 메모/보드 (상대 포메이션 대비)
- [ ] 선수 평균 위치·히트맵 오버레이 (기록 데이터 결합)
- [ ] 세트피스 라이브러리 확장 (애니메이션 에디터에 일부 존재)
- ⛔ 실시간 협업 편집 = 오버킬(스쿼드온이 함), 패스

### 🔵 큰 결정 (인프라·비용·승인 필요)
- [ ] **아이폰(iOS) 출시** — PWA를 네이티브 셸(WKWebView/Capacitor)로 래핑해 **Apple App Store 등재**(안드로이드 TWA처럼, 풀 네이티브 재작성 X). 얻는 것=iOS ASO 발견·**스토어 등재 제3자 footprint**([GEO 노출 게이트](memory))·iOS 푸시·신뢰도. 블로커=Apple Developer $99/년·심사(4.2 minimum functionality 리젝 위험, 푸시·네이티브 느낌 보강 필요). **조기싸커·축구고·스쿼드온 다 iOS 네이티브 → 우리 최대 구조적 열위.**

### 🟡 AI·기록·리텐션·활성화 디벨롭 후보
- [ ] AI: 일일/주간 팀 요약(라이트 B 확장) · **이상 감지**(미납 급증·핵심멤버 3주 결석) · 경기 후기 품질 업그레이드(템플릿→LLM)
- [ ] 기록: 개인 성장 그래프 · 시즌 간 비교 · 출전시간 공정성 뷰
- [ ] 리텐션: **연간 팀 리뷰**(Spotify Wrapped식 "우리 팀 2026") · 마일스톤 축하(100경기·창단 1주년)
- [ ] 활성화: **2번째 경기 유도 플로우** (우리 최대 병목 직격 — 활성화 14%)

### 도입 후보 (경쟁사 차용 — 이전과 변동 없음)
- [ ] 미납 투표 하드 차단(팀 옵션, 기본 off) — 사말라. 회비 징수 레버
- [ ] 리그/토너먼트 대진표 자동 + 위저드 — 에이풋볼 "시즌 허브"

### 미커밋 대기 (이번 세션 작업물)
- [x] ~~C: 기록 CSV 내보내기 + 종합 랭킹(공헌점수)~~ — **117차(2026-07-12)에 커밋·푸시 완료** `ccc9d4e`·`f6a1c6b`. 종합 랭킹은 최종적으로 정규화(밸런스 점수)로 확정(선형 배점은 실팀분석 결과 폐기). 상세 [[docs/backlog/completed-recent.md]] 117차.
- [ ] **C-2: 회비 CSV 내보내기** — `DuesRecordsTab.tsx`(`downloadCsv` 재사용). 코드 작성 완료, **커밋 대기**.
- [ ] **A: docs/competitors.md 7/12 갱신** (2차 재조사·조기싸커 광고·스쿼드온 델타) — 커밋 대기.

## 116차 신규 추가 (2026-07-10) — iOS 앱셸 전환 + 회비 감사 8버그 + 휴회/부상 자동처리 후속

### 실기기 검증 3건 (HIGH, 즉시)
- **배경**: 116차에 코드·클린빌드·916+테스트로 확인했으나 실기기/실사용 검증은 아직.
- [ ] iOS 실기기에서 하단 탭바가 스크롤 후에도 뜨지 않는지 재확인 (앱셸 전환, 6cb52ea) — 4차 재발 이력이라 재확인 중요
- [ ] 휴회 등록 회원이 기간 중 경기에 자동으로 '불참' 처리되는지, 본인이 직접 투표하면 우선되는지 실사용 확인
- [ ] 부상 등록 회원이 자동 휴면 처리돼 투표 명단·벌금·리마인더에서 빠지는지, 회원 목록에 "휴면(부상)"으로 뜨는 게 자연스러운지 확인
- [ ] FC발로만 다음 OCR 업로드에서 입금/출금 방향이 정확히 인식되는지 확인 (ea3af2a→42f4ab3 2단계 수정)

### Vercel 배포 프로덕션 반영 확인 (HIGH, 즉시)
- **배경**: 574a495~dd5b38a 16개 커밋 main 순차 푸시 완료.
- [ ] FC발로만 회비 화면에서 월별 결산 카드의 "회비 수입"이 유니폼/구장비/환불과 분리돼 정상 금액으로 뜨는지 확인
- [ ] 회비 탭 벌금 자동매칭이 정상 입금을 벌금 납부로 잘못 소비하지 않는지, 이름 부분일치(동명이인) 사고가 재발하지 않는지 확인

### 낮은 우선순위 미수정 3건 (LOW, 보류)
- **배경**: 116차 회비 감사 중 발견했으나 이번엔 손대지 않기로 함.
- [ ] AI OCR 날짜 누락 시 조용히 오늘 날짜로 저장되는 동작 재검토 (사용자에게 명시적으로 알리는 게 나은지)
- [ ] Clova 파서가 50만원 이상 거래를 무조건 스킵하는 로직 재검토
- [ ] Clova 파서의 연말 연도 추론 로직 재검토

## 115차 신규 추가 (2026-07-09) — 블로그 신규 3편 발행 후속 + 유입 재측정 후속

### 잔존팀 회장 Play 공개 리뷰 시딩 (HIGH, 사용자 직접, GEO 단일 최대 레버)
- **배경**: 115차 후반 LLM(GEO) 3차 관측(Gemini·ChatGPT에 "조기축구 팀 관리 어플 추천" + "한국 특화 없어?" 직접 질의) — 둘 다 PitchMaster 미언급 재확인(새 문제 아님, 기존 진단 재확인). discovery는 현 병목(활성화 14%)이 아니라서 본격 GEO 실행안(리스티클 진입 등)은 우선순위 밀림 — 대신 사용자만 할 수 있는 관계형 액션인 **실사용 잔존팀 회장의 Play 공개 리뷰**가 단일 최대 실행 레버로 재확인됨. `domain_alpha_tester_system.md`(13명 테스터 리뷰 재안내)와 연결.
- 대상 후보(잔존 확인된 팀, 메모리 기준): 시즌FC·제니스·FC.LIBRE B·LINEOUT.
- [ ] 카톡 리뷰 요청 문구 초안 필요 시 작성 지원 (사용자 답 대기 — 이번 세션엔 미작성)
- [ ] 대상 팀 회장에게 순차 요청 발송
- [ ] ASO·iOS는 보류 유지

### T2·T3 네이버·티스토리 순차 발행 (HIGH, 사용자 직접, 7/10~)
- **배경**: 115차에 자체도메인 3편(T1 기록·통계·T2 축구 포메이션·T3 풋살 6대6 포지션) 라이브 완료(3bdf2d1). T1은 네이버·티스토리 발행완료(7/9). 스팸 방지 위해 하루 이상 간격 필요.
- 초안 파일: `docs/blog-guide-soccer-formation-guide-{naver,tistory}.md`, `docs/blog-guide-futsal-6v6-positions-{naver,tistory}.md`. 발행 순서·체크리스트는 `docs/blog-publishing-tracker-2026-07.md` 참조.
- [ ] T2(포메이션) 네이버 발행 (7/10 권장)
- [ ] T3(풋살포지션) 네이버 발행 + T2 티스토리 발행 (7/11 권장)
- [ ] T3 티스토리 발행 (7/12 권장)

### 7/14 코호트 재측정 — 황호FC·FC구삼모사 포함 관찰 (HIGH, 2026-07-14경)
- **배경**: 115차 재측정에서 이번 주 47명 가입 스파이크가 황호FC 한 팀(회장 김정훈, 23명 7/7 대량 온보딩)의 단일 효과로 확인됨. 6/30 온보딩 개편 이후 첫 대형 고의도 팀이라 활성화 진행 여부를 지켜볼 가치 있음. 개입 채널(푸시4명·이메일없음)이 막혀 능동 개입은 불가.
- **후속(115차 2차 확인)**: FC구삼모사(창단 7/7, 회장 정진엽)도 같은 시기 창단된 팀 — 멤버 9→18명(전원 실가입, 유령 0) + 경기 2개 예정(7/12·7/19, 정확히 주 1회 cadence)으로 이미 활성화 문턱(경기 2개+)에 도달한 것으로 보임. 단 두 경기 모두 아직 SCHEDULED라 실제 완료 여부 미확인 — "주간 cadence"가 잔존 레버라는 가설 검증에 중요한 사례라 별도 확인 필요.
- [ ] `scripts/retention-metrics.js`로 6/30 이후 가입 코호트 재측정 시 황호FC의 활성화(경기 2개+ 도달) 여부 별도 확인
- [ ] **FC구삼모사 7/12·7/19 경기가 실제 COMPLETED로 처리됐는지 확인** — 예정만 있고 안 열리는 "종이 계획"인지, 진짜 주 1회 cadence로 굴러가는지 구분
- [ ] 113차부터 이월된 "6/30 활성화 업데이트 효과 재측정" 항목과 같은 시점에 함께 처리

## 114차 신규 추가 (2026-07-08) — MVP 최신 지정 정책 + 게시판 접기 + 회원 목록 복원 후속

### Vercel 배포 프로덕션 반영 확인 (HIGH, 즉시)
- **배경**: 2cc3748(게시판 접기+이관 CTA)·b105d48(전체 글 접기 통일)·4f5bf9e(회원 목록 등번호·포지션 복원)·c6fdb94(가이드 자동화 안내)·fc6d998(MVP 최신 지정 정책)·6fa6d26(가이드 라벨 정정) 6커밋 main 푸시 완료.
- [ ] 게시판에서 공지·일반 글 모두 접기 토글이 뜨는지, 접은 상태가 재방문 시 유지되는지 확인
- [ ] 신규 회장 WelcomeCard에 데이터 이관 mailto 배너 노출 확인
- [ ] 회원 목록에서 등번호 배지·선호포지션이 한 줄로 정상 표시되는지(370px 좁은 화면 포함) 확인
- [ ] `/records`·경기 후기 탭에서 MVP 운영진 지정 관련 화면 이상 없는지 확인
- [ ] `/help` §3·§12 신규 자동화 안내 표·FAQ, 라벨 정정 13건 프로덕션 반영 확인

### MVP 운영진 지정=최신 정책 실사용 확인 (HIGH, 다음 경기부터)
- **배경**: `LATEST_STAFF_MVP_CUTOFF="2026-07-08"` 이후 경기부터 운영진 지정이 "최다득표"가 아니라 "가장 최근 지정 1건"으로 바뀜(fc6d998). 실제 이 정책이 적용되는 첫 경기가 아직 없어 실사용 확인 전.
- [ ] 운영진 여럿이 서로 다른 후보를 지정하는 팀에서 최신 지정으로 교체되는지, "운영진 지정" 실시간 표시가 기대대로 뜨는지 확인
- [ ] 필요 시 운영진 대상 안내(재지정하면 그게 MVP가 됨) 공지 여부 검토

### D그룹 개인 파일 처리 결정 (LOW, 113차부터 이월)
- **배경**: `docs/resume-pitchmaster-update.md`(수정)·`docs/newscreen/`·`docs/tossplace-jd.md`·지원서 PDF·`scripts/setup-keeper-test.mjs`·`scripts/start-pitchmaster.sh`가 114차 기준으로도 여전히 미커밋 상태로 방치 중.
- [ ] `.gitignore` 추가 여부 또는 커밋 여부 사용자 결정

### 가이드 시각자료 보강 (LOW)
- **배경**: 114차 `/help` 총평 81/100 중 시각자료 항목이 최저(5/25) — 스크린샷·GIF 0장.
- [ ] 핵심 플로우(경기 등록·투표·전술판·회비 OCR) 스크린샷 또는 GIF 추가 검토

### 가이드 발견성 추가 진입점 (LOW)
- **배경**: 114차에 대시보드 "첫 경기 hero" 1곳에만 가이드 링크 추가. 온보딩 완료 화면·빈 상태(경기/게시판) 진입점은 미착수.
- [ ] 온보딩 마지막 단계·주요 빈 상태 화면에 "사용법 가이드" 링크 추가 검토

## 113차 신규 추가 (2026-07-06) — 마케팅 전략 재프레이밍 + 유튜브 아웃리치 + 문서 감사 후속

### Vercel 배포 프로덕션 반영 확인 (HIGH, 즉시)
- **배경**: `chore: audit cleanup`(0499faa) + `docs: session marketing/GEO plans + backlog updates`(eaca945) 문서·카피 위주 커밋 2건 main 푸시 완료.
- [ ] `/help` AI 기능 안내가 "3종(전술 코치·풀플랜·OCR)"로 정정 반영됐는지, 랜딩 `AboutSection`·`FaqSection` 완화 카피 반영 확인
- [ ] G6 가이드(`/guide/soccer-club-operations`) 페르소나가 "회장"으로 바뀐 것 확인
- [ ] CLAUDE.md·README 최신 수치(145팀/690명, 테스트 900+) 반영은 문서 전용이라 별도 확인 불필요

### 6/30 활성화 업데이트 효과 재측정 (HIGH, 2026-07-14경)
- **배경**: 107~109차 온보딩 활성화 재배치(09306fb)가 6/30 전후 배포. 113차 재측정(활성화25%·커밋잔존42%·구경꾼75%)은 대부분 그 이전 가입 코호트라 개선 효과 미반영.
- [ ] 7/14경 `scripts/retention-metrics.js`로 "6/30 이후 가입 팀"만 코호트 격리해 재측정
- [ ] GA4 전환율(team_create→match_create→invite_sent→team_join)도 함께 확인 (107차 항목과 연계)

### 유튜브 아웃리치 실행 (MEDIUM, 사용자 직접)
- **배경**: `docs/youtube-outreach-plan.md` 채널 후보·메일 초안 완료(113차). 무료협찬→성과형(CPA)→앵커1유료 순.
- [ ] 각 후보 채널(동고FC·한마음FC 등) 유튜브 "정보" 탭에서 비즈니스 이메일·최근 업로드일 확인
- [ ] A(무료 협찬) 메일 5~10곳 동시 발송
- [ ] 조기싸커 인스타 실제 집행 여부 확인 → `docs/competitors.md`·`reference_competitor_jogisoccer.md` 갱신용 근거 확보

### `.claude/rules/ai-features.md` 선수 시그니처 행 정정 (LOW)
- **배경**: 113차 문서 감사 중 발견 — `ai-features.md:34`가 "선수 시그니처" 모델을 "Haiku 4.5"(LLM)로 잘못 표기. 실제는 `playerCardUtils.ts:77 generateSignature()`(주석 "룰 기반") — 룰 기반. 이번엔 시간 관계상 미수정.
- [ ] `.claude/rules/ai-features.md:34` 행을 "룰 기반(패턴 조합)"으로 정정

### D그룹 개인 파일 처리 결정 (LOW)
- **배경**: `docs/resume-pitchmaster-update.md`·`docs/newscreen/`·`docs/tossplace-jd.md`·지원서 PDF·`scripts/setup-keeper-test.mjs`·`scripts/start-pitchmaster.sh`가 미커밋 상태로 방치 중. 개인/지원서 파일이라 113차 감사 커밋에서 의도적으로 제외.
- [ ] `.gitignore` 추가 여부 또는 커밋 여부 사용자 결정

## 112차 신규 추가 (2026-07-06) — 수비 포인트 랭킹 + 후속 3건

### Vercel 배포 프로덕션 반영 확인 (HIGH, 즉시)
- **배경**: `feat(records): add defender points ranking by tactics-board position`(67e2801) + `docs(help,landing): surface defender points and other missing features`(aa95e88) + `fix(matches): show 0:0 for completed scoreless matches`(6bcdd75) 3커밋·main 푸시 완료. 배포 반영 확인 필요.
- [ ] `/records` 팀 랭킹 탭에 "수비 포인트" 카드 프로덕션 노출 확인
- [ ] `/help`·랜딩 `MoreFeaturesSection` 신규 카드(포지션별 기여 랭킹·키퍼 룰렛·경기장 지도·시즌 관리) 프로덕션 노출 확인
- [ ] 완료된 상대전 0:0 경기가 경기 목록에서 "결과 미기록" 아닌 "0:0"으로 뜨는지 프로덕션 확인

### 수비 포인트 가중치(×2·×3) 자연스러움 재검토 (MEDIUM, 실사용 후)
- [x] **117차(2026-07-12)에 산식 자체가 교체됨(초과 달성)** — 서경카페 사용자(=노진우, 동일인) 재피드백으로 무실점 쿼터×2+무실점 경기×3 산식은 폐기, 키퍼×2+필드수비×1(경기 보너스 없음)로 통합. 상세 [[docs/backlog/completed-recent.md]] 117차.
- ~~배포 후 FC.LIBRE B 등 실팀 화면에서 가중치 체감 재검토~~ (산식 자체가 바뀌어 무의미)
- [x] 사용자가 FCMZ 데이터로 추가 검증 완료 (112차 후속① — 축구 1위 확인, 풋살은 포지션체계상 대상외 확인)

### 수비 포인트 미기입 경기 인플레이션 (LOW, 117차로 근본 해소)
- **배경**: 골 데이터가 아예 없는 경기는 무실점으로 오인돼 수비 포인트가 부풀 수 있음(무실점 "경기" 보너스가 원인). 112차 당시 사용자가 코드 가드 대신 "현행 유지 + 안내문 대응"으로 결정했으나, **117차에 무실점 경기 보너스 자체를 제거**(무실점 "쿼터"만 집계)하면서 이 인플레이션 경로가 근본 해소됨.
- [x] 안내문 필요성 재검토 불요 — 원인 로직 자체가 삭제됨

## 111차 신규 추가 (2026-07-03) — iOS 하단 탭바 전술 탭 수정 후속

### 아이폰 실기기 재확인 (HIGH, 즉시)
- **배경**: `MatchDetailClient.tsx`·`MatchTacticsTab.tsx` 콘텐츠 래퍼 2곳을 `overflow-x-hidden`→`overflow-x-clip` 전환(d37a3c9)으로 수정했으나, 두 래퍼는 nav의 조상이 아니라 형제 구조라 이 수정이 100% 확실한 원인이라 장담 못 함. iOS 실기기 재현 불가한 개발 환경 한계.
- [ ] 신고한 아이폰 유저에게 배포본에서 전술 탭 스크롤 재확인 요청
- [ ] 여전히 뜨면: (a) iOS 버전 확인 — 16 미만이면 `overflow-x: clip` 미지원, 다른 접근 필요 (b) 전술 탭만인지 전 탭(홈/기록/회비)인지 확인 — 전자면 전술 콘텐츠 문제 남음, 후자면 nav 조상/전역(반투명 nav 배경 컴포지팅 or iOS 버전) 재탐색

### 역할 가이드 메타슬롯(주심/부심/촬영) 미인식 (MEDIUM)
- **배경**: `src/lib/positionRoles/playerAssignments.ts`의 `findRoleForSlot()`이 `__referee`·`__linesman1/2`·`__camera` 메타슬롯을 포메이션 템플릿에서 못 찾아 null 반환 → MatchRoleGuide가 해당 선수에게 "배치 기록이 없어요"를 잘못 표시. 6/27 경기 4쿼터 김영민 주심 배정 건에서 실증. 110차에 전술판 선수목록엔 `META_SLOT_LABELS` 라벨을 추가했지만(cee4d9e) 역할가이드엔 미적용된 드리프트.
- [ ] "이번 경기 주심/부심/촬영이에요" 식 안내 문구 추가 검토 (findRoleForSlot에 메타슬롯 분기 추가)

## 110차 신규 추가 (2026-07-02) — 전술판 쿼터 표시 후속

### 쿼터별 출전 현황 매트릭스 발견성 개선 (LOW)
- **배경**: 테스터가 "전체 투입 쿼터 보기" 요청 — 이미 매트릭스 버튼이 있으나 눈에 안 띔.
- [ ] 매트릭스 버튼 라벨·위치 재검토 (전술판, TacticsBoard.tsx)

### 필드 위 전/후 교대 칩 반달 도트 통일 (LOW, 선택)
- **배경**: 선수 선택 목록엔 쿼터 도트(●◐○) 적용됐으나, 필드 위 전/후 교대 칩은 아직 다른 표기 방식.
- [ ] 필드 위 칩도 같은 반달 도트/툴팁으로 통일할지 검토

### 쿼터 도트 색/크기 미세조정 (LOW, 실사용 후)
- **배경**: 현재 12px, `hsl(16 95% 52%)` 고정. 실사용 피드백 대기.
- [ ] 사용자 실사용 후 재조정 여부 판단

## 109차 신규 추가 (2026-07-01) — 경쟁사 재조사 + G6 배포 후속

### ✅ Vercel 배포 미반영 — 해결됨 (근본 원인=vercel-ignore.sh 버그)
- **근본 원인 규명**: `scripts/vercel-ignore.sh`가 `HEAD^ HEAD`(직전 1커밋)만 비교. 코드 커밋(ce81b00) 위에 문서 커밋(a3151d8·4f277c9)이 쌓여 배치 푸시되니, Vercel이 맨 위(문서만) 커밋을 보고 **빌드를 계속 스킵**함. Redeploy도 그 문서 tip 커밋을 재평가해 또 스킵.
- **즉시 해결**: 코드 파일(soccer-club-operations.tsx)을 건드린 커밋(b389e7b)을 tip으로 푸시 → ignore 통과 → 빌드·배포. `/guide/soccer-club-operations` 200 확인 + 사이트맵 포함 확인 완료.
- **근본 수정 (2026-07-01, 승인 후)**: vercel-ignore.sh를 `$VERCEL_GIT_PREVIOUS_SHA..HEAD` 전체 범위 비교로 변경 + 셸로우클론 가드(base 없으면 빌드 진행). 앞으로 배치 푸시에서 코드 배포 누락 없음.
- **교훈**: 코드+문서 커밋을 배치 푸시할 땐 코드 커밋을 tip에 두거나 분리 푸시. GSC 색인은 배포 완료(200 확인) 후 요청.
- [x] 프로덕션 200 확인 · 사이트맵 포함 확인 · GSC 색인 재요청(사용자)
- [ ] (모니터링) 다음 배치 푸시에서 vercel-ignore.sh 수정이 정상 동작하는지 1회 확인

### ✅ G6 네이버·티스토리 발행 → 완료 (2026-07-06, 사용자 발행 보고)
- **배경**: 109차에 G5(풋살쿼터)를 7/1 네이버·티스토리 발행 완료. 같은 날 G6 발행은 빈도 과다(1일 2편 스팸 위험).
- 초안 파일: `docs/blog-guide-soccer-club-operations-naver.md`, `docs/blog-guide-soccer-club-operations-tistory.md`
- [x] 네이버 블로그 G6 발행 완료 (7/6)
- [x] 티스토리 G6 발행 완료 (7/6) → **발행 대기 블로그 0개**

### 경쟁사 감시 체크포인트 — 월 1회 재추적 업데이트 (MEDIUM, 상시)
- **배경**: 109차 전수 조사에서 조기싸커 Android+AI, 축구고 회비+AI가 빠르게 변한 것 확인. 기존 107차 항목에 추가 상세 반영.
- [ ] **조기싸커**: AI 코치노트 고도화 추이 / Android 설치 수 증가 / 유료화 시도 여부
- [ ] **축구고**: AI 하이라이트 정식 출시 시점 / 회비 기능 OCR·벌금 등 깊이 확장
- [ ] **사말라**: samala.co.kr 월 1회 — AI·OCR·회비 기능 추가 여부
- [ ] **플랩풋볼**: 팀서비스에 회비·출석 깊이 추가 여부

---

## 108차 신규 추가 (2026-07-01) — 사말라 gap 도입 검토 후속

### 도착 셀프 체크인 재논의 (LOW, GA 측정 후)
- **배경**: 108차에 사말라 gap으로 확인. 현재 우리는 운영진 수동 출석체크(MatchAttendanceTab)만, 셀프 체크인 없음.
- **보류 사유**: GA로 출석 탭 퍼널 측정 선행 필요(feedback_build_without_measurement 원칙). 도착순 스쿼드(distributeToBalance 철학 충돌)는 폐기 확정.
- [ ] GA에서 출석 탭 클릭 빈도·운영진 수동 체크 횟수 baseline 확인 후 재논의

### 사말라(Samala) 월 1회 재추적 (LOW, 상시)
- **배경**: 108차 첫 등록. 웹 peer로 기능 추가·팀 수 증가 여부 감시 필요.
- [ ] samala.co.kr 월 1회 방문 — 신규 기능(AI·OCR·회비 깊이) 추가 여부 확인
- [ ] docs/competitors.md 섹션7 감시 목록 갱신

---

## 107차 신규 추가 (2026-07-01) — 활성화 루프 재배치 후속 + 경쟁사·마케팅 전수 재조사 후속

### 활성화 재배치 효과 측정 (MEDIUM, 2주 후)
- **배경**: 107차 온보딩 순서 재배치(09306fb) 배포 완료. first_match→members_invited 앞으로, totalMatches=0시 high 승격.
- [ ] GA4에서 신규 팀 회장 기준 team_create→match_create→invite_sent→team_join 전환율 추이 확인 (2주 후)
- [ ] 신규 회장 중 match_create 도달 비율 변화(배포 전후 코호트 비교)

### 활성화 후속 UX 개선 후보 (LOW, 지표 확인 후)
- **배경**: 107차에 보류한 선택적 후속 항목들.
- [ ] PlayerCard 좁은 화면(370px) 3-col 변형 검토 — 현재 FIFA 카드 5-col 의도 유지, 실사용에서 불편 리포트 시 재논의
- [ ] WelcomeCard 레이아웃 — 초대코드 블록을 온보딩 체크리스트 아래로 이동(현재 체크리스트 위에 위치)
- [ ] 드로어 하단 safe-area — 현재 상단만 수정(70863db), 하단 콘텐츠가 홈 인디케이터 겹치는지 실기기 확인 후 처리

> 배경: `docs/competitors.md` 2026-07-01 전면 갱신. 웹 15+종 앱 직접 확인. 조기싸커 Android+AI 진입, 축구고 회비장부+AI 하이라이트 예고 확인. **모든 기능 후보는 `feedback_build_without_measurement` 원칙에 따라 퍼널/지표 연결 확인 후 착수** — 경쟁사 gap이라는 이유만으로 빌드 금지.

### 경쟁사 감시 체크포인트 — 월 1회 재추적 (MEDIUM, 상시)
- [ ] **조기싸커**: 웹사이트 등록 팀 수(5월 206팀, 이번 실측 실패) / AI 코치 노트 고도화 / Android 설치 추세
- [ ] **축구고**: AI 하이라이트 정식 출시 시점 / 회비 기능 깊이 확장(OCR·벌금 붙는지) / Android 설치
- [ ] **플랩풋볼**: 팀 서비스에 회비·출석 "깊은 툴킷" 추가되는지 (현재는 pain point 언급만)
- [ ] **신규 발굴 후보 추적**: 풋플러매니저(미확인)·FootballLab 규모

### AI "일일 팀 요약" 카드 검토 (MEDIUM, 지표 선연결)
- **배경**: 조기싸커 v1.2.0 "AI 코치 노트"(매일 출석·전력·전술·다음할일 자동 요약). 우리 LLM 자산으로 구현 용이하고 대시보드 리텐션 훅 가능.
- ⚠️ 착수 전 확인: 대시보드 재방문·경기 생성 퍼널에 실제 기여하는지 가설·측정 설계 먼저. 현재 잔존 병목(가입→2번째 경기 활성화)과 정렬되는지 판단.
- [ ] GA로 대시보드 카드 클릭·재방문 baseline 확인 → 가설 세운 뒤 프로토타입 여부 결정

### 회비 월별 감사 리포트 UI 검토 (LOW→MEDIUM)
- **배경**: 축구고 회비장부·모이라니 월 결산. 총무가 "이번 달 얼마 남았지?"를 한 화면에. 우리는 연간 요약 위주.
- [ ] 회비 탭에 월별 수입/지출 소계 + 마감 잔액 카드 추가 여부 검토 (기존 dues 데이터 재활용, 신규 스키마 불필요 예상)

### 소셜 피드/팀 스토리 검토 (LOW, 보류)
- **배경**: 축구생활이 "팀 피드(하이라이트/스토리)"를 차별점으로. AI 후기와 결합 시 시너지 가능.
- [ ] 보류 — 친목 리텐션 레버로 유효한지 실사용 데이터 확인 후. 현재 게시판으로 부분 커버.

### 마케팅 실행 후보 (MEDIUM, 사용자 직접 채널)
- **배경**: 커뮤니티 유입 채널·ASO 롱테일·수익화 벤치마크 조사 완료(competitors.md 섹션 6).
- [ ] 네이버 카페 "모두의풋살"(~25만)·디시 조기축구 갤 노출 방식 검토 (직접 홍보는 카페 규칙 확인 필요)
- [ ] 당근 "모임" 하이퍼로컬 팀 결성 실험 (당근FC 선례)
- [ ] ASO 롱테일 선점: 제목·짧은설명에 `축구 회비`·`동호회 관리`·`회비 총무 앱` 반영 (Sensor Tower 검증 후)
- [ ] 고알레 콘텐츠 퍼스트 GTM 벤치마크 (유튜브 드론영상→앱)

### 유료화 모델 재확인 (MEDIUM, 유료화 타이밍 도래 시)
- **배경**: 무료 직접 경쟁자 다수(조기싸커·축구고·동네축구 전부 무료). 카뱅·토스 모임통장이 회비관리+알림 무료 제공 → 회비 단독 유료화 약함.
- [ ] flat 9,900원 강제보다 freemium(기본 무료 + AI 프리미엄) 정합성 재검토 (`reference_competitor_jogisoccer` FAQ 분석과 연계)

---

## 106차 신규 추가 (2026-07-01) — 자체전 팀편성 후속 + 전체 orphan 청소 보류

### 전체 팀 orphan 데이터 정리 (LOW, 사용자 요청 시)
- **배경**: 106차 실측 결과 hard-orphan(users/team_members/match_guests 어디에도 없는 player_id)이 전체 기준 팀편성 2행·전술판 11슬롯 잔존. FCMZ 6/30 경기 1건만 스코프해 정리 완료.
- 나머지 팀 + 다른 경기의 orphan은 정리 미완료. 신규 기능(빠진 인원 정리 버튼·용병 삭제 자동 정리)이 이후 발생분을 막으므로 급하지 않음.
- [ ] 필요 시 Supabase에서 전체 orphan 조회 + 경기별로 스코프해 정리

### 자체전 3팀 가이드 — 미배정 증분 배치 버튼 안내 추가 (LOW)
- **배경**: `src/lib/guides/posts/futsal-self-match-lineup.tsx`가 2팀 기준 안내. 106차 "미배정 N명 배치" 버튼이 3팀 운영 시 유용하나 가이드 미반영.
- [ ] "미배정 인원 배치" 버튼 안내 섹션 추가 (88차 3팀 가이드와 묶어 처리 가능)

---

## 104차 신규 추가 (2026-06-29) — 코드분석 후속 + rate limit 후속

### D6 — 거대 컴포넌트 분리 (LOW, 보류)
- **배경**: 104차 plan mode 조사 결과 600줄 초과 컴포넌트 39개 확인 (외부 분석 "19개"는 과소집계). 최대 AnimationEditor 1739줄·TacticsBoard 1631줄·MatchDetailClient 1500줄.
- **보류 사유**: 현재 버그 없고 리팩토링 시 기능 회귀 위험. 사용자 결정으로 보류.
- [ ] 재개 시 AnimationEditor를 파일럿(에이전트 분석상 위험 최저)으로 먼저 시작 권장

### C5 — 푸시 stale 구독 정리 cron (LOW, 보류)
- **배경**: push_subscriptions 테이블에 updated_at 컬럼 없음 → 오래된 구독 감지 불가. 마이그레이션(00xxx)으로 updated_at 추가 후 cron 도입 필요.
- **보류 사유**: 저가치 (활성 구독자 ~24명). 마이그 비용 대비 효과 낮음.
- [ ] 구독자 수 유의미하게 늘면 updated_at 마이그 후 cron 도입 검토

### C4 후속 — members/bulk API rate limit (MEDIUM, 방식 검토 필요)
- **배경**: 104차에 적용한 `checkMutationRateLimit()`은 "대상 테이블 최근 N초 생성 행 수 COUNT" 패턴. members/bulk는 한 번 요청에 최대 200행 insert → count-in-place 방식으로 rate limit 의미가 없음.
- [ ] 로그 테이블(bulk_upload_log 등) 방식으로 별도 구현 검토

### D7 후속 — raw div 8곳 Card 전환 (LOW, 픽셀 위험)
- **배경**: 104차 조사에서 `<div className="rounded-xl border bg-card ...">` raw 패턴이 8곳 잔존. bespoke shadow 등 혼재로 일괄 전환 시 시각 변경 위험.
- [ ] 신규 작성 지양 + 필요 시 개별 전환. 기존 8곳은 낮은 우선순위로 방치

### prod 배포 후 확인 (HIGH, 즉시)
- [ ] prod `/screenshots/` 이미지 정상 표시 확인 (로그인 AppScreenSlider)
- [ ] middleware matcher에서 `/screenshot/` 단수 제거 후 기존 URL 404 여부 확인

---

## 105차 신규 추가 (2026-06-29) — 출석률 경로 점검 후속

### player-card API MVP 랭킹 버그 (LOW, 93차 발견 → 105차 재확인 미수정)
- **배경**: `src/app/api/player-card/route.ts:389` — 확정 winner가 아닌 생짜 득표수로 MVP 랭킹 비교. 93차에 발견·보류됐으며 105차 전수조사에서도 미수정 상태 확인.
- [ ] `resolveValidMvps()` 기반으로 MVP 비교 로직 정정

### 출석률 계산 경로 문서화 (LOW, 다음 출석률 관련 수정 시 필수 선확인)
- **배경**: 105차 기준 출석률이 계산되는 경로가 8개 이상으로 분산됨. 다음에 출석률 로직 수정 시 전수 확인 필수.
- 경로 목록: getDashboardData / player-card/route / player/[memberId]/page / season-awards / attendance/recent / records(getRecordsData·api/records·RecordsClient) 최소 8경로.
- [ ] 수정 시 위 경로 전부 grep 후 한 배치 수정

---

## 103차 신규 추가 (2026-06-26~27) — 크로스브라우징 미수정 + iOS CSS 후속

### EditMatchInfoForm·MatchVoteMemberPanel 동적 보간 틴트 미생성 수정 (MEDIUM, 사용자 실기기 확인 후)
- **배경**: 103차 크로스브라우징 전수조사에서 발견. `bg-[hsl(var(--${color}))]/15` 방식으로 JS 변수를 보간해 Tailwind arbitrary 클래스를 조립 → Tailwind v4 정적 추출 실패 → 빌드CSS에 틴트 미생성 → 모든 브라우저에서 배경색 안 칠해짐(Safari만의 문제가 아님).
- 대상: `src/app/(app)/matches/[matchId]/EditMatchInfoForm.tsx`(경기 타입·스포츠 타입 선택 버튼), `src/app/(app)/matches/[matchId]/MatchVoteMemberPanel.tsx`(투표 상태 뱃지).
- [ ] 사용자 실기기에서 색 미적용 확인 후 inline style(`style={{ backgroundColor: \`hsl(var(--${color}) / 0.15)\` }}`) 또는 고정 색상맵 분기로 수정

### P2: text/border/shadow color-mix 스윕 (LOW, 선택적)
- **배경**: 98차 스윕은 배경(`bg-/from-/to-/via-`) 532곳만 처리. `text-/border-/shadow-` 계열 ~600곳은 Safari에서 약간 진하게 렌더링되지만 가독성 이상 없음.
- [ ] 필요 시 98차 스크립트 확장해 text/border/shadow 변환 (현재 우선순위 낮음)

---

## 101차 신규 추가 (2026-06-26) — 회비 선납/면제 데이터 정합성

### 타 팀 레거시 완납/납부(EXEMPT+reason) 선납자 PREPAID 전환 (LOW, 요청 시)
- **배경**: 101차에 getExemptLabel의 reason 키워드 감지 코드를 되돌렸음. 결과로, `exemption_type='EXEMPT'`에 reason("6개월 완납"·"1년치 납부"·"1년치 선납")이 붙은 레거시 선납자는 화면에서 "면제"로 분류됨 (선납 그룹 미포함).
- FCMZ는 101차에 데이터 정리(PREPAID 전환) 완료. 타 팀에 동일 구조가 있으면 같은 증상.
- [ ] 요청 팀에 대해 `member_dues_exemptions`에서 `exemption_type='EXEMPT'` AND reason 포함 건 조회 → PREPAID 전환 필요 여부 판단 후 사용자 SQL Editor 경유 정리

### member_dues_exemptions/dues_payment_status member_id 혼재 전수 점검 (LOW, 필요 시)
- **배경**: 101차에 FCMZ에서 `member_dues_exemptions.member_id`·`dues_payment_status.member_id`가 `users.id`와 `team_members.id` 혼재로 박힌 고아 행이 발견됨. FCMZ는 정리 완료.
- 다른 팀에도 유사한 혼재 행이 있을 경우 선납/면제 표시 이상으로 이어질 수 있음.
- [ ] 전수 점검 필요 시 양쪽 id 매핑 쿼리로 고아 행 탐지 후 정리

---

## 100차 신규 추가 (2026-06-26) — 전술 영상 에디터 후속

### gifExport 보간 로직 단위 테스트 (LOW, 여유 시 추가)
- **배경**: 100차에 신규 opponents 보간 로직을 gifExport.ts에 추가했으나 단위 테스트 없음. UI 레이어라 필수는 아니지만 보간 수식 회귀 방지에 유용.
- [ ] `src/__tests__/lib/gifExport.test.ts` — 공/선수/상대 보간 좌표 계산 검증

---

## 99차 신규 추가 (2026-06-26) — 콘텐츠 감사 후속

### 네이버·티스토리 알림 글 직접 재반영 필요 (HIGH, 사용자 직접)
- **배경**: 99차에 초안 파일(`docs/blog-*-notifications-*`)에서 알림 관련 오정보를 수정했으나, 네이버 블로그·티스토리에 이미 게시된 글은 소스 초안만 바뀌었고 실제 플랫폼 게시 글은 미갱신 상태.
- **수정 내용 요약**: "갤럭시·삼성인터넷은 앱 깔아야 알림" → "브라우저에서도 받음, 설정에서 켜기만 하면 됨, iOS만 홈화면 추가 필요, 카카오 인앱만 차단"
- [ ] 네이버 블로그 알림 편 — 발행 글 직접 수정
- [ ] 티스토리 알림 편 — 발행 글 직접 수정

### ✅ DuesClient.tsx + DuesStatusTab.tsx 커밋·푸시 완료 (99차 후반부)
- 3859a26 fix(dues): 잔고 카드 간격 + 면제/선납 뱃지 구분 + 선납 그룹 분리
- 2695632 refactor(dues): exemptLabel 변수로 hoist

---

## 98차 신규 추가 (2026-06-25) — Safari CSS 후속

### git stash 백업 정리 (LOW, 즉시 가능)
- **배경**: 98차 스코프 조정 삽질 과정에서 text 포함 770곳 버전을 `git stash`로 백업(`colormix-broad-revert`). 작업 완료 후 불필요.
- [ ] `git stash list`로 존재 확인 후 `git stash drop colormix-broad-revert` 또는 번호로 폐기

### Safari border-/shadow- 계열 색상 추가 확인 (LOW, 현장 확인 후)
- **배경**: 98차에 `border-`·`shadow-`는 가독성 무관으로 제외. 실제 Safari에서 border 색이 진하게 보이면 같은 slash-alpha 방식 변환 검토.
- [ ] Safari 실기기(또는 macOS Safari)에서 배포 후 border-계열 색상 이상 여부 확인
- [ ] 이상 있으면 `bg-` 처리와 동일 방식 regex 변환

---

## 97차 신규 추가 (2026-06-25) — 알림 안내 콘텐츠 정정 + 구독 깔때기

### ✅ 알림 안내 콘텐츠 4곳 정정 (HIGH → 99차 완료, fac7ac7)
- **완료**: 99차에 help 6곳·FaqSection·soccer-team-app-notifications.tsx(섹션 재작성)·블로그 초안 2개 전수 정정. "갤럭시·삼성인터넷은 앱 깔아야 알림" → "브라우저에서도 받음, 설정에서 켜기만 하면 됨" 로 수정 완료.
- **잔여**: 외부 발행 네이버·티스토리 글은 사용자 직접 플랫폼 재반영 필요 (99차 신규 항목으로 이동).

### 푸시 구독 깔때기 개선 검토 (MEDIUM, 진짜 구독 증가 레버)
- **배경**: subscribeToPush 호출처가 PersonalSettings.tsx 설정 토글 단 한 곳. 아는 사람만 켜는 구조 → 활성 584명 중 채널 보유 ~4%(24명) 저조의 진짜 원인. 브라우저 알림 자체가 불가한 게 아님.
- 웹 native 알림 권한은 1회 거절=영구차단 → 소프트 사전동의 배너 필수(96차 백로그 "소프트 옵트인 배너"와 연계).
- [ ] 적절한 시점(첫 경기 등록 후·대시보드 재방문 등) 알림 켜기 유도 UX 검토
- [ ] 96차 "웹 비TWA 사용자 소프트 옵트인 배너" 항목과 묶어 설계

---

## 96차 신규 추가 (2026-06-25) — 푸시/알림 후속

### 웹 비TWA 사용자 소프트 옵트인 배너 (MEDIUM, 잔존 레버)
- **배경**: 96차 실측에서 채널 보유 ~4%(활성 584명 중 24명)로 확인. 웹/PWA 유저는 PersonalSettings에서 직접 켜야 함 — 아는 사람만 아는 구조.
- 웹 native 알림 권한은 1회 거절 시 영구차단. 소프트 사전동의 배너 필수.
- [ ] 대시보드 닫기가능 배너: 조건(경기 1+·알림 permission=default·비TWA·pm_soft_optin 미표시)
- [ ] 배너 표시 후 "켜기" → subscribeToPush() 호출 → 구독 등록

### 알림 센터 페이지 /notifications (LOW, 파워유저용)
- **배경**: 죽은 링크만 제거했으나 실제 알림 목록 전체 보기 페이지가 없음. 현재는 벨 패널에서 최근 N개만 표시.
- [ ] /notifications 페이지 신설 (페이지네이션 포함, 벨 패널 오버플로우 대응)
- 현재 우선순위 낮음 — 사용자 요청 시 착수

---

## 95차 후반부 신규 추가 (2026-06-25) — 회원/등번호 후속

### 중복 멤버 병합 도구 (LOW, 현재 불필요)
- **배경**: 95차에서 최규일 중복 계정이 발견됐으나 실기록(출전·골·회비) 0 — 데이터 손상 없음. 단순 데이터 정리로 해결 완료.
- 향후 실기록이 있는 중복 계정이 생기면 병합 도구(두 row의 기록을 한 user_id로 통합) 필요할 수 있음.
- [ ] 실제 발생 시 설계 착수 (현재는 불필요)

### 강퇴 회원 랭킹 노출 정책 (LOW, 취향 결정)
- **배경**: BANNED 회원의 과거 기록(득점·MVP 등)이 팀 랭킹·통계에 계속 포함됨. 정책 미정.
- 옵션 A: 그대로 포함 (기록은 사실, 강퇴와 무관)
- 옵션 B: 랭킹에서 제외 (강퇴 회원 노출 부담 없앰)
- [ ] 사용자 정책 결정 후 구현 (현재는 A 상태)

---

## 95차 신규 추가 (2026-06-24) — E2E/성능 후속

### 인증 E2E를 CI에서 실제 구동 (MEDIUM, 사용자 리소스 필요)
- **배경**: 현재 CI는 SESSION_SECRET·service role 없어 인증 스펙 자동 skip(로컬 전용). 데모/dev-login 로그인 불가.
- [ ] 별도 **테스트용 Supabase 프로젝트** 생성 + 시드(데모 계정 FC DEMO)
- [ ] GitHub Secrets에 SESSION_SECRET·SUPABASE URL/keys·DEV_IMPERSONATE 등록
- [ ] `.github/workflows/ci.yml` e2e job에 env 주입 → 인증 스펙 CI 구동
- 제약: 워크플로 초안은 작성 가능, DB 프로비저닝·시크릿 등록은 사용자 몫

### CI lint 369 pre-existing 에러 정리 (LOW, 범위 승인 필요)
- **배경**: `npm run lint` 369 에러(react/no-unescaped-entities·no-html-link-for-pages·unused-vars 등) — 전부 95차 이전부터 존재(이번 변경분 0). CI lint job 빨강.
- [ ] `eslint --fix` 자동수정분 먼저 분리 커밋
- [ ] 나머지 수동(landing sections·lib/server 등) — 대규모 sweep, 별도 진행

### 랜딩(/login) perf 63 최적화 (LOW, 분석 완료·수정 미진행)
- **배경**: Lighthouse 분석 완료 — 원인=JS 과다(메인스레드 6.8s·미사용JS 99KB·JS실행 1.4s). warm LCP 1.2s라 대부분 유저 OK, 저사양 모바일·콜드캐시에서만 느림. `lighthouse-report/lighthouse-landing.html` 참고.
- [ ] below-fold 마케팅 섹션 dynamic import(lazy-load)
- [ ] framer-motion 축소 / 경량 CSS 애니메이션 대체
- [ ] 랜딩 번들 코드분할

## 93차 신규 추가 (2026-06-24) — 성능 최적화 잔여 + 공동 MVP 후속

### 실기기 Chrome DevTools 트레이스 (MEDIUM, 다음 성능 진단 시)
- **배경**: 3라운드 정적분석 완료 후 "더 이상 추측 최적화 금지" 상태. 남은 느림 진단의 진짜 다음 스텝.
- [ ] 폰에서 Chrome DevTools Remote Debugging → Performance 탭 / Lighthouse 트레이스 실행
- [ ] JS parse/exec 비중 vs 네트워크 대기 비중 판별
- [ ] 판별 결과 기반으로 다음 최적화 영역 결정 (추측 없이)

### 성능 최적화 미적용 잔여 후보 (LOW, 각 항목 별도 판단)
- **배경**: 3라운드 검토 중 발견됐으나 동작 민감·구조 변경 필요로 보류.
- [ ] `season-award-card` 자기 `/api/season-awards` HTTP 재호출 → 공유 함수 추출 (동일 SSR 경로 내)
- [ ] `posts/getBoardData` 무제한 `select("*")` → 페이지네이션 (truncation 함정 주의 — limit 추가 시 "더 보기" UX 필요)
- [ ] `dues/payment-status` route GET 내 write 분리 (동작 민감 — 기존 동작 완전 파악 후 진행)
- [ ] `DuesClient` 5탭 `hidden`→조건부 렌더 부분 적용 (OCR 탭 제외한 가벼운 탭만. OCR 탭은 파싱 중간상태 유실 위험)
- [ ] `TacticsBoard` `dynamic()` 분리 — 사용자 "TacticsBoard쪽 빼고" 명시. MatchTacticsTab.tsx:35-36 정적 import 잔존. 스켈레톤 28줄 미사용.

### react-easy-crop dynamic() 래퍼 (LOW, 재시도 시)
- **배경**: `dynamic()`이 클래스컴포넌트 defaultProps 타입 소실로 TSC 에러. `any` 캐스트 없이 재시도 방법: 래퍼 컴포넌트(함수형) 신설 후 그걸 dynamic().
- [ ] `src/components/CropperWrapper.tsx` 신설 (Cropper를 props 포워딩하는 함수형 래퍼)
- [ ] `dynamic(() => import('./CropperWrapper'))` 적용

### GA 투표 공유 퍼널 관찰 (MEDIUM, 1~2주 후)
- **배경**: 93차에 `vote_shared` + `vote_complete source="shared_link"` GA 이벤트 신설(605edd6). 공유→유입→투표 퍼널 첫 데이터.
- [ ] 1~2주 후 GA4 확인 — `vote_shared` 발생량 + `vote_complete` 중 shared_link 비율
- [ ] 수치 기반으로 무인증 투표(A3) 재검토 여부·추가 공유 UX 투자 판단

### player-card API MVP 랭킹 버그 (LOW, 별도 처리)
- **배경**: `src/app/api/player-card/route.ts:389` — 확정 winner가 아닌 생짜 득표수로 MVP 랭킹 비교. 93차 검토 중 발견, 범위 밖으로 보류.
- [ ] 해당 경로의 MVP 비교 로직을 `resolveValidMvps()` 기반으로 정정

---

## 92차 신규 추가 (2026-06-23) — 풋살 키퍼 순번 후속 + 테스트 데이터

### 키퍼 순번 테스트 데이터 정리 (MEDIUM, 사용자 테스트 후)
- **배경**: FCMZ 풋살(team 020db2ac)에 더미 16명("[테스트]A1~B8") + 자체전 경기(23cc278b, 8쿼터) 잔존. 기능 검증용으로 생성됨.
- **정리 스크립트**: `scripts/setup-keeper-test.mjs --clean` (미커밋, Supabase key는 env).
- [ ] 사용자 기능 테스트 완료 후 스크립트 실행하여 더미 데이터 삭제
- [ ] 스크립트 실행 후 커밋 또는 scripts/ 파일 정리

### 키퍼 순번 v2 후보 — 라이브 키퍼 트래커 (LOW, 보류)
- **배경**: 사용자가 관심 표명. 실점 시 다음 키퍼 버튼·현재 키퍼/쉬는 사람 자동 표시. 경기 중 실시간 운영 도구.
- 현재 기능(사전 계획)으로 충분한지 실제 사용 후 판단 예정.
- [ ] 실제 경기에서 키퍼 순번 기능 사용 후 v2 필요성 재검토

### CLAUDE.md 코드 정합성 점검 (LOW)
- **배경**: 92차에서 CLAUDE.md "guide.html→/guide 이관 완료" 박제가 실제 미이관이었던 불일치 발견.
- **잠재 불일치**: Realtime 구독 "MatchDetailClient 3개"(→실제 0개 제거됨), SSR 블로킹(getOrComputeTeamStats) 해소 여부, 기타 박제된 "완료" 항목.
- [ ] CLAUDE.md의 "✅ 완료" 박제 항목 코드 grep으로 실제 상태 대조 (세션 초반 5분 투자)

---

## 91차 신규 추가 (2026-06-23) — 풋살·축구 종목 분기 버그 전수조사 미수정 항목

### #3 풋살 3·4인 포메이션 slot.role 코드 통일 (LOW, 별도 세션 권장)
- **배경**: `src/lib/formations.ts` 풋살 3·4인 포메이션 slot.role이 축구 코드(CB/ST/LW/CAM/LCB/RCB). 풋살 5·6인만 FIXO/ALA/PIVO 올바름. → 풋살 3·4인 자동편성 포지션 추천 정확도 하락.
- **현재 영향 범위 제한**: 풋살 7·8인은 matches/route.ts:115 인원 제한(3~6명)으로 도달불가(죽은코드). 역할가이드(MatchRoleGuide.tsx:57)는 풋살 5·6인만 지원 → 잘못된 role 라벨이 화면에 뜨지는 않음. 자동편성 추천 품질만 영향.
- ⚠️ 43차 풋살 자동편성 회귀 이력 있음 — 수정 시 풋살 자동편성 전수 테스트 필수.
- ℹ️ `formationAI.ts`(slotToPreferred 포함)는 앱 미사용(test-only)으로 전수조사에서 삭제됨. 현 자동편성은 `AutoFormationBuilder`/AI 전술 경로. 이 항목은 `formations.ts` slot.role 만 대상.
- [ ] formations.ts 풋살 3·4인 포메이션 slot.role을 FIXO/ALA/PIVO로 교체
- [ ] vitest 풋살 포메이션 관련 케이스 회귀 확인

### #4·#5 포지션 라벨 한국어화 (LOW, 양 종목 공통)
- **배경**: `src/app/(app)/records/RecordsClient.tsx:453`, `src/app/(app)/player/[memberId]/page.tsx:73` — 포지션이 영문 코드(CB, ST, FIXO 등)로 그대로 표시됨. 한국어 라벨 미적용.
- **성격**: 풋살 전용 버그 아님. 축구·풋살 양 종목 공통 표시 정책 미구현.
- [ ] 포지션 영문→한국어 라벨 매핑 헬퍼 확인 또는 신설 (src/lib/ 내 기존 매핑 grep 먼저)
- [ ] RecordsClient.tsx:453, player/[memberId]/page.tsx:73 적용

---

## 89차 신규 추가 (2026-06-21) — 크론 timezone 버그 후속

### vote-reminder 정상 동작 확인 (LOW, 다음 경기 마감 전날)
- **배경**: 3605f42로 KST 오프셋 +09:00 명시 수정 완료. 실제 경기 마감 알림으로 동작 검증 필요.
- [ ] 다음 FCMZ 경기(17:00 마감) 마감 전날 vote-reminder 정상 발송 여부 확인
- [ ] vote_deadline 입력 시 UTC/KST 변환 경로 재점검: `EditMatchInfoForm`의 datetime-local defaultValue → 저장 로직 (`timestamptz 체크리스트` 참조)

### kstDate.ts 적용 사후 점검 (LOW)
- **배경**: eea164d에서 12개 파일에 getKstToday() 교체 적용. KST 00~09시 동작 확인 미완.
- [ ] KST 00:00~09:00 사이 경기 판정·대시보드 인사말·날짜 피커 기본값 실제 동작 확인 (기기 시각 변경 테스트 또는 로그)
- [ ] `new Date().toISOString().slice(0,10)` 패턴 재등장 방지: 다음 코드 리뷰 시 grep 확인

---

## 88차 신규 추가 (2026-06-19) — 자체전 3팀 후속 + OVR 모니터링

### 자체전 3팀 가이드 — 3팀 운영 섹션 추가 (LOW)
- **배경**: `src/lib/guides/posts/futsal-self-match-lineup.tsx`가 2팀 6:6 기준으로 작성됨. 88차 3팀 기능 출시 후 내용 보강 필요.
- [ ] 3팀(A/B/C) 운영 섹션 추가 (인원 배분 예시·균등 자동분배 버튼 안내)
- [ ] migration 00076 Supabase 적용 확인 (사용자 직접 적용 여부 미확인)

### 자체전 OVR 하락 모니터링 (LOW)
- **배경**: 88차 `computeSeasonOvr`·`player-card`에서 자체전을 승/클린시트/실점 분모에서 제외. 다음 OVR 재계산 시 자체전 많이 뛴 선수 OVR 하락 예정.
- [ ] 재계산 후 선수 OVR 변화 모니터링
- [ ] 필요 시 사용자 공지 (정정 취지 설명)

### 포레마제 3팀 기능 안내 (LOW, 사용자 직접)
- **배경**: 전상준(포레마제 회장) 문의로 3팀 기능 개발됨. 출시 안내 가능.
- [ ] 카톡으로 3팀 기능 사용법 안내 (전술 탭 → C팀 토글 + 균등 분배)

---

## 87차 신규 추가 (2026-06-19) — 네이티브 FCM 후속

### v1.0.8 Play 프로덕션 게시·롤아웃 확인 (HIGH, 사용자 직접, 1~3일 내)
- **배경**: 6/18 versionCode 12 / v1.0.8 심사 제출 완료. 알림 아이콘 수정 + 네이티브 FCM.
- [ ] 심사 통과 알림 수신 후 Play Store 게시 확인
- [ ] 설치 사용자에게 v1.0.8 업데이트 자동 배포 확인

### 네이티브 FCM 실기기 검증 체크리스트 (HIGH, 사용자 직접)
- **배경**: fcc2672(notification 페이로드) 배포 완료. 실 기기 확인 필요.
- [ ] v1.0.8 폰 설치 후 앱 1회 실행 → Supabase `native_push_tokens` row 등록 확인
- [ ] 테스트 푸시 발사 → 기본 브라우저가 삼성 인터넷이어도 알림 뜨는지 확인
- [ ] 데스크톱 웹푸시 회귀 없음 확인 (동시 등록 상태에서 중복 없는지)

### 네이티브 FCM 선택적 후속 개선 (LOW, 재빌드 필요)
- **배경**: 현재 구현으로 핵심 문제(삼성인터넷 무관 푸시 전달) 해결됨. 아래는 polish.
- [ ] 알림 탭 딥링크 — 알림 탭 시 특정 화면 이동 (현재 대시보드로만)
- [ ] 브랜드 알림 채널 — "PitchMaster 알림" 채널명 (현재 FCM 기본 채널)
- [ ] 첫 실행 토큰 등록 — 현재 2번째 실행부터 등록됨 (LauncherActivity 타이밍 이슈)

## 86차 신규 추가 (2026-06-17) — 푸시 재참여 + 활성화

### 푸시 Part2 — 웹 첫 경기 후 소프트 옵트인 배너 (MEDIUM)
- TWA 자동구독(Part1, c02d303) 배포됨. 웹(비TWA) 사용자용 미구현.
- native 권한 1회 거절=영구차단이라 소프트 사전동의 필수. 추천: 대시보드 닫기가능 배너(경기1+·권한 default·비TWA) → 탭 시 subscribeToPush.
- [ ] Part1 실기기 검증: 앱 열면 push_subscriptions 4→증가 확인

### 주간 넛지 cron — "이번 주 경기 만들기" (MEDIUM, 활성화 레버)
- cadence 있는데 다음 경기 없는 팀에 주 1회 푸시. 조용시간·dedup 설계. 푸시 구독 확보(위) 선행.

### 온보딩을 "명단 등록"→"첫 경기 생성"으로 (MEDIUM)
- 신규팀 활성화율 0%(경기2개 도달). 온보딩 끝을 첫 진짜 경기 생성 + payoff 노출로.

### CLAUDE.md stale 정정 (LOW)
- Realtime 구독 "MatchDetailClient 3개"→실제 0개(제거됨). SSR 블로킹(getOrComputeTeamStats) 해소됨. guide.html=앱 사용법 매뉴얼(레거시 아님, /guide와 별개).

## 84차 신규 추가 (2026-06-14) — TWA v1.0.7 Play 심사 후속

### Play Store v1.0.7 심사 통과·게시 확인 (HIGH, 1~3일 내)
- **배경**: versionCode 11 / v1.0.7 (알림 아이콘 흰 네모 버그 수정) Play Console 프로덕션 제출 완료 (6/14).
- [ ] 심사 통과 알림 수신 후 Play Store 게시 확인
- [ ] 설치 사용자에게 v1.0.7 업데이트 자동 배포 확인
- 통과 후 별도 조치 없음 (자동 배포). 반려 시 사유 분석.

---

## 83차 신규 추가 (2026-06-11) — 크론 전수조사 후속

### 종료시각 미등록 경기 → 자정 MVP 푸시 (LOW)
- `match_end_time` null인 당일 경기는 당일에 자동 완료 안 되고 KST 자정(00:00~00:05) 크론에서 COMPLETED → MVP 투표 푸시가 새벽 0시 발송
- urgency high(82차 적용)로 단말 지연은 사라졌지만 자정 발송 자체는 남음
- 후보: 자정~아침 9시 완료 경기의 MVP 푸시를 9시까지 지연(quiet hours), 또는 경기 등록 폼에서 종료시각 입력 유도
- [ ] 발생 빈도(종료시각 null 비율) 측정 후 결정

### match-result 크론 C안 업그레이드 (LOW, 보류)
- 현행 A안(9시·22시 2회)으로 해소. 낮 경기까지 "종료 2시간 후 즉시" 받으려면 15분 크론 + 야간 금지창 필요
- [ ] 보류 — 팀들의 골 입력 속도(종료→첫 골 기록 간격) 데이터 확인 후 0:0 오발송 리스크 판단

---

## 82차 후속 신규 추가 (2026-06-11) — 출시 후속 + 마케팅

### 인스타 Meta Pixel 설치 (MEDIUM, 사용자가 나중으로 미룸)
- **배경**: 광고 재개 선행 조건. 사용자가 Meta 데이터세트 생성 + Pixel ID 제공 필요.
- **구현**: `next/script` Meta Pixel 코드 삽입 (`reference_meta_ads_setup.md` 참조)
- [ ] 사용자가 Pixel ID 제공 시 코드 연동 (1파일 수정, 즉시 가능)
- 집행 타이밍: 정식 출시 리뷰 2~3주 쌓인 후 (6/25 전후)

### 골키퍼 쿼터별 클린시트 통계 커밋 (HIGH, 사용자 진행 중)
- **배경**: `src/lib/server/getGoalkeeperStats.ts`(신규) + RecordsClient·api/records/route·getRecordsData 수정. 빌드·테스트(834개) 통과 확인됨.
- [ ] 사용자가 작업 마무리 후 커밋·푸시 예정
- ⚠️ 이 변경분 손대지 말 것 — 사용자 진행 중

---

## 82차 신규 추가 (2026-06-11) — Google Play 정식 출시 후속

### Play Console 앱 이름·스크린샷 정비 (MEDIUM, 사용자 직접)
- **배경**: 정식 출시 후 Play Console 스토어 등록정보 완성도 향상 필요.
- [ ] 앱 이름 한글화 저장 — "피치마스터 PitchMaster - 풋살·축구 팀관리" Play Console에서 저장 확인
- [ ] 스크린샷 최신 UI 반영 여부 확인 (현재 화면과 차이 있으면 재촬영)

### 테스터 공개 리뷰 재안내 (HIGH, 사용자 직접, 6/15 예정)
- **배경**: 비공개 테스트 트랙 일시중지(6/11) 완료했으나 그것만으론 부족. 각 테스터가 직접 옵트아웃해야 공개 별점 가능.
- **절차**: ① Play스토어 프로필→앱 및 기기 관리→베타→피치마스터→"나가기"(2회) ② 앱 삭제 ③ 정식버전 재설치 ④ 리뷰 작성
- ⚠️ 앱 삭제만으론 옵트아웃 안 됨. 트랙 "다시 시작" 누르지 말 것. 초기 리뷰는 테스트 이력 없는 지인·신규 사용자 우선 권장.
- [ ] 테스터 13명에 안내 문구 발송 (사용자 6/15 직접 예정)

### 출시 첫 주 지표 모니터링 (HIGH, 6/11~6/18)
- **배경**: Play Console 설치/삭제 + signup_source 분포로 첫 주 유입 패턴 파악.
- [ ] Play Console 통계 확인 (설치 수·삭제 수·평점)
- [ ] Supabase signup_source 조회 — `ilike '%pitchmaster%'` 또는 android 유입 확인
- [ ] 첫 주 신규 가입 팀 출처 분석

---

## 80차 신규 추가 (2026-06-09) — 골 기록 버그 스윕 보류 항목

### #5 상대 자책골(OPPONENT+자책골) 크레딧 규칙 불일치 (LOW, 보류)
- **배경**: ~15 집계 경로에 두 가지 규칙 분산. 자체전 자책골(실버그, 생성 가능)은 80차에 수정. 상대 자책골(OPPONENT+ownGoal flag)은 **UI 생성 불가·실데이터 0건** 확인.
- **판단 근거**: `feedback_verify_actual_usage_not_schema.md` — 스키마 enum≠실제 사용.
- 정 통일하려면 공유 헬퍼 리팩토링 (15파일). 실데이터 발생 또는 사용자 명시 요청 시 착수.
- 참고: `reference_goal_score_aggregation_dual_rule.md`

### #6 season-awards 시즌 W/D/L에 INTERNAL 경기 포함 (MEDIUM, 미해결)
- **배경**: `isTeamRecordMatch` 필터 누락으로 자체전(INTERNAL)이 시즌 전적에 포함됨.
- 80차에 사용자가 "이번엔 건드리지 말 것" 명시 → 미해결 유지.
- [ ] 다음 세션에서 재논의 후 수정 여부 결정
- 수정 방향(안): season-awards API에 `matches.match_type != 'INTERNAL'` 필터 추가

### #7d MemberEditModal 휴면 버튼 fire-and-forget (LOW, 보류)
- **배경**: `onSet: () => void` prop 계약상 가드하려면 부모 컴포넌트 prop 타입 변경 필요. idempotent 작업이라 실질 위험 낮음.
- [ ] 보류 유지 — 재논의 시 prop 계약 변경 범위 확인 후 결정

---

## 79차 신규 추가 (2026-06-09) — 알파 5차 검토 대기·G2 후속·78차 미커밋

### 🔴 알파 5차 검토 결과 대기 (HIGH)
- **배경**: 6/9 사용자가 프로덕션 신청 접수 완료. 검토 1~3일, 길면 7일.
- [ ] 검토 중 13명 테스터 매일 앱 진입 유지 (rolling 14일 윈도우 — 중간 끊기면 검토 중 하락 잡힐 수 있음)
- [ ] 결과 수신 후: 통과 → 알파 시스템 정리 결정. 반려 → 사유 분석 + 6차 준비.

### 🟡 G2 자체 도메인 후속 (MEDIUM, 사용자 직접)
- **배경**: e6f1308 push 완료. 자체 도메인 SEO 후속 작업 필요.
- [ ] 네이버 서치어드바이저 `/guide/soccer-team-penalty-rules` 수집 요청 (자체 도메인만)
- [ ] GSC URL 검사 → 색인 요청
- [ ] G1(`/guide/soccer-dues-management`) GSC 확인도 병행

### ✅ 78차 미커밋 3파일 커밋·배포 → 완료 (c772a27, 6/9 20:46)
- LoginHelp.tsx·InAppBrowserBanner.tsx·login/page.tsx 3파일 + 온보딩 미리보기 포함 push 완료.

---

## 78차 신규 백로그 (2026-06-09) — 온보딩 리뷰 발견

### 팀명 DB UNIQUE 부재 — 동시 생성 race 가능 (LOW)
- **배경**: `teams.name`이 DB UNIQUE 없음 (마이그 00001 확인. invite_code만 unique). 동시 요청으로 동일 팀명 2개 생성 가능. 앱레벨 `.single()` 체크만 존재.
- **위험도**: 낮음 (동시 생성 빈도 극히 낮음). 현재 131팀 운영 중 미발생.
- [ ] 선택지 A: Supabase `teams` 테이블 `name` 컬럼에 UNIQUE 제약 추가 + 앱 에러 핸들링. 선택지 B: 현행 유지.
- 사용자 결정 대기.

### joinTeam 기존멤버 status 필터 누락 (LOW)
- **배경**: `joinTeam` 함수에서 기존 멤버십 체크 시 status 필터 없음. LEFT/BANNED row가 존재하면 재가입 시 옛 역할로 세션 일시 세팅될 수 있음. 직후 auth 동기화가 이상 role을 strip하므로 실질 피해 낮음.
- [ ] `team/actions.ts` joinTeam — 기존멤버 조회 쿼리에 `.eq('status','ACTIVE')` 조건 추가 (또는 ACTIVE/DORMANT 포함 명시)
- 낮은 위험. 미착수.

### /team/page.tsx DESIGN_PREVIEW_USER_ID 하드코딩 정리 (LOW)
- **배경**: `src/app/team/page.tsx`에 `DESIGN_PREVIEW_USER_ID = '...'` 하드코딩. 김선휘 본인 user_id가 노출됨. 미리보기 기능 자체는 의도된 것이나 ID 하드코딩은 임시 구현.
- [ ] 선택지: 어드민 플래그(`users.is_admin` 등)로 교체하거나, 환경 변수로 이동.

### 온보딩 포지션 카드 기본 접힘 재검토 (LOW, 보류)
- **배경**: 포지션 그룹이 기본 펼침(defaultOpen)인 상태. 사용자가 이번 세션에서 접힘으로 전환 보류 결정(접힘 시 그룹 존재 자체를 모를 수 있음).
- [ ] 재검토 조건: 온보딩 이탈률 지표 확인 후. 현행 유지.

---

## 77차 완료·잔존 (2026-06-08)

### ✅ 알파 D14 + vc10 AAB + 5차 프로덕션 신청 → 완료 (79차)
- vc10(v1.0.6) 이미 ~6/7 Play Console 업로드됨. 13명×14일 streak 충족 확인. 사용자 6/9 접수 완료.

### ✅ G2 미투표 벌금 규칙 커밋·발행 → 완료 (79차, e6f1308)

### 잔존 설문 발송 결정 (HIGH, 사용자 결정 대기)
- **배경**: 4세그먼트 설계 완료, CSV 준비됨(`C:/Users/온유아빠/retention-survey-list.csv`). 보류 유지 중.
- [ ] 발송 결정 시: D세그먼트(신규 진행중 6팀) 최우선
- [ ] 대형 로스터 이탈 C팀 5개(용왕FC·FC Blue·JC United·Bavvy Brown·FC포티스) 최우선 인터뷰 대상

### 전략 후속 — 활성화 개선 (MEDIUM, 설문 진단 후 착수)
- **배경**: 77차 사업 분석 결론 — 잔존 레버 = 첫 2주 경기 cadence. plan 파일 `delightful-petting-meteor.md` 참조.
- [ ] 첫 경기 7일 후 카톡 리마인드 또는 경기 cadence 넛지 설계 (설문 결과 수신 후)
- [ ] 무로그인 링크 투표 (회원이 아닌 참가자 투표 허용) — 채택 여부 사용자 결정

### G3~ 가이드 주제 선정 (MEDIUM, G2 발행 2주 후)
- **배경**: 네이버 서치어드바이저 실측 키워드 기반 트랙 계속. G2 발행(6/9) 후 2주 경과(6/23 전후) 재측정.
- [ ] G3 후보: 출석 관리 / AI 라인업·자동편성 / 동호회 운영 A to Z
- [ ] 7편 네이버·티스토리 보류 재결정 (8편 효과 측정 시점 6/15 전후)

---

## 78차 + 76차 완료 처리 (2026-06-09 79차 기준)

### 🟡 로그인 도움말 커밋·배포 (→ 79차 잔존으로 이동, 위 참조)

### ✅ 알파 빌드 vc10 + 5차 프로덕션 신청 → 완료 (79차, 6/9)
### ✅ G2 벌금 규칙 커밋·발행 → 완료 (79차, e6f1308)

## 76차 잔존

### /guide 인덱스 허브 페이지 신설 (MEDIUM, sitemap 404 해소)

### /guide 인덱스 허브 페이지 신설 (MEDIUM, sitemap 404 해소)
- **배경**: `sitemap.ts`가 `/guide` URL 등록 중이나 인덱스 페이지 없어 404. 가이드 내부 링크망도 약함.
- [x] `/guide` 인덱스 페이지 신설 — 발행된 가이드 목록 카드 ✅ 완료 (`src/app/guide/page.tsx` listGuides+JSON-LD, 102차 확인)
- [ ] sitemap.ts에서 `/guide` 등록 방식 확인 후 정리

### FooterSection "시작 가이드" 링크 교체 (LOW)
- **배경**: `FooterSection.tsx` "시작 가이드" 링크가 레거시 `/guide.html` 가리킴. 허브 페이지 신설 후 교체 필요.
- [ ] 허브 페이지 신설 후 `/guide.html` → `/guide` 교체

### 가이드 G3~G6 후보 (MEDIUM, G2 발행 후 착수)
- **배경**: 네이버 서치어드바이저 실측 키워드 기반 가이드 트랙 계속.
- [ ] G3: 출석 관리 / G4: AI 라인업·자동편성 / G5: 동호회 운영 A to Z / G6: 경기 기록·통계 활용
- 주제 확정 전 서치어드바이저 최신 노출 키워드 재측정 권장 (G1·G2 발행 2주 후)

### chatgpt/gemini referrer 유입 모니터링 (MEDIUM, 2주 주기)
- **배경**: GEO 진단에서 cold(Lv1~3) 미노출 확인. 콘텐츠 축적 후 재테스트 필요.
- [ ] 2주 후 Supabase `signup_source ilike '%chatgpt%'` 누적 추이 재조회
- [ ] 클린 cold 질의(Lv1~3) 재테스트 — G1·G2 가이드 색인 후 변화 확인
- [ ] 클루보·팀스푼 Play Store 직접 검색으로 진위 확인 (미검증 잔여)
- 참고: `project_chatgpt_traffic_channel.md`

---

## 74차 신규 추가 (2026-06-06) — AI 코드 정정·문서 정합성 (사용자 승인 대기)

### CLAUDE.md "AI 5종" → 실제 라이브 3종으로 정정 (LOW, 사용자 승인 대기)
- **배경**: 74차 코드 검증에서 경기 후기·선수 시그니처가 LLM 아닌 룰 기반임 확인. CLAUDE.md AI 기능 표 업데이트 필요.
- [ ] `CLAUDE.md` AI 기능 목록 표에서 경기 후기·선수 시그니처 "LLM 아님" 명시
- [ ] `CLAUDE.md` 테스트 수 "615+" → "800+" 갱신 (실측 814 it/test)

### DuesBulkTab.tsx:589 stale 주석 정정 (LOW)
- **배경**: `DuesBulkTab.tsx:589` 주석 "Clova OCR이 기본, AI OCR이 폴백"은 실제 로직과 반대 (AI Vision이 1순위, Clova가 폴백).
- [ ] `src/app/(app)/dues/DuesBulkTab.tsx:589` 주석 1줄 수정 (Claude Vision 1순위, Clova 폴백으로 정정)
- 참고: 실제 흐름 `DuesBulkTab.tsx:351-382` 확인 완료

### aiMatchSummary.ts / aiMatchSummaryCache.ts dead code 정리 (LOW, 사용자 결정 후)
- **배경**: 두 파일 모두 호출처 없는 dead code. 라이브 라우트는 템플릿만 호출. 삭제 또는 TODO 주석 처리 여부 사용자 결정 필요.
- [ ] 사용자가 삭제 결정 시 두 파일 제거 + 테스트 갱신

---

## 73차 신규 추가 (2026-06-03) — 문서 정합성 후속

### domain_match_detail_tabs.md 자체전 AI 코치 미노출 정책 반영 (LOW)
- **배경**: 96df294에서 INTERNAL 경기 AI 코치 카드 미노출 적용. 메모리·CLAUDE.md 미반영.
- [ ] `memory/domain_match_detail_tabs.md` — 자체전 AI 코치 카드 미노출 정책 한 줄 추가
- [ ] `src/app/(app)/matches/CLAUDE.md` — AI 코치 분석 카드 조건 `canManage` → `canManage && !isInternal` 갱신

### 2차 리뷰 Low 항목 정리 (LOW, 사용자 결정 후)
- **배경**: 2차 리뷰 79개 중 Medium 이상은 73차에서 처리 완료. Low 항목 미착수.
- [ ] Low 항목 목록 사용자 공유 후 취사선택

---

## 72차 신규 추가 (2026-06-02) — 잔존 설문·알파·잔존 개선·블로그

### 잔존 설문 발송 결정 (HIGH, 사용자 결정 대기)
- **배경**: 4세그먼트 설계 완료, CSV 준비됨(`C:/Users/온유아빠/retention-survey-list.csv`). 현재 보류.
- [ ] 발송 결정 시: D세그먼트(신규 진행중 6팀) 최우선. 이탈=카톡 단답 1문항, 잔존=경량 폼, 신규=실시간 마이크로
- [ ] 대형 로스터 이탈 C팀 5개(용왕FC·FC Blue·JC United·Bavvy Brown·FC포티스) 최우선 인터뷰 대상
- 참고: `project_retention_diagnosis.md`

### ~~알파 D14(6/8) 달성 + vc10/11 iteration 빌드~~ → 77차 항목으로 이동
- [x] 72차 신규 항목이었으나 77차 최우선 항목으로 상단 이동. 77차 신규 추가 섹션 참조.

### WelcomeCard v2 코호트 재측정 (HIGH, 6/1~6/7 데이터 쌓인 후)
- **배경**: 67차 이후 표본 5팀 부족. 1주 더 쌓인 후 재측정 필요.
- [ ] Supabase 조회 — v2 이후 가입 팀 경기 등록률·멤버 수 재집계
- [ ] 회장 혼자 비율 변화 여부 확인 (현재 80% 기준)

### 잔존 개선 착수 (HIGH, 설문 진단 후)
- **배경**: 핵심 레버 = 첫 2주 경기 cadence. 설문으로 원인 좁힌 후 개입 설계.
- [ ] 설문 결과 수신 후 "첫 경기 → 2주 이내 2번째 경기" 촉진 방안 설계
- [ ] 실행 후보: 첫 경기 7일 후 카톡 리마인드·경기 cadence 가이드·대시보드 넛지

### 블로그 9편 주제 결정 (MEDIUM)
- **배경**: 8편(6/1 발행). 7편 네이버·티스토리 보류(8편 효과 측정 후 재결정).
- [ ] 8편 2주 후(6/15 전후) 네이버 유입 키워드 확인 → 9편 주제 결정
- [ ] 7편 네이버·티스토리 선발행/보류 재결정

---

## 70차 신규 추가 (2026-05-27) — 알파 4차 결과 + TWA 검증 + UX 후속

### ~~알파 4차 결과 분기 처리~~ (완료 — 68·72차)
- [x] 4차 반려(5/25) — 5차 D14=6/8로 전환. vc9(v1.0.5) 업로드 완료(72차). 72차 신규 항목으로 이동.

### TWA SW update prompt 실측 검증 (HIGH, 다음 hotfix 배포 후)
- **배경**: ddcda41 배포 완료. 다음 hotfix 배포 시 TWA 앱 환경에서 배너 실제 노출 여부 확인 필요.
- [ ] TWA 앱 실행 중 서버 배포 → 배너 노출 여부 확인
- [ ] 5분 polling 및 visibilitychange 트리거 둘 다 확인
- 참고: `feat(twa): surface SW update with a reload prompt` (ddcda41)

### HintCard localStorage 활용 효과 측정 (MEDIUM, 2주 후)
- **배경**: 1bdb30e에서 5곳 HintCard 적용. 실제 혼란 감소 여부 측정 기준 없음.
- [ ] 출석·전술·회비 OCR·후기 MVP·가입 신청 5곳 이탈률 변화 확인 (2주 후 Supabase)
- [ ] HintCard 닫기 빈도 추적 이벤트 추가 여부 사용자 결정 후 진행

---

## 69차+ 신규 추가 (2026-05-27) — 블로그 7편 발행 후속

### 블로그 7편 자체 도메인 커밋·푸시·후속 작업 (HIGH, 5/28 우선)
- **배경**: 7편 `kakao-vote-vs-app.tsx` + registry.ts 로컬에만 존재. 미커밋·미푸시 상태.
- [ ] `src/lib/guides/posts/kakao-vote-vs-app.tsx` + `src/lib/guides/registry.ts` git add + commit + push
- [ ] 자체 도메인 `/guide/kakao-vote-vs-app` 발행 확인
- [ ] 자체 도메인 서치어드바이저 수집 요청 + GSC URL 검사 색인 요청 (자체 도메인이므로 필수)

### 블로그 7편 네이버·티스토리 발행 (HIGH, 5/28~5/29)
- **배경**: 초안 `docs/blog-guide-kakao-vote-vs-app-naver.md` / `…-tistory.md` 작성 완료.
- [ ] 5/28 네이버 블로그 발행 (`docs/blog-guide-kakao-vote-vs-app-naver.md` 기준)
- [ ] 5/29 티스토리 발행 (`docs/blog-guide-kakao-vote-vs-app-tistory.md` 기준)

### 네이버 SEO 재진단 (MEDIUM, 5/27~6/3 시점 도래)
- **배경**: 5/9 변곡점 14~21일 후 재진단 시점 (reference_naver_seo_2026_05_20.md 박제).
- [ ] 서치어드바이저 색인 수·노출 키워드·클릭 변화 재측정
- [ ] 클릭 0인 8개 잠재 키워드 중 클릭 발생 여부 확인
- [ ] favicon.ico 재크롤 요청 효과 확인

## 68차 신규 추가 (2026-05-27) — 알파 5차 D14·TWA 검증·블로그 7편

### 알파 5차 D14 달성 점검 (HIGH, 6/8)
- **배경**: 4차 반려(5/25) 후 새 14일 사이클. D1=5/26, D14=6/8. 12명 연속 TWA 진입 달성 시 5번째 Play Console 신청.
- [ ] 5/28 (D3) 중간 점검 — 12명 진입 유지 여부 어드민 확인
- [ ] sessionStorage fix(2a176f0) 후 정민기·이정우 TWA 출석 잡히는지 검증
- [ ] 6/8 D14 달성 시 Play Console 프로덕션 5번째 신청
- [ ] 헤비 회장 7명 1:1 카톡 발송 (사용자가 직접)

### ~~블로그 7편 주제 결정 및 발행~~ (부분 완료 — 69차+)
- [x] 7편 주제 결정: "동호회 카톡 투표 vs 앱 비교" (3파전 심화편 reject)
- [x] 자체 도메인 초안 `src/lib/guides/posts/kakao-vote-vs-app.tsx` 작성 완료 (미커밋·미푸시)
- [x] 네이버·티스토리 초안 작성 완료
- [x] 6편 자체 도메인 GSC URL 색인 요청 + 서치어드바이저 수집 요청 완료 (5/27)
- [ ] 7편 커밋·푸시·발행 → 69차+ 신규 항목으로 이동

### FCO2 회장 가입 대기 처리 (HIGH, 즉시)
- **배경**: 강진성·이연 가입 대기 6일 이상. FCO2 회장(성원창) 카톡 안내 필요.
- [ ] FCO2 회장에게 가입 승인 경로 안내 (설정→팀설정→가입 신청)
- [ ] 강진성·이연 처리 완료 확인

## 67차 신규 추가 (2026-05-25) — 코호트 재측정·카톡 공유 추적

### WelcomeCard v2 코호트 재측정 (HIGH, 6/1~6/7)
- **배경**: 67차 v2 이후 가입 표본 5팀 — 부족. 7~14일 더 쌓인 뒤 재측정 필요.
- [ ] 6/1~6/7 Supabase 조회 — v2 이후 가입 팀 경기 등록률·멤버 수 재집계
- [ ] 회장 혼자 비율 변화 여부 확인 (현재 80% 기준)

### 카톡 공유 버튼 click 추적 이벤트 추가 (MEDIUM)
- **배경**: WelcomeCard·위자드 Step 2의 "단톡방 공유" 버튼 클릭 수 및 전환률 측정 불가. "회장 혼자 80%" 누수 원인 분리 위해 필요.
- [ ] `kakaoShare.shareTeamInvite` 호출 시 GA4 또는 Supabase 이벤트 로그 (`kakao_share_clicked`)
- [ ] 클릭 후 D+3 멤버 합류 여부 연결 (팀 ID 기준)
- 현재 공유 버튼 위치: WelcomeCard(대시보드) + 위자드 Step 2

## 66차-B 신규 추가 (2026-05-20) — ChatGPT 채널 추적·SEO 후속

### ~~블로그 6편 주제 결정 및 발행~~ (완료 — 68차)
- [x] 6편 "축구팀 엑셀 vs 앱 비교" 전채널 발행 완료 (5b66303, 자체 5/26·네이버·티스토리 5/27)

### ChatGPT 유입 채널 추적 (MEDIUM, 2주 주기)
- **배경**: 24h 내 chatgpt.com 유입 2명 최초 검출. LLM 추천 1순위 확인. 새 트래픽 채널로 자리잡기 시작 (project_chatgpt_traffic_channel.md).
- [ ] 변형 질의 재시도: "풋살팀 회비 자동 정리 앱", "조기축구 총무 도와주는 앱" — PitchMaster 노출 일관성 확인
- [ ] 클루보·팀스푼 Play Store 검색 진위 확인 (ChatGPT 추천 경쟁사 2개 hallucination 여부)
- [ ] signup_source='chatgpt.com' 누적 추이 2주 주기 Supabase 조회

### 네이버 SEO 후속 (MEDIUM, 5/27~6/3)
- **배경**: 5/9 변곡점 이후 노출 7~14건/일 유지. 색인 3→7, 키워드 7→30. 클릭 0인 잠재 키워드 8개 존재 (reference_naver_seo_2026_05_20.md).
- [ ] favicon.ico 네이버 서치어드바이저 재크롤 요청 (서치어드바이저 → 웹페이지 수집 → URL 직접 입력)
- [ ] 클릭 0인 8개 키워드 노출 URL 확인 → 메타 디스크립션·title 보강
- [ ] 5/27~6/3 재진단 — 5/9 변곡점 누적 측정

### ~~알파 D14 완주 점검 (HIGH, 5/25)~~ (완료 — 68차)
- [x] 4차 반려(5/25) 확인. 5차 신청 준비로 전환 (68차 신규 항목 참조)

## 66차 신규 추가 (2026-05-20) — 대시보드 후속 정리·디자인 마이그 보류

### getDashboardData recentResult fetch 제거 (LOW, 기술 부채)
- **배경**: recentResult를 SSR에서 fetch하지만 클라이언트에서 사용 안 함. 불필요한 DB 조회.
- [ ] getDashboardData에서 recentResult 관련 fetch 제거
- [ ] 클라이언트 타입 정의 정리

### teamGoalRank 동률 처리 라벨 검토 (LOW)
- **배경**: 66차에서 "팀내 상위 N위"로 일괄 적용했으나 동률 시 정확한 라벨 필요.
- [ ] 동률 발생 시나리오 확인 후 "N위 (공동)" 등 표기 방안 검토

### 전술 미설정 chip 백엔드 squad info 추가 후 복구 (MEDIUM)
- **배경**: 전술 미설정 chip 표시를 위해 getDashboardData에 squad 요약 정보가 필요. 현재 미구현.
- [ ] getDashboardData에 squad 편성 여부 포함 (per upcoming match)
- [ ] 대시보드 카드에 "전술 미설정" chip 노출

### 디자인 마이그 보류 목록 (LOW, 사용자 명시 중단)
- **배경**: 66차 대시보드+매치 마이그 완료 후 사용자가 "당분간 수정 안 함" 결정.
- [ ] 매치 상세 6탭 (정보·투표·전술·출석·기록·후기) 시안 v2 마이그
- [ ] 회비 페이지 시안 v2 마이그
- [ ] 기록 페이지 시안 v2 마이그
- [ ] 게시판 시안 v2 마이그
- [ ] 선수 카드 / 더보기 시안 v2 마이그
- [ ] ClientLayout 사이드바 폭 (시안 200 vs 현재 280) 조정

우선순위 기준:
- **HIGH**: 현재 100팀+ 운영에 직접 영향
- **MEDIUM**: 팀 50개 이상 시
- **LOW**: 팀 100개 이상 시 / nice-to-have

## 65차 신규 추가 (2026-05-19) — 편집기 분리·인터페이스 마이그·온보딩·블로그 후속

### 블로그 5편 발행 후속 (완료 — 66차-B)
- [x] 5/20: 5편 네이버 블로그 발행 완료
- [x] 5/20: 5편 티스토리 발행 완료 (룰상 5/21이었으나 당일 진행)
- [ ] 4편 GSC 색인 확인 (이전 항목 이월)

### 온보딩 분리 작업 완료 (MEDIUM, 다음 세션 초)
- **배경**: be146cd에서 OnboardingClient.tsx + onboarding.css 분리 진행 중. `src/app/onboarding/page.tsx` + 신규 파일들 미커밋 상태.
- [ ] 다음 세션 시작 시 `git status` 확인 → 미커밋 온보딩 파일 검토 후 커밋

### 알파 운영 마감 점검 (HIGH, 5/25)
- **배경**: 알파 5/11~5/25 20명 cap. 마감 시점 Play Console 프로덕션 신청 가능성 확인.
- [ ] 5/25 알파 참가자 수·달성일 수 확인
- [ ] 12명 14일 달성 시 Play Console 프로덕션 신청

### retention 4차 조회 (HIGH, 5/21)
- **배경**: 광고 4차 가입 팀(세븐스타·FC KS·FC한사바리) 5/21 이후 재추적 필요.
- [ ] 5/21 Supabase 조회 — 멤버 모집·경기 생성 여부 확인 (61차 항목과 연동)

### 50대 친화 패턴 잔여 5종 (LOW, 선택적)
- **배경**: 65차에 패턴 3·7만 적용. 나머지 5종은 미선택.
- [ ] 패턴 1: 용어 단순화 (전술판→전술 노트 등)
- [ ] 패턴 2: 인라인 도움말 툴팁
- [ ] 패턴 4: CoachMark 재진입 안내
- [ ] 패턴 5: 빈 상태 GIF 안내
- [ ] 패턴 6: 단계 축소

## 64차 신규 추가 (2026-05-18) — 약관·방침 AI 표기 정정

### 약관·개인정보처리방침 "AI 선수 시그니처" 표기 정정 (LOW)
- **배경**: 64차에서 시그니처가 룰 기반 결정론적 패턴 선택임을 확인. 그러나 약관/방침에 "AI" 수식 그대로 박혀 있음.
- 해당 위치 (grep 확인 필요, 아래는 추정):
  - `src/app/(legal)/terms/page.tsx` 약 113, 182줄 근처
  - `src/app/(legal)/privacy/page.tsx` 약 140, 184줄 근처
- [ ] "AI 선수 시그니처" → "선수 시그니처 문구" 또는 "자동 생성 선수 코멘트" 로 변경
- ⚠️ 실제 줄 번호는 다음 세션 시작 시 grep으로 재확인 필수

## 62차 신규 추가 (2026-05-15) — 전술 영상 후속 + CLAUDE.md 정정

### AnimationEditorClient 추가 분리 (LOW, 기술 부채)
- **배경**: P3 편집기 평면화 후 976줄. MetaCard·EditCanvas·StepList 등 분리 가능.
- [ ] 600줄 기준 초과 구간 식별 후 컴포넌트 단위 분리
- [ ] SortableStepChip은 b8db0f7에서 이미 분리됨 — 나머지 블록 추출

### 잔여 호환 코드 제거 (LOW, 인터페이스 마이그 작업 필요 — 단순 제거 아님)
- **배경**: DB 평면화 100% 완료(58 영상). 그러나 viewer/thumb/API validation/타입 정의가 여전히 `attack/defense` 인터페이스로 동작 중. `toLegacyMotionShape`는 평면 `steps` → `{attack, defense}` 변환 wrapper로 5곳 활성 사용 (63차 grep 검증).
- 활성 호출부: MatchRoleGuide·AnimationEditorClient(3곳)·AnimationsListClient
- attack/defense 인터페이스 직접 요구: FormationMotionViewer(mode 토글)·FormationMotionThumb·inferCategory·API route 2개·types.ts·dbTypes.ts·랜딩 FeaturesSection
- ✅ DB `motion_type` 컬럼: 코드 사용 0건 확인 (63차)
- ⚠️ `src/lib/positionRoles/`의 attack/defense는 다른 도메인(역할 가이드 텍스트) — 절대 건드리지 말 것
- [ ] **인터페이스 마이그레이션 프로젝트**로 다뤄야 함 — 단순 dead code 제거 아님
  - FormationMotionViewer가 평면 `steps[]` 직접 받도록 인터페이스 변경
  - FormationMotionThumb 동일
  - inferCategory 평면 우선 분기
  - API validation 새 스펙 (attack/defense optional 또는 제거)
  - TacticalAnimationData에서 attack/defense optional 또는 제거
  - toLegacyMotionShape 호출 5곳 인라인 후 함수 제거
  - 편집기 분리(위 항목)와 묶어 진행하면 효율적

### CLAUDE.md 라이트 모드 섹션 정정 (LOW, 다음 세션 초)
- **배경**: c8f384f 커밋(CSS 토큰 단일 source 통합)으로 실제 구현은 `:root.light` 클래스 토글이나 CLAUDE.md에 구 서술 잔존 가능.
- [ ] CLAUDE.md "디자인 시스템 > CSS 변수 토큰 위치" 섹션 현행 코드와 대조 후 정정
- 참고: ThemeContext.tsx `applyTheme()` = `classList.toggle('light')` 토글만

---

## 61차 신규 추가 (2026-05-14) — 광고 재개·알파·retention·GK 로테이션

### Meta Pixel 연동 + 광고 재개 (MEDIUM, 5/28 이후)
- **배경**: 광고 4차 활성률 12.5% leaky bucket 확인. 5/28까지 광고 일시 멈춤 권고.
- [ ] `next/script` Meta Pixel 코드 연동 (`reference_meta_ads_setup.md` 참조)
- [ ] Lookalike audience 생성 (기존 가입자 이메일 업로드 — 카카오 email 없음 한계 확인)
- [ ] 5/28 광고 재개 여부 결정 (인스타 콘텐츠 다양화 상태 확인 후)
- 거부 확정: 네이버·구글·카카오·유튜브 광고 (모두 메모리상 막힘)

### 4차 retention SQL 헬퍼 + 휴면 3팀 추적 (HIGH, 5/21)
- **배경**: 광고 4차 가입 팀 활성률 12.5%(8팀 중 1팀). 휴면 3팀(세븐스타·FC KS·FC한사바리) 추적.
- [ ] 5/21 Supabase 조회 — 멤버 모집·경기 생성 여부 확인
- [ ] 위자드 카드 → 멤버 초대 전환률 판정 (온보딩 개선 ROI 핵심 지표)

### signup_source 분포 SQL 헬퍼 작성 (MEDIUM, 5/18)
- **배경**: 광고 기간 귀속 분리 후 자연 유입 베이스라인 확보 필요.
- [ ] 5/18 이후 instagram / direct / null 비율 조회

### GK 로테이션 자동 (LOW, 마감 없음)
- **배경**: 사용자 "마지막" 명시. AutoFormationBuilder 통합 후보. 결정 사항 미정.
- 미정 결정: lookback N=5 vs 10, 풋살 최소 이력 조건
- [ ] 사용자 결정 수령 후 착수

---

## 60차 신규 추가 (2026-05-14) — 블로그 4·5편 + 알파 추적

### 블로그 4편 — 무료 풋살 전술판 앱 비교 (HIGH, 다음 세션 우선)
- **배경**: 기존 4편(리그 경우의 수) 폐기. 네이버 부상 키워드 "풋살 전술판" 공략.
- [ ] 자체 도메인 `/blog/futsal-tactics-app-comparison` 작성·발행
- [ ] 네이버 블로그 동시 발행
- [ ] 티스토리 동시 발행
- 참고: `project_blog_publishing_cadence.md`

### 블로그 5편 — 휴면·부상 회비 자동 면제 패턴 (HIGH, 다음 세션 이후)
- **배경**: PitchMaster unique value — 출석 기반 자동 면제. 경쟁사 없는 차별화 포인트.
- [ ] 자체 도메인 `/blog/dues-exemption-policy` 작성·발행
- [ ] 네이버·티스토리 동시 발행

### 본인 알파 5/15~5/25 TWA 출석 지속 확인 (HIGH, 매일)
- **배경**: 7110aa1으로 원본 복귀 후 5/14 정상 카운트 확인. 서버 검증 없음 상태로 5/25까지 유지.
- [ ] 매일 TWA 진입 후 어드민 그리드 D값 확인
- [ ] 5/25 12명 14일 달성 시 Play Console 프로덕션 신청

---

## 59차 신규 추가 (2026-05-14) — cron 잔여 버그 + 운영 후속

### match-result cron 22시 이후 경기 누락 버그 (HIGH, 즉시 대응 권장)
- **배경**: cron이 매일 22:00 KST 고정 실행 + `match_date = today` 조건 → 22시 이후 종료 경기는 영구 누락
- **Fix 방향 A**: cron 시각을 23:59 또는 다음날 01:00 KST 로 변경 (`vercel.json` cron expression 수정)
- **Fix 방향 B**: `match_date >= yesterday` 윈도우로 변경 (전일 23:00 경기도 커버)
- 59차에 `auto-complete-matches` cron 신설로 SCHEDULED→COMPLETED 전환은 해결됐으나 결과 푸시 누락은 잔존
- 참고: `domain_match_auto_complete_cron.md`

### 전술판 편집기 컷 순서 dnd 처리 확인 (MEDIUM, 다음 세션 초)
- **배경**: 59차 세션 중 @dnd-kit long-press dnd 작업이 커밋에 포함되지 않은 상태. 사용자가 되돌렸는지 보류인지 불명.
- [ ] 다음 세션 시작 시 `AnimationEditorClient.tsx` git status 확인 후 적용/폐기 결정
- [ ] 적용 원할 시: `SortableStepChip` + `handleStepDragEnd` + arrayMove + stepIdx 추적 패턴 재적용

### 알파 테스터 4명 직접 연락 (HIGH, 운영)
- **배경**: 성원창·김민성·서성재·노진우 — `users.phone` 확인 완료. `rewarded_at null`, 미응답 상태.
- [ ] 사용자가 phone으로 직접 연락 (수동 처리 항목)
- [ ] 연락 완료 후 `alpha_testers.rewarded_at` 업데이트

---

## 58차 신규 추가 (2026-05-13) — 광고 5차 후속 + 온보딩 ROI 측정

### 광고 5차 최종 수치 재집계 (HIGH, 5/14 14:00 이후)
- **배경**: 5/13 17:00 기준 66% 소진 · 21시간 남음. 최종 종료 후 확정 수치 필요.
- [ ] 5/14 14:00 이후 도달·조회·프로필 방문·신규 팀 최종 확인
- [ ] reference_meta_ads_setup.md 5차 행 완성 + 차수별 비교표 갱신
- [ ] feedback_ad_fatigue_pattern.md 5차 최종 확정 기록

### 신규 회장 3팀 휴면 추적 (MEDIUM, 5/21 이후)
- **배경**: 세븐스타풋살(지민철)·FC KS(백동준)·FC한사바리(서성재) — 현재 본인만 등록, 멤버 0.
- [ ] 5/21 시점 Supabase 조회 — 멤버 모집·경기 생성 여부 확인
- [ ] 위자드 카드 → 멤버 초대 전환률 판정 (온보딩 개선 ROI의 핵심 지표)

### 온보딩 친절도 개선 ROI 측정 (MEDIUM, 다음 광고 사이클 이후)
- **배경**: b083e9c 개선 8건 완료. 활성률 1/5가 개선되는지 확인 필요.
- [ ] 다음 광고 사이클 신규 팀 활성률 대조 (현재 베이스라인 20~40%)
- [ ] 신규 가입자 → 팀 합류 전환률 추적 (signup_source 있는 가입자 기준)

### 5/14 이후 signup_source 분포 확인 (MEDIUM, 5/18 이후)
- **배경**: 광고 5차 기간(5/11~5/14) 귀속 분리 후 자연 유입 베이스라인 확보 필요.
- [ ] 광고 종료 후 1주 signup_source 분포 확인 (instagram / direct / null 비율)
- [ ] 참고: domain_signup_source_tracking.md

### 블로그 발행 페이스 확인 (HIGH, 다음 세션 초)
- **배경**: project_blog_publishing_cadence.md — 네이버 매일·자체 도메인 주2편 페이스 박제. 현재 진행 상태 확인 필요.
- [ ] 3편 이후 발행 상태 확인 후 다음 편 착수 여부 결정

---

## 57차 신규 추가 (2026-05-13) — 조기싸커 차용 후속 + 마케팅

### 인스타 광고 5차 결과 분석 (HIGH, 즉시)
- **배경**: 사용자가 ads/*.png 5장 공유했으나 세션 내 분석 미완료. 사용자 "안되면 마무리" — 다음 세션 초입에 확인 필요.
- [ ] 광고 5차 CTR·CPR·전환 수치 확인 후 다음 채널 결정에 반영

### 마케팅 콘텐츠 — 조기싸커 카드뉴스 차용 (MEDIUM, 콘텐츠 작업)
- **배경**: 57차에 조기싸커 카드뉴스 포맷·내용 분석 완료, 차용 권고까지만 진행. 실 제작 미완료.
- [ ] 카드 1장 (핵심 기능 1가지) 포맷으로 인스타·카카오채널 게시용 소재 제작
- 조기싸커 분석 내용: `reference_competitor_jogisoccer.md` 참조

### 가이드 14섹션 Next.js 마이그레이션 (LOW, CLAUDE.md 미구현 항목)
- **배경**: `public/guide.html` 방치 중. CLAUDE.md 미구현 항목 2개 중 하나.
- [ ] `/guide/*` Next.js 라우트 이관 (기존 가이드 블로그 포스트 패턴 재사용)
- 우선순위 낮음 — 블로그 3~5편 완성 후 고려

### 가격 정책 결정 (HIGH, 100팀 도달 임박)
- **배경**: `project_pricing.md` flat 9,900원 확정 + 활성 100팀 트리거 추정 2027-01. 현재 90팀+ 운영 중 — 임박.
- [ ] 현재 팀 수 Supabase 직접 조회 후 트리거까지 남은 팀 수 확인
- [ ] freemium B2B vs flat 9,900 재검토 필요 여부 사용자 확인
- 거부 확정 항목: 팀 ELO·다국어 5개·MBTI/혈액형 입력 (`project_pricing.md` 참조)

### iOS Apple Developer 결정 ($99/년) (MEDIUM, 결정 대기)
- **배경**: 57차에 이어갈 항목으로 명시. 결정 보류 상태.
- [ ] 사용자 결정 수령 후 착수 (Capacitor vs TWA iOS 전략 `domain_alpha_tester_system.md` 참조)

### 블로그 시리즈 진행 현황 (갱신: 60차)
- **배경**: `project_blog_publishing_cadence.md` — 네이버 매일·자체 도메인 주2편 페이스 박제.
- [x] 3편: 풋살 3파전·4파전 자동 분배 운영법 — **5/14 발행 완료** (42a8a4f · cd298ea)
- [ ] 4편: 무료 풋살 전술판 앱 비교 — 60차 신규 추가 항목으로 이동
- [ ] 5편: 휴면·부상 회비 자동 면제 패턴 — 60차 신규 추가 항목으로 이동
- (폐기) 기존 4편 리그 잔여 경기 우승 경우의 수 — 차별화 미스매치로 폐기

### 반복 추천 금지 항목 (절대 재추천 금지)
- ❌ BeforeAfterSection 추가 (47차 폐기, `feedback_design_tone_reset.md` 박제)
- ❌ 후기·만족도 조사 (57차 명시 거부)
- ❌ AI 코치 STAFF+ 풀기 (이미 풀려있음, `domain_ai_release_state.md`)
- ❌ 58 능력치 (50차 제거)
- ❌ 팀 ELO (외부 비교, 친목 깨기)
- ❌ MBTI·혈액형 입력
- ❌ 다국어 5개

---

## 56차 후반 신규 추가 (2026-05-12) — 인프라·동시성·분석

### Disk IO 사후 확인 (HIGH, 5/13 12:00 이후)
- **배경**: 02dc6f6 fix 직후 Query Performance Reset. 24시간 후 정상 여부 확인 필요.
- [ ] 5/13 12:00(KST) 이후 Supabase Query Performance 재조회 — WAL 폴링 비중 32% 이하 유지 확인
- [ ] Disk IO Budget 경고 메일 추가 수신 여부 확인
- 참고: `feedback_realtime_publication_protected.md` — fix 내용 + 검증 방법

### signup_source 데이터 분석 (MEDIUM, 5/19 이후)
- **배경**: c78c993 으로 5/12 도입. 1주 데이터 쌓인 후 첫 분석.
- [ ] 5/19 이후 어드민 cohort 카드에서 출처별 가입자·활성률 확인
- [ ] 인스타 광고 utm_source 파라미터 연결 여부 점검
- 참고: `domain_signup_source_tracking.md`

### W6-W7 cohort 6주 후 retention 재추적 (LOW, 6월 중순)
- **배경**: 4/27~5/10 가입 19팀의 6주 후 retention 36-63% (측정 시점 5/12). 장기 retention 추적 필요.
- [ ] 6월 중순 이후 팀 활성 여부 재집계

### 동시성 미처리 항목 (LOW, 빈도 낮음)
- **배경**: 0b3728c 에서 HIGH 3종 수정. 나머지 2종은 빈도 낮아 보류.
- [ ] MVP is_staff_decision 동시 투표 race-safe 처리
- [ ] OVR 동시 재계산 race-safe 처리
- 참고: `domain_concurrency_patterns.md`

### AI 캐시 무효화 cascade 정책 (MEDIUM, 사용자 재설명 후 결정)
- **배경**: 56차 후반 상담 결과 사용자 이해 어려움 — 구체 시나리오로 재설명 필요.
- [ ] 다음 세션에서 "경기 결과 수정 시 AI 캐시도 같이 무효화할까요?" 형식으로 재논의
- [ ] 사용자 승인 후 착수

### 골 기록 dedup (LOW, 깊은 고민 필요)
- **배경**: 원클릭 UX 유지하면서 빠른 더블탭 dedup 필요. 56차 후반 사용자 명시 보류.
- [ ] 보류 유지 — 재논의 시 원클릭 UX vs 서버 dedup 트레이드오프 표 제시

## 57차 신규 추가 (2026-05-12) — 평점 시스템 본 도입 결정 대기 항목

### 잠정 → 본 도입 결정 보류 기능 (LOW, 트리거 대기)

다음 조건 중 하나 이상 충족 시 본 도입 검토: FCO2 실 사용 빈도·만족도 / 추가 요청 팀 발생 / 코멘트 악용 사례 / 운영진 부담 피드백. `project_player_rating_provisional.md` 참조.

- [ ] vitest 케이스 `__tests__/api/player-ratings.test.ts` (본 도입 시 추가)
- [ ] `/api/player-card`·`PlayerProfilePage.tsx` 평점 노출 (본 도입 시)
- [ ] `/records?tab=ranking` 팀 랭킹 평점 막대 차트 (본 도입 시)
- [ ] `/records?tab=awards` 시즌 평점 1위 어워드 (본 도입 시)
- [ ] 대시보드 평점 노출 (본 도입 시)
- [ ] 푸시 알림 — 본인에게 코멘트 달릴 때 (본 도입 시)
- [ ] `getDashboardData`·`MatchRecordTab`·`/api/share-card`·`/api/season-awards`·`/api/records/detail`·`aiTeamStats.ts` 옵셔널 평점 노출 (본 도입 시)

### 기존 6개 모달 Modal 래퍼 마이그레이션 (LOW, 신규 변경 시 점진적 교체)

현재 createPortal 직접 적용 중인 6개는 동작하므로 강제 마이그레이션 안 함. 신규 변경 시 `src/components/ui/Modal` 래퍼로 교체 권장.
- MemberEditModal / MemberBulkUploadModal / OnboardingCoachMark / OcrScreenshotGuide / ImageLightbox / ConfirmContext

## 56차-2 신규 추가 (2026-05-12) — SEO·블로그·경쟁사·GA4

### 자체 도메인 가이드 2편 GSC 색인 요청 (MEDIUM, 즉시)
- **배경**: `/guide/dues-exemption-policy` 5/12 발행 완료. 사용자 직접 색인 요청 필요.
- [ ] GSC URL 검사 + 색인 생성 요청 (사용자 직접)
- [ ] 네이버 서치어드바이저 수집 요청 (자체 도메인이므로 ✅ 권장)
- 참고: 1편 색인 결과 2~4주 후 확인 (5/25 이후)

### 블로그 3편 작성·발행 (HIGH, 다음 작업)
- **배경**: 시리즈 2편 완료. 3편 = 풋살 3파전·4파전 자동 분배 운영법.
- [ ] `src/lib/guides/posts/futsal-split-teams.tsx` (자체 도메인)
- [ ] 네이버 블로그 초안 `docs/blog-guide-futsal-split-teams-naver.md`
- [ ] 티스토리 초안 발행
- 검색어 근거: "풋살 3파전 팀섞는법" 네이버 1 노출

### Unassigned 채널 42% 원인 기록 (정보, 코드 수정 불필요)
- **배경**: GA4 Unassigned 42% — 카카오 OAuth redirect referrer 끊김. GA4 메커니즘 한계. 코드 수정으로 해결 불가.
- [ ] users.signup_source 컬럼 추가가 영구 해결책 (feedback_channel_attribution_limit.md, 56차)
- 참고: `reference_ga4_app_router.md` — user-stick + Unassigned 원인 박제됨

### 경쟁사 분석 박제 완료 확인 [x]
- [x] FM조축·동네축구·레츠고알레 메모리 박제 완료 (`reference_competitor_other_apps.md`, 56차-2)

### GA4 트래픽 채널 fix 효과 검증 완료 [x]
- [x] 비정상 source 51% → 6.6% 정상화 확인 (56차-2, `feedback_ga4_reserved_param_names.md` 갱신)
- [ ] 1주 후 잔존 39세션(user-stick) 추가 감소 여부 재확인 (5/19 이후)

## 56차 신규 추가 (2026-05-12) — 어드민 활성도·채널 측정·마케팅

### 어드민 활성 회원 카드 변경 커밋 (HIGH, 즉시)
- **배경**: 56차에 코드 수정 완료했지만 미커밋 상태. voted_at·recorded_at 컬럼 fix 포함.
- [ ] `src/app/api/admin/stats/route.ts` + `src/app/(app)/admin/AdminClient.tsx` git add + commit + push
- 참고: `feedback_supabase_column_verify.md` — 컬럼 정확 매핑 확인

### users.signup_source 컬럼 추가 (MEDIUM, 다음 코호트 측정 시작)
- **배경**: 카카오 OAuth 거치면 GA4 referrer 끊김. 현재 채널별 가입자 분리 영구 불가.
- [ ] `users` 테이블에 `signup_source JSONB` 컬럼 추가 (migration)
- [ ] 카카오 OAuth 콜백에서 쿼리 파라미터(utm_source·utm_medium·utm_campaign) → 쿠키 → DB 저장 흐름 구축
- 참고: `feedback_channel_attribution_limit.md`

### 다음 홍보 채널 결정 (HIGH, 세션 직후 사용자 결정)
- **배경**: 다음카페·네이버카페·인스타 소재 소진. 유튜브 시연 영상 vs 광고 영상 방향 미결.
- [ ] 사용자 결정 수령 후 착수 (코드 변경 없음, 콘텐츠 작업)

### 블로그 2편 push 및 발행 (HIGH, 5/12 완료)
- [x] `src/lib/guides/posts/dues-exemption-policy.tsx` + registry.ts push (d832f0a)
- [x] `docs/blog-guide-dues-exemption-policy-naver.md` + 티스토리 초안 push (d832f0a)
- [x] 자체 도메인·네이버·티스토리 모두 5/12 발행 완료

## 54차-3 신규 추가 (2026-05-11) — SEO 콘텐츠·블로그·면접

### 블로그 2편 push 및 발행 (HIGH, 5/12 완료)
- [x] `src/lib/guides/posts/dues-exemption-policy.tsx` + `src/lib/guides/registry.ts` push (d832f0a)
- [x] `docs/blog-guide-dues-exemption-policy-naver.md` + 티스토리 초안 push (d832f0a)
- [x] 자체 도메인·네이버·티스토리 모두 5/12 발행 완료

### 블로그 3~5편 작성·발행 (MEDIUM, 시리즈 이어가기)
- **배경**: 5편 시리즈 계획 중 1편 완료. 검색어 인사이트 기반 다음 주제 확정됨.
- [ ] 3편: 풋살 3파전·4파전 자동 분배 운영법
- [ ] 4편: 리그 잔여 경기 우승 경우의 수 계산법
- [ ] 5편: 무료 풋살 전술판 앱 비교 (자체 도메인용)
- 참고: `project_blog_publishing_cadence.md` — 네이버 매일·자체 도메인 주2편 페이스

### 이력서 N+1 표현 정정 (HIGH, 면접 전)
- **배경**: 54차-3 면접 검증에서 "90% 단축" 클레임 실측 근거 부족 확인.
- [ ] `docs/resume-pitchmaster-update.md:37` "3초→0.5초" 표현 → 실측 데이터 기반으로 수정
- 안전한 표현 후보: "DB 호출 35회→9회 (74% 감소)" 또는 "/matches/[id] LCP 5265ms→1407ms (73%)"
- 참고: `feedback_blog_fact_verify.md` — 거창 표현 사전 점검 원칙 동일 적용

### Claude Design 랜딩 Hero 재디자인 (MEDIUM, 5/13 이후)
- **배경**: v0 3회 시도 실패 → Claude Design 토큰 초기화 후 재시도 결정.
- [ ] 5/13 수요일 오후 5시 토큰 초기화 확인
- [ ] Claude Design으로 랜딩 Hero 섹션 디자인 의뢰 → PitchMaster 적용

### 자체 도메인 가이드 1편 GSC 색인 요청 (MEDIUM, 완료 확인)
- **배경**: `/guide/treasurer-start` 신규 URL. 사용자 5/11 GSC·네이버 서치어드바이저 색인 요청 완료 보고.
- [x] GSC URL 검사 + 색인 생성 요청 완료 (사용자 직접)
- [ ] 2~4주 후 색인 여부 + 검색 노출 확인

## 55차 신규 추가 (2026-05-11) — 전술판 영상 후속

### 커밋 1092aef 푸시 (HIGH, 즉시 — 사용자 신호 대기)
- **배경**: 55차 2차 커밋 로컬 보류 상태. 사용자 "푸시해줘" 신호 받으면 즉시 진행.
- [ ] 커밋 1092aef git push origin main
- 내용: 진입 카드 동적 라벨 + FormationMotionThumb + 합본 GIF + 미리보기 풀스크린 + 메타 카드 기본 접힘

### 전술판 영상 후속 후보 (LOW, 사용자 패스)
- **배경**: 55차에 제시했으나 사용자 "패스"로 마무리. 나중에 필요 시 재논의.
- [ ] MatchRoleGuide 자동 스크롤
- [ ] GA 이벤트 (영상 생성·GIF 내보내기 추적)
- [ ] 영상 정렬/검색
- [ ] 단축키 지원
- [ ] 자동 저장
- [ ] OG 이미지
- [ ] AI 자동 키프레임

## 54차-2 신규 추가 (2026-05-11) — 알파 테스터 시스템 후속

### Play Store v1.0.4 release 게시 완료 확인 (HIGH, 즉시)
- **배경**: 54차-2 세션에서 신규 AAB 업로드 + 게시 계획 수립. 실제 게시 완료 여부 미확인.
- [ ] Play Console 알파 트랙에 versionCode 8 AAB 첨부 + release 게시 완료 확인
- [ ] 테스터(형 본인)가 Play Store에서 앱 다운로드 + 설치 + TWA 진입 가능한지 검증
- 빌드 파일: `c:\dev\pitchmaster-twa\app-release-bundle.aab` (versionCode 8, 5/7 빌드)

### 알파 테스터 12명 모집 및 유지 (HIGH, 5/11~5/25)
- **배경**: 14일 연속 12명 이상 TWA 출석 → 프로덕션 신청 조건.
- [ ] 노진우(nohjinwoo1012) 안내 메일 발송 — 어드민 복사 모달 사용
- [ ] 출석 로그 클리어 필요 여부 확인 (5/11 가짜 출석 제거 SQL: `DELETE FROM alpha_tester_daily_log;`)
- [ ] 추가 테스터 모집 (카카오 오픈채팅·지인 네트워크)
- [ ] 어드민 `/admin/alpha-testers`에서 D1~D14 그리드 매일 모니터링

### 알파 테스터 ping 가드 서버 측 강화 (LOW, 선택)
- **배경**: 현재 `isTwa()` 클라이언트 체크 — `?alpha=1` 또는 코드 조작 시 우회 가능.
- [ ] 서버 측 `Referer` 헤더 검증 추가 (`android-app://app.pitchmaster` 여부)
- 우선순위: 낮음 (가짜 출석은 어드민에서 수동 확인·삭제 가능)

### 모달 재노출 v2 (LOW, 선택)
- **배경**: `alpha-tester-modal-shown-v1` 키로 1회성 제어 중. 기존 사용자에게 다시 노출하려면 키 변경 필요.
- [ ] 필요 시 `alpha-tester-modal-shown-v2`로 키 변경 → 기존 사용자 모달 재노출

### SEO 후속 작업 (사용자 결정 대기)
- **배경**: 54차-2 세션에서 방향 결정 보류.
- 선택지:
  - A. 즉시 가능 (h1 키워드·이미지 alt·/login title) — 약 1시간
  - B. 정보형 콘텐츠 페이지 추가 (`/guide/*` 5-10편) — 실질 효과
  - C. 외부 채널 (블로그·카페) — 이미 진행 중
- [ ] 사용자 방향 확정 후 진행

## 54차 신규 추가 (2026-05-11) — 광고 5차 후속

### 광고 5차 효과 측정 (HIGH, 2026-05-12~14)
- **배경**: 일 ₩5,000 × 3일 집행, 인스타 앱 부스팅 (UTM 없음).
- [ ] 2026-05-12: Supabase 직접 조회로 신규 가입 팀 카운트 + 단가 계산 (GA4 신뢰 불가 — 카카오 인앱 누락)
- [ ] 2026-05-14: 광고 종료 후 인사이트 캡처
- [ ] `reference_meta_ads_setup.md` 5차 광고 결과 추가 (1·2·4차 비교 표 갱신)

### OBS 녹화 세팅 개선 (LOW)
- **배경**: NVENC 단순 모드 비트레이트 미적용 버그 확인 (reference_obs_nvenc_bitrate_bug.md).
- [ ] 다음 영상 작업 시 x264 코덱 또는 출력 방식 "고급" → 녹화 탭 직접 비트레이트 입력으로 전환

### Play Store 정식 출시 일정 확인 (HIGH)
- **배경**: 54차 세션에서도 일정 확정 안 됨. v1.0.1 빌드 완료 상태.
- [ ] 다음 세션에서 출시 일정 재확인 및 v1.0.2 체크리스트 점검

## 53차-2 신규 추가 (2026-05-10) — Phase 2~4 완료 후속

### 카드 5종 표준화 (LOW, 별도 세션 ~6-8시간)
- **배경**: `card-featured`·`card-stat`·`card-list-item`·`<Card>`·`<div className="rounded-xl...">` 5종 혼재. 53차-2 작업 중 재확인.
- [ ] 통합 방안 설계 (variant prop vs CSS utility 유지) + 사용자 승인 후 진행
- 참고: 50차 "카드 5종 → Card variant 통합" 항목과 동일

### 매치 등록 폼 빠른·상세 분리 (MEDIUM)
- **배경**: 53차-2 Phase 3 중 미착수. 총무 경기 직전 빠른 등록 불편.
- [ ] "빠른 등록" (날짜+시간만) vs "상세 등록" (전체 필드) 분기

### 회칙 카테고리 사용자 정의 (LOW)
- **배경**: 현재 회칙 카테고리 고정. 팀마다 다른 규정 체계 지원 요구.
- [ ] 팀 설정에서 회칙 카테고리 추가·수정·삭제

## 53차 신규 추가 (2026-05-10) — 랜딩 v0 리프레시 후속·결정 사안

### v0/ 폴더 정리 방향 결정 (MEDIUM, 결정 대기)
- **배경**: 53차 작업으로 `v0/` 폴더에 80+ 파일 추가됨. 실제 적용 결과물은 이미 `src/` 에 반영 완료.
- 선택지: (A) `.gitignore`에 추가해 추적 중단, (B) 통째 삭제, (C) export 보관(별도 브랜치 또는 아카이브)
- [ ] 사용자 방향 결정 후 처리

### About·Comparison 라이브 동작 시각 검증 (HIGH, 즉시)
- **배경**: 7a34c08 Vercel 자동배포 후 라이브에서 미확인 상태.
- [ ] Spotlight(마우스 추적 glow), Aurora orb, Iridescent text, Word reveal 동작 확인
- [ ] ONLY 배지 3차 디자인 가독성 사용자 최종 확인
- [ ] 모바일(iOS Safari·Android Chrome) + 라이트 모드 렌더 확인

## 52차 신규 추가 (2026-05-09) — 50대 페르소나 UX Phase 2~4

### Phase 2 — 첫 진입 코치 마크 (HIGH, 완료 53차-2)
- **배경**: 가입 후 첫 화면이 빈 대시보드. 햄버거+탭바 두 네비 공존인데 50대 신규 회장은 메뉴 못 찾음.
- [x] 1회성 코치 마크 5스텝 (햄버거→일정→회비→기록→설정 순) — 커밋 41734f7
- 참고: 50차 신규 추가 "코치 마크 / 첫 진입 튜토리얼" 항목과 통합

### Phase 2 — 회비 OCR 스크린샷 가이드 모달 (MEDIUM, 완료 53차-2)
- **배경**: OCR 기능 이해 없이 그냥 "업로드" 시도 → 실패 후 이탈 추정.
- [x] OCR 업로드 전 가이드 모달 + SVG 데모 이미지 추가 — 커밋 3df6dd0

### Phase 2 — 카카오 인앱 브라우저 안내 배너 (MEDIUM, 완료 53차-2)
- **배경**: 카카오 인앱 브라우저에서 일부 기능 제한 (GA4 누락, 카메라 권한 등).
- [x] 카카오 인앱 감지 시 "외부 브라우저로 열기" 배너 표시 — 커밋 3df6dd0

### Phase 3 — 회원 벌크 CSV 등록 (HIGH, 완료 53차-2)
- **배경**: 현재 한 명씩만 등록. 팀 창단 시 10~30명 일괄 등록 불편.
- [x] 붙여넣기(paste) + CSV 파일 토글 UI — MemberBulkUploadModal.tsx, 커밋 6f7dc88
- [x] 검증: 이름 필수·중복·특수문자 차단 (`validateSafeName` 재사용)
- [x] /api/members/bulk 신규 Route Handler

### Phase 3 — 매치 등록 폼 빠른·상세 분리 (MEDIUM)
- **배경**: 현재 등록 폼이 시간·장소·상대팀 등 한 번에 요구. 총무 입장에서 경기 직전 빠른 등록 시 불편.
- [ ] "빠른 등록" (날짜+시간만) vs "상세 등록" (전체 필드) 분기.
- [ ] 빠른 등록 후 나중에 상세 수정 가능하도록.

### Phase 3 — 회원 수정 통합 모달 (LOW, 완료 53차-2)
- **배경**: 회원 목록에서 인라인 펼침 편집 → 통합 모달로 대체.
- [x] MemberEditModal.tsx 신규 — 커밋 9c98958

### Phase 4 (큰 작업) — public/guide.html → Next.js 마이그레이션 (LOW)
- **배경**: `public/guide.html` 방치 중. 유지보수 불편 + 테마/디자인 불일치.
- [ ] Next.js App Router 페이지로 전환 (`src/app/guide/page.tsx`).
- [ ] 기존 앵커 URL 호환 (redirect 또는 anchor 유지).
- [ ] 참고: CLAUDE.md "실제 미구현 항목 3번". 예상 ~7시간, 별도 세션.

### Phase 4 (큰 작업) — 골 카드 쿼터별 그룹핑 (LOW, 완료 53차-2)
- **배경**: 현재 골 카드는 시간순 나열. 쿼터별 그룹핑 시 전술 분석 용이.
- [x] 쿼터 헤더 + 해당 쿼터 골 리스트 구조로 재편 (6골 이상 시) — 커밋 e698e29
- [x] null 쿼터(쿼터 모름) 별도 섹션

### Phase 4 (큰 작업) — 자체전 PlayerPicker A/B팀 분리 (LOW, 완료 53차-2)
- **배경**: 자체전(INTERNAL) 경기에서 양팀 모두 PlayerPicker로 구성 가능하도록.
- [x] A팀/B팀 그룹 분리 + side 토글 + 색상 구분 — 커밋 e698e29

## 51차 신규 추가 (2026-05-09)

### SessionEnd 훅 실제 동작 확인 (MEDIUM, 다음 세션 종료 후)
- **배경**: `1bade98`에서 `.claude/settings.json` SessionEnd 훅 추가 완료. Claude desktop 재시작 후 활성화.
- [ ] 다음 세션 종료 후 `sunnykim91/pitchmaster-memory` repo 커밋 이력 확인 (자동 push 됐는지)
- [ ] 동작 안 했으면: bash 경로 문제 (Windows) → PowerShell 전환 또는 절대 경로로 수정
- 참고: `project_multi_computer_memory_sync.md`

### GA4 트래픽 채널 fix 효과 검증 (HIGH, 2026-05-09 시점 도래)
- **배경**: `0f2b820` 2026-05-07 배포. source → cta_source/vote_source 키 변경. 오늘(5/9) 검증 시점.
- [ ] GA4 트래픽 획득 보고서 "세션 소스/매체" 확인 — Unassigned 63% → 정상화 여부
- [ ] sticky_mobile/hero/match_detail 등 7개 비정상 source 사라졌는지 확인
- [ ] 정상화 확인 후 `reference_ga4_app_router.md` 갱신
- 참고: `feedback_ga4_reserved_param_names.md`

## 50차 신규 추가 (2026-05-08)

### xlsx → exceljs 마이그레이션 재시도 (MEDIUM, 별도 세션)
- **배경**: `4b01d8c` 시도 → 라이브 500. `a265cf5`로 revert. 빌드·vitest 통과해도 Vercel lambda에서 실패.
- [ ] Vercel Function Log에서 실제 에러 stack trace 확인 (배포 후 /api/dues/export 호출)
- [ ] exceljs Buffer.from() / stream 패턴 변경 후 재시도
- [ ] .xls 레거시 포맷 지원 필요 여부 확인 (exceljs는 .xlsx만 지원)
- [ ] 또는 xlsx@0.19.x CVE 패치 버전 존재 여부 확인 후 마이너 업그레이드
- 참고: `feedback_backend_migration_runtime_diff.md`

### TypeScript 292건 에러 누적 정리 (MEDIUM, 별도 세션 — 47차 이월)
- **배경**: `npx tsc --noEmit` 292건 에러 main에 잔존. 50차 이후도 해소 미완. outdated 테스트 모킹 타입 오류 다수.
- [ ] `npx tsc --noEmit` 실행 후 에러 목록 분류 (실제 타입 버그 vs outdated 모킹)
- [ ] outdated 테스트 일괄 갱신 (43차 21건 전례 참고)
- [ ] 정리 후 vitest run + clean build 통과 확인
- 참고: `feedback_outdated_tests_accumulate.md`

### PitchScore Sunset 후속 — 가이드·랜딩 잔류 언급 제거 (MEDIUM)
- **배경**: 50차에 코드 전면 제거 완료. 하지만 외부 노출 문서에 PitchScore 언급 잔류 가능성.
- [ ] `public/guide.html` 내 평가/능력치 섹션 제거 확인
- [ ] 랜딩 MoreFeatures 섹션 PitchScore 항목 제거 (사용자 수정 중)
- 참고: `project_pitchscore_phase3_status.md`

### 거대 파일 분리 (LOW, 코드 품질)
- **배경**: 50차 병렬 에이전트 점검에서 발견. K 묶음 미착수.
- 대상 (900줄+): `TacticsBoard.tsx`, `AutoFormationBuilder.tsx`, `DuesBulkTab.tsx` + 6개
- [ ] 각 파일 분리 계획 수립 후 사용자 승인 → 파일당 별도 커밋
- 참고: 협업 규칙 "600줄 넘으면 분리 신호"

### 카드 5종 → Card variant 통합 (LOW, 코드 품질)
- **배경**: 50차 점검 L 묶음 미착수.
- `card-featured`·`card-stat`·`card-list-item`·`<Card>`·`<div className="rounded-xl...">` 5종 혼재
- [ ] 통합 방안 설계 (variant prop vs CSS utility 유지) + 사용자 승인 후 진행

### text-white/black 라이트모드 격리 (LOW, 코드 품질)
- **배경**: 50차 점검 M 묶음 미착수. 236건 grep으로 확인.
- [ ] `text-white`→`text-foreground` / `text-black`→`text-foreground` 일괄 점검
- [ ] 라이트 모드에서 실제 깨지는 곳만 우선 수정

### eslint-disable set-state-in-effect 근본 리팩토링 (LOW, 코드 품질)
- **배경**: 50차 점검 N 묶음 미착수. 11곳 확인.
- [ ] 각 케이스 분류 (실제 useEffect 의존성 버그 vs 의도된 패턴)
- [ ] 근본 리팩토링 가능한 곳부터 처리
- 참고: `feedback_eslint_disable_minimization.md`

### aiTeamStats.test.ts SQL mock 패턴 (LOW)
- **배경**: 50차 점검 E 묶음 미착수. SQL mock 패턴 복잡도로 유보.
- [ ] Supabase 쿼리 체이닝 mock 패턴 설계 후 단위 테스트 추가

## 47차 후반 신규 추가 (2026-05-07)

### 광고 D 소재 영상 BGM + 인스타 4차 게시 (HIGH, 사용자 직접 진행)
- **배경**: 22.5s 9컷 영상 OBS 녹화 완료. BGM 추가 + 편집 후 게시 예정.
- [ ] BGM 선택: Suno AI 또는 YouTube Audio Library (라이선스 확인)
- [ ] CapCut으로 카운트다운 3초 잘라내기 + BGM 합치기
- [ ] 인스타 4차 광고 게시 (메타 광고 관리자, 22.5s 영상)
- [ ] 광고 효율 측정: 3초 재생률, 신규 팀 수 (1차 ₩1,517 / 3차 ₩3,290 대비)
- 참고: `reference_ad_video_session_2026_05_07.md`

### Play Console 프로덕션 검토 결과 대기 (HIGH, 2~7일)
- **배경**: 47차 후반에 프로덕션 액세스 신청서 4섹션 정성 작성 후 제출.
- [ ] 검토 통과 시: v1.0.4 AAB 빌드 + 프로덕션 트랙 승격
- [ ] 검토 반려 시: 사유 확인 후 보완 (테스터 수·기간·피드백 근거 추가)
- [ ] 검토 완료 후 `project_play_console_v1_0_1.md` 갱신
- 참고: `project_play_console_v1_0_1.md`

### 15초 컷다운 광고 영상 제작 (MEDIUM, 효율 확인 후)
- **배경**: 현재 22.5s 버전 완성. 인스타 피드 권장 15s 버전 별도 필요.
- [ ] app.jsx Timeline 재배분: 22.5s → 15s (Cut 우선순위 재정렬)
- [ ] 15초 특성상 페인 2컷 + 솔루션 3컷 + CTA 2컷 구조 검토
- 트리거: 4차 광고 효율 수치 확인 후 결정

## 50차 신규 추가 (2026-05-09) — 50대 페르소나 UX 감사 후속

### 디자인 시스템 차원 접근성 보강 (HIGH, 별도 세션)
- **배경**: 50대 페르소나 UX 분석에서 객관적 WCAG/접근성 결함 다수 발견. 일부는 즉시 수정(errorMessages, 라이트 warning/accent 색상)했고, 사이트 전반 영향 큰 것은 별도 세션으로 분리.
- [ ] **Button 터치 타겟** — `h-9` (36px) → `h-10` (40px) 또는 `h-11` (44px). WCAG 2.5.5 미달 해결. 사이트 전반 영향 → 디자인 재점검 필요
- [ ] **Button sm size** — `h-9 + text-xs (12px)` → `text-sm (14px)`. 현재 sm 버튼 가독성 부족
- [ ] **body font-size** — 15px → 16px (`globals.css:100`). 권장 표준 미달, 모든 텍스트 영향
- [ ] **`text-[10px]` / `text-[11px]` 사용 136회 24파일** — 일괄 12px 이상으로 상향 또는 토큰 정의

### 코치 마크 / 첫 진입 튜토리얼 (HIGH, 완료 53차-2)
- **배경**: 가입 후 첫 화면이 빈 대시보드. 햄버거+탭바 두 네비 공존인데 50대 신규 회장은 메뉴 못 찾음.
- [x] 1회성 코치 마크 5스텝 (햄버거→일정→회비→기록→설정 순) — 커밋 41734f7

### `aria-label` 핵심 액션 추가 (MEDIUM)
- **배경**: 41회 18파일에만 적용. 핵심 액션(라인업·매치 동작·회비 OCR) 다수 누락. 스크린리더·키보드 사용자 영향
- [ ] 매치 등록·골 기록·MVP 투표·회비 입력 핵심 액션에 `aria-label` 일괄 추가

### 50대 페르소나 UX 분석 보고서 (참고)
- 이번 세션 분석 결과 70+ 항목. 카테고리: 첫 진입 / 빈 상태 / 가이드 / 핵심 운영 / 라인업·전술 / 50대 친화 / 모바일·PC
- 즉시 수정 완료: DuesBulkTab 글자, MatchRecordTab 헬퍼, MatchVoteTab 버튼, TeamClient 영어 캡션, errorMessages 매핑, 라이트 warning/accent 색상
- 별도 세션 권장: 위 디자인 시스템 차원, 코치 마크, 회원 벌크 CSV (별도 todo)

## 49차 신규 추가 (2026-05-07)

### 운영 비용 정리 문서 작성 — 1차 완료, 월별 갱신 (LOW)
- **1차 작성 완료** (2026-05-08, 49차): `docs/cost-actual-spend.md` — 4/1~5/6 카드 명세 기반 카테고리별 누적 정리
- **확인된 누적 (~5/6)**: 운영비 ₩244,042 (Vercel ₩166k + Play Console ₩38k + 메타 광고 ₩20k + AI API ₩18k) + Claude Max 본업공용 ₩396,753 = 총 ₩640,795
- **월별 갱신 예정**:
  - [ ] 5월 메타 광고 3차·4차 청구 도착 후 추가
  - [ ] 5월 Anthropic API 청구 추가
  - [ ] 5월 말 Claude 구독 일반 Max 5x 환원 확인
  - [ ] 매월 카드 명세 도착 시 누적 합 갱신
- 참고: `docs/cost-actual-spend.md`, 메모리 `reference_infra.md` (5/8 정정 완료)

### GA4 트래픽 채널 fix 효과 검증 (1~2일 후, HIGH)
- **배경**: `0f2b820` — analytics.ts `source` → `cta_source`/`vote_source` 변경 배포 완료.
- [ ] 1~2일 후 GA4 트래픽 획득 보고서 "세션 소스/매체" 확인
  - `sticky_mobile`, `hero`, `match_detail` 등 7개 비정상 source 사라졌는지 확인
  - Unassigned 비율 63% → 정상 수준으로 감소했는지 확인
- [ ] 정상화 확인 후 reference_ga4_app_router.md 갱신

### D3 광고 영상 — 클로드 디자인 결과물 검토 (MEDIUM)
- **배경**: 49차에 1080×1920 자동재생 React 프롬프트 작성 완료. 클로드 디자인에서 결과물 수령 대기.
- [ ] 클로드 디자인 결과물 수령 후 9컷/15초 흐름 검토
- [ ] OBS/QuickTime으로 화면 녹화 후 영상 완성

## 47차-2 신규 추가 (2026-05-07)

### 라이브 동작 검증 — 경기별 종목 분리 (HIGH, 다음 세션 1순위)
- **배경**: `38ea6d5` 배포 완료. 실제 풋살 경기 등록·수정·상세 흐름 검증 필요.
- [ ] 풋살 경기 등록 → 자동편성 풋살 모드 정상 진입 확인
- [ ] 풋살 경기 등록 → 역할 가이드 풋살 포지션 노출 확인
- [ ] 풋살 경기 등록 → 푸시 알림 카피 "새 풋살 경기 일정" 확인
- [ ] 기존 경기(sport_type NULL) → 팀 sport_type fallback 정상 동작 확인
- [ ] 목록 카드 — 풋살 경기에만 info 뱃지 노출, 축구 경기는 미표시 확인
- 참고: `domain_match_sport_type.md`

### v1.0.4 AAB 빌드 + Play Console 5/8 재신청 (HIGH, D-1 이하)
- **배경**: 5/8 재신청 목표. 47차-2 세션 완료 시점 D-1 이하.
- [ ] `C:\dev\pitchmaster-twa` 에서 versionCode=8, versionName=1.0.4 AAB 빌드
- [ ] Android 적응형 아이콘 #0a0c10 갱신 포함
- [ ] Play Console 프로덕션 재신청 (증빙: 테스터 수·버전 이력·피드백 정성 작성)
- 참고: `reference_twa_build_env.md`, `project_play_console_v1_0_1.md`

### AboutSection 라이브 시각 검증 (MEDIUM)
- [ ] 모바일 기준 Bento Grid 레이아웃 정상 렌더 확인
- [ ] KPI 가로 비례 막대 비율 ("1시간 20분 vs 1분 34초") 시각적으로 올바른지 확인
- [ ] FinalCta teamCount 실수치 동적 반영 확인

### 랜딩 Phase 2 후속 (MEDIUM, Claude Design 사용량 초기화 후)
- **배경**: About(v7 완성)·FAQ(19개)·Comparison·FinalCta 보강 완료. Phase 2는 HeroSection·ComparisonSection 비주얼 강화.
- [ ] HeroSection 비주얼 강화 (Claude Design 결과물 수령 후)
- [ ] TestimonialsSection — 실 사용자 후기 이니셜 처리 명시
- [ ] guide.html에 축구·풋살 동시 운영 안내 추가

### 경기 목록 종목별 필터 (LOW, 트리거 발생 후)
- 풋살 경기가 충분히 쌓인 후 탭 또는 드롭다운 필터 추가

### Phase 5 — 통계·AI 분리 종목별 (LOW, 트리거 발생 후)
- 경기 기록·통계 페이지 종목별 필터·분리 집계
- AI 팀 스탯 종목별 분리
- 트리거: 다수 팀이 실제로 축구·풋살 혼용 운영 시작 후

## 48차 신규 추가 (2026-05-07)

### iOS Capacitor 출시 의사결정 (MEDIUM, 별도 세션)
- **배경**: 48차에 전략 상담 완료. Android TWA 재신청 마무리 후 결정.
- [ ] TWA Play Store 재신청 결과 확인 후 iOS 착수 여부 결정
- [ ] Mac 환경 여부 확인 (없으면 EAS Build 클라우드 검토)
- [ ] Capacitor 프로젝트 초기화 + Next.js 연동 테스트 (착수 결정 후)
- [ ] Apple Developer Program 가입 ($99/년) — 착수 결정 후
- 참고: `reference_ios_capacitor_strategy.md`

### 온보딩 Push 알림 권한 유도 강화 (MEDIUM)
- **배경**: 48차 dry-run 결과 휴면팀 회장 6명 push_subscribed=false. 도달 채널 근본 개선 필요.
- [ ] 온보딩 완료 직후 또는 팀 생성 직후 "알림 받기" 허용 유도 UI 추가
- [ ] 현재 push 권한 요청 위치 및 타이밍 확인 (코드 grep 필요)
- 목표: 신규 가입자 push_subscribed=true 비율 향상

### users.email 컬럼 추가 검토 (LOW, 캠페인 도달률 개선용)
- **배경**: 카카오 OAuth 이메일 동의 미수집 → 앱 외부 이메일 캠페인 불가
- [ ] 카카오 비즈앱 이메일 동의항목 추가 심사 신청 (카카오 검수 수일 소요)
- [ ] 심사 통과 시 마이그레이션 + 온보딩 이메일 선택 수집 UI
- [ ] 기존 사용자 대상 이메일 수집 캠페인 (선택 동의)
- 참고: `reference_kakao_oauth_reach_limit.md`

### 휴면팀 카톡 캠페인 회신 추적 (운영, 1~2주 내)
- **배경**: 48차에 11명 발송 완료. 응답률·피드백 내용 추적 필요.
- [ ] 1주 후 회신 수·내용 정리
- [ ] 피드백 내용 중 앱 개선 힌트 있으면 백로그 추가

## 47차 신규 추가 (2026-05-06)

### ~~vitest / TypeScript 에러 누적 정리~~ → 50차 신규 항목으로 이월
- 50차에서도 292건 잔존 확인. 상단 "50차 신규 추가" 섹션 "TypeScript 292건 에러 누적 정리" 참조.

### `.claude/settings.json` 권한 캐시 누적 정리 (LOW)
- **배경**: 38라인 자동 누적. 커밋에는 제외 중.
- [ ] 다음 세션에서 내용 확인 후 의도치 않은 권한 항목 있으면 정리

## 46차 신규 추가 (2026-05-06)

### 랜딩 Phase 2 — 비주얼 강화 (MEDIUM, Claude Design 사용량 초기화 후)
- **배경**: Phase 1 완료 + 47차-2에서 About 신설·FAQ 확장·Hero·Comparison·FinalCta 텍스트 보강 완료. Phase 2는 비주얼 강화만 남음.
- [x] AboutSection 신설 (47차-2 `036c074`)
- [x] FAQ 확장 15→19개 (47차-2)
- [x] Hero·Comparison·FinalCta 톤 보강 (47차-2)
- [x] BeforeAfterSection → 폐기 (CoreFeatures 중복, 47차-2)
- [ ] HeroSection 비주얼 강화 (Claude Design 결과물 수령 후)
- [ ] TestimonialsSection — 실 사용자 후기 이니셜 처리 명시
- 참고: `feedback_plan_verify_before_recommend.md`

### ~~PitchScore Sunset 후속 확인~~ ✅ 50차에서 전면 제거 완료
- [x] 50차에 능력치 보기까지 전면 제거 (컴포넌트 9 + lib 5 + API 6 + cron 1 + page 1 일괄 삭제)
- [x] `/records` `/player/[memberId]` `/members` 모두 PitchScore UI 0
- [ ] 랜딩에서 PitchScore 언급 완전 제거 확인 (MoreFeatures 한 항목만 잔류 — 사용자가 수정 중)
- [ ] 가이드(`public/guide.html`)에 평가 섹션 제거 확인

## ~~45차 신규 추가 (2026-05-06) — 경기 후기 자동 복구 검증~~ ✅ 46차 완료

### ~~경기 후기 자동 복구 검증 (HIGH, 다음 세션 1순위)~~ ✅ 완료
- [x] FCMZ 5/4 경기 일지 탭 자동 생성 확인 — `ai_summary` length 0→130, `ai_summary_generated_at` null→2026-05-06 00:42:42 확인 완료

### ~~PitchScore cron 발송 대상 / 임계값 / Phase 3 / 경기 후 알림~~ ❌ 50차 전면 제거로 폐기
- 능력치 보기 자체를 50차에 전면 제거. 관련 후속 작업 모두 무의미.
- DB 테이블(`player_evaluations` 등)은 유지하지만 코드 참조 0.
- 향후 부활 시 git history 복원으로 가능 (50차 sunset 이전).

## ~~🔴 HIGH — 38차 (2026-05-02) 입력 검증 사고 후속 (보안 강화)~~ ✅ 41차에서 대부분 완료

**배경**: 2026-05-02 외부 사용자가 가입 닉네임을 SQL injection payload로 설정 + 자모 우회 시도 (카카오 ID 4875582850). 상세: completed-recent.md 38차 항목 참고.

- [x] **AI 프롬프트 인젝션 방어** — `aiPromptSafety.ts` 공통 헬퍼 + 5개 함수 적용 완료 (`699df36`)
- [x] **팀 생성 rate limit** — `00054` + `teamCreationRateLimit.ts` 완료 (`699df36`)
- [x] **safeText 검증 일원화** — posts·comments·match-comments·diary·rules·join-request 6곳 완료 (`699df36`)
- [x] **영구 차단 메커니즘** — `00055` users.is_banned + cron 제외 완료 (`699df36`)
- [ ] **의심 가입자 자동 알람** (1~2h) — 미처리 이월
  - 매일 1회 cron: 1자 이름·자모만·payload 패턴 스캔 → 이메일/카카오 알람
- [ ] **`/login?error=blocked` UI 안내** (LOW, 30분)
  - 차단 사용자 재로그인 시 일반적 로그인 실패 메시지 (차단 명시 X)

## ~~🟡 진행 중 — 36차 후반 (2026-04-30) — 회비 선납 셀링 UI~~ ✅ 40차에서 방향 전환·완료

**40차(2026-05-02) 결정**: 별도 선납 시스템 불필요. 운영팀이 이미 EXEMPT + reason 메모로 선납을 운영 중이었음. → `dues_prepayments` 테이블 DROP + PREPAID 타입을 `member_dues_exemptions`에 정식 통합. 상세: completed-recent.md 40차 항목 참고.

- [x] `dues_prepayments` 테이블 폐기 (Migration 00053)
- [x] PREPAID 타입 `member_dues_exemptions`에 추가 (Migration 00052)
- [x] `MemberExemptionSection` UI에 PREPAID 전용 필드 동적 노출
- [x] `PrepaymentRegisterModal.tsx` · `/api/dues/prepayments/route.ts` · `duesPrepayment.ts` 폐기

## 🔴 최우선 — 즉시 처리 (2026-04-28)

### ~~PWA/앱 아이콘 모서리 흰 영역 제거~~ ✅ 완료 (1ac37cb, 34차)
- [x] scripts/fill-icon-bg.mjs로 icon-192·512·maskable-192·512 픽셀 변환 완료
- [ ] TWA AAB 재빌드 시점에 Android 적응형 아이콘도 같이 갱신 (아직 미완)

### ~~옛 경기 푸시 카피 정정 + 7일 가드~~ ✅ 완료 (6b1ff29·2d32c4e, 35차)
- [x] MVP·역할 가이드 cron 카피 팀명 prefix 추가
- [x] match_date 7일 가드 적용

### ~~Realtime 전체 테이블 무필터 구독 제거~~ ✅ 완료 (35차)
- [x] MatchesClient.tsx 무필터 구독 제거 → WAL CPU 86% 해소

### ~~OCR 스크린샷 삭제 버튼 누락~~ ✅ 완료 (544c871, 36차)
- [x] 미리보기 X 삭제 버튼 추가

### ~~풋살팀 sport_type 설정 화면 버그~~ ✅ 완료 (26c57ad, 36차)
- [x] useApi fallback 객체 누락 필드 추가 (진짜 원인)
- [x] sport_type 서버 검증 + 기존 비표준 데이터 보정

## HIGH — 33차 신규 추가 (2026-04-28) — 랜딩 추가 디자인

### Claude Design 추가 섹션 적용

- [x] **BeforeAfterSection** → 폐기 (47차-2 결정: CoreFeatures와 중복. AboutSection으로 대체)
- [x] **AboutSection 신설** (47차-2 `036c074` — Bento Grid + Editorial typography)
- [x] **FinalCtaSection** 텍스트 보강 — teamCount 사회적 증명 (47차-2)
- [x] **FaqSection** 15→19개 확장 (47차-2)
- [x] **ComparisonSection** 서브라인 강화 (47차-2)
- [ ] **FaqSection** 비주얼 업그레이드 (텍스트 완료, 레이아웃 강화 후속)
- [ ] **TestimonialsSection** — 실 사용자 후기로 교체 포함
- [ ] **MoreFeaturesSection** — 추가 기능 섹션 신설
- [ ] **FooterSection** — 리뉴얼

### .gitattributes LF 설정 추가 (선택 — Vercel 환경 sh 실행 안정성)
- [ ] `.gitattributes`에 `*.sh text eol=lf` 추가 — Windows CRLF/LF 경고 해소
- [ ] `scripts/vercel-ignore.sh` LF 확인 (현재는 동작 중이나 경고 잠재적)

### 카피·마케팅 톤 통일 (33차 카피 정정 결과 적용 확산)
- [ ] 카페 글·인스타 광고에서 "휴면·부상 자동 면제"·"AI 전술 감독" 강조 톤을 랜딩과 통일
- [ ] 아직 v1 카피인 나머지 섹션에 사실 기반 차별화 카피 반영 여부 검토 (특히 BeforeAfter·Comparison)

## HIGH — 40차 이월 (2026-05-02)

### 클로드 디자인 영상 스토리보드 검증 (다음 세션 1순위)
- [ ] 4~12컷 AI 코칭 노출 범위 확인 — 축구팀 Feature Flag 적용 여부 광고 문구에 반영
- [ ] 미구현 기능 광고 금지 — 투표 마감 임박 푸시·회비 미납 자동 독촉 구현 여부 코드 확인 필수 (미구현이면 광고 카피 조정 또는 v1.0.4 추가)
- [ ] 후기 이니셜 처리 명시 필요 (`TestimonialsSection.tsx`)
- [ ] "1시간 → 5분" 절감 근거 검증 (실제 케이스 기반 수치인지 확인)

### 버전 D 광고 소재 — 단톡방 도배 인용 패턴
- [ ] 클로드 디자인에 버전 D 추가 요청: "투표좀요" / "납부좀요" 단톡방 직접 인용 후킹
- [ ] 1초 후킹 오프닝에 페인포인트 직접 인용 — 추상 카피보다 실 사용자 문구 우선
- [ ] 참고: `feedback_ad_fatigue_pattern.md` 영상 후킹 인사이트 섹션

### 메타 Pixel 데이터세트 생성 (다음 광고 사이클 전 필수)
- [ ] 5/2 시도 시 "Something went wrong" 에러 재현
- [ ] 1순위 체크박스(전환 API 게이트웨이) 해제 + 카테고리 선택 후 재시도
- [ ] Pixel ID 16자리 받으면 layout.tsx Script 삽입 + analytics.ts fbq() 추가

### 인스타 3차 광고 종료 후 최종 분석 (5/4 종료 후)
- [ ] Meta 인사이트 최종 수치 확인 (3초 재생률·방문단가·도달)
- [ ] Supabase 5/1~5/4 신규 팀 직접 조회 (핵심 지표)
- [ ] 결과별 다음 액션: 팀 5개 이상 → ₩30,000 스케일업 / 0~2개 → 버전 D 소재 제작

### ~~v1.0.4 빌드 + Play Console 재신청~~ → 47차-2 신규 추가로 이동
- 상세: pending.md "47차-2 신규 추가" 섹션 참고

### Vercel "DNS Change Recommended" 해소 (급하지 않음)
- [ ] Manual setup 권장값 확인 (apex 레코드 타입 점검)
- [ ] Cloudflare DNS apex 레코드 Vercel 권장값으로 정렬
- [ ] 라이브 영향 가능성 있어 별도 시간 잡고 진행

### 미커밋 변경 이월 — v1.0.4 후보
- [ ] `src/app/(app)/dues/DuesStatusTab.tsx` — 선납 등록 후 모달 닫기 타이밍 픽스
- [ ] `src/app/(app)/dues/PrepaymentRegisterModal.tsx` — 동일 후속 보강
- [ ] `src/app/(app)/ClientLayout.tsx` — 14줄 변경 (내용 재확인 후 커밋)

### Vercel Sitemap canonical 정상화 후속 모니터링
- [ ] 네이버 서치어드바이저 — 2~4주 후 수집 정상화 여부 확인 (4개 URL 수집 요청 접수)
- [ ] 구글 Search Console — 색인 생성 요청 4개 처리 결과 확인
- [ ] www 도메인 정적 자산 15개 "크롤링됨·색인 안 됨" 자연 해소 여부 확인 (무시해도 무방)

## ~~45차 신규 추가 (2026-05-06) — PitchScore 전체 오픈 후속~~ ❌ 50차 전면 제거로 폐기

PitchScore 기능 자체를 50차에 전면 제거. cron·Phase 2C·Phase 3 모두 무의미. 부활 시 git history 복원.

## ~~44차 신규 추가 (2026-05-05) — PitchScore Phase 2C 라이브 검증~~ ✅ 45차에서 완료

### ~~Phase 2C 라이브 검증 + Feature Flag 제거 결정~~ ✅ 45차 완료
- [x] 라이브 검증 완료 + Feature Flag 전체 오픈 결정 (45차)
- 상세: completed-recent.md 45차 항목 참고

### ~~`/records?tab=my` 종합 재설계 (2차)~~ ✅ 45차 완료
- [x] 헤더 영역: 본인 정보 요약 (이름·주포지션·시즌메타·종합 PitchScore 한 줄)
- [x] 두 레이더 차트(경기 스탯 / 능력치) 비교 레이아웃 — sm:grid-cols-2 나란히 배치 (MyOverviewCard)
- [x] 스코어 요약 카드 — 헤더 우상단 종합 PitchScore + 시즌 평균 활약(G/A/MVP)
- [x] 모바일 우선 — 카드 길이 길어지지 않도록 정보 우선순위 정리
- 상세: completed-recent.md 45차 항목 참고

## 44차 보강 (2026-05-05) — perf 추가 후보

### Lighthouse 추가 최적화 후보 (LOW, Phase 2C 검증 후)
- [ ] **Pretendard subset 추가 축소** — 현재 subset 범위 재검토, 사용 안 하는 글리프 제거
- [ ] **gtag interaction 트리거** — GA4 스크립트 `strategy="afterInteractive"` 재확인, 불필요한 blocking 제거
- [ ] **recharts 추가 code split** — records 탭 Bootup 2222ms 중 recharts 영향 확인 → dynamic import 적용 여부 검토
- 참고: `reference_lighthouse_baseline_2026_05_05.md` (현재 baseline. dashboard 89 / matches 79 / records 92)

### 카카오 이미지 추가 적용 대상 점검
- [ ] `compactKakaoImage()` 헬퍼 적용 현황 재확인 — ClientLayout·MembersClient×2·PeerEvaluationDialog 4곳 완료
- [ ] 다른 프로필 이미지 렌더 지점 grep → 누락분 적용 (`/player/[id]`, `/records`, 댓글 아바타 등)
- 참고: `reference_kakao_image_optimization.md`

## 44차 신규 추가 (2026-05-05) — SEO 후속 확인

### favicon.ico 배포 검증
- [ ] 사용자 푸시 완료 후 `curl -I https://pitch-master.app/favicon.ico` 200 확인
- [ ] 네이버 서치어드바이저 "접근 불가" 항목 재진단 → 0건 확인
- [ ] 네이버 사이트맵 "수집 다시 요청" 제출

### 네이버 수집제한 4개 URL 확인
- [ ] 네이버 서치어드바이저 진단 화면 "유형별 진단 정보" 섹션에서 수집제한 4개 URL 목록 확인
- [ ] URL 확인 후 원인 분석 (robots.txt 차단인지, 서버 오류인지, canonical 문제인지)

### GSC "리디렉션 오류 2 / 404 2" 확인
- [ ] GSC 해당 행 클릭 → URL 목록 확인
- [ ] 각 URL 원인 분석 + 필요 시 redirect 추가 또는 sitemap 제외
- 참고: "크롤링됨-색인안됨 15개"는 정상 상태 (무시) — `reference_naver_gsc_seo_diagnosis.md` 참조

## 42차 보강 (2026-05-04) — MVP 정책 변경 후속

### MVP 정책 5/4 cutoff 라이브 검증 (HIGH)
- **배경**: `241b394` 커밋으로 `mvp_vote_staff_only=OFF` 시 운영진도 일반 회원처럼 1인 1표로 전환. 5/4 이전 경기는 옛 정책 보존.
- [ ] FCMZ (`mvp_vote_staff_only=false`) 팀: 운영진 투표 시 즉시 확정 안 되고 70% 룰 적용되는지 확인
- [ ] FCMZ (`mvp_vote_staff_only=true`) 팀: 운영진 투표 시 즉시 확정 동작 확인
- [ ] 본인 본인 투표 차단: MVP 투표 UI에서 본인 이름 후보 선택 후 제출 시 400 반환 또는 UI 차단 확인
- [ ] 5/4 이전 경기: 기록 페이지에서 옛 정책 기반 MVP 결과 동일 유지 확인
- [ ] FCMZ 경기(`d2641733`) DB 갱신 후 MVP 집계 화면 정상 반영 확인

### MVP Feature Flag 제거 결정 (FCMZ 검증 완료 후)
- [ ] 검증 완료 후 `shouldApplyNewMvpPolicy` 분기 유지 여부 결정 — 5/4 이전 경기 보호 기간 정책 영구 유지할지 판단
- [ ] 참고: `domain_mvp_policy.md` (5/4 cutoff 정책 상세)

## 43차 신규 추가 (2026-05-04)

### ~~ai_team_stats_cache 자동 무효화~~ ✅ 완전 완료 (47차-2, 9a9a048)
- [x] goals POST/PUT/DELETE(3) + matches PUT/DELETE + attendance-check POST + mvp POST·DELETE(2) + squads POST + autoCompleteMatches + teams PUT = 총 11곳 완성

### AI 풀플랜 받은 경기 — 코칭 카드·배치 표시 이상 재현 (HIGH)
- **배경**: 사용자 보고 "이미 풀플랜 받은 경기 → 기록이 잘 안 보임". 정확한 재현 시나리오 미확인.
- [ ] 코칭 카드(AiCoachAnalysisCard) 표시 이상인지 vs placement 자체 렌더링 이상인지 구분
- [ ] 재현 조건: 풀플랜 받은 경기 재진입 → 전술 탭 확인 → 코칭 카드 표시 여부 + AutoFormationBuilder 슬롯 확인
- [ ] 필요 시 콘솔 로그로 `effectiveAiCoachContext` 갈래 추적

## 42차 신규 추가 (2026-05-03)

### PitchScore sport_type 분리 라이브 검증 (다음 세션 1순위)
- [ ] 배포 완료 (`d8409a6`) — 김선휘 본인이 시크릿 모드로 FCMZ 축구·풋살 두 팀 진입
- [ ] 축구팀: CROSS·FREE_KICK·HEADING·LONG_PASS 평가 모달에 정상 노출 확인
- [ ] 풋살팀: 위 4개 비활성 확인 (applicable_sports 필터 동작)
- [ ] 검증 완료 후 Feature Flag 제거 (`/app/(app)/player/[memberId]/page.tsx:436` `enablePitchScore` 조건 삭제)

### ~~광고 3차 최종 분석 (2026-05-04 종료 후)~~ ✅ 42차 보강 완료 (2026-05-04)
- [x] Meta 인사이트 최종 수치 확인 — 3초 재생률 13.27%, 웹방문 44, 도달 1,447
- [x] Supabase 5/1~5/4 신규 팀 직접 조회 — 4팀(FC PARIS·RIO FEMININO·테라FC·FCO2)
- [x] 1·2·3차 단가 cross-reference 확정: ₩1,517 / ₩1,942 / ₩3,290 — Ad Fatigue 공식 결론
- [x] 다음 소재 결정: 버전 D (단톡방 직접 인용 후킹) + 광역 타겟 + Lookalike Audience 방향 확정

### 인스타 4차 광고 사이클 — D 영상 + 광역 타겟 (다음 광고 사이클 전 준비)
- [ ] **D 영상 v3 제작**: "투표좀요" / "납부좀요" 단톡방 직접 인용 후킹 — 클로드 디자인 사용량 초기화 후 의뢰
- [ ] **광역 타겟 추가**: 인터레스트 기반("축구 동호회"·"조기축구"·"풋살") 명시 — 팔로우 풀 고갈 보완 (추정 원인)
- [ ] **Meta Pixel 설치 → Lookalike Audience**: 가입자 90팀+ 기반 유사 인구 타겟 — Pixel 설치가 전제조건
  - Pixel 설치 절차: 비즈니스 매니저 → 이벤트 관리자 → 데이터 연결 → 웹 → Meta Pixel → 수동 설치
  - 참고: `reference_meta_ads_setup.md`, `pending.md` Meta Pixel 항목
- [ ] **예산 결정**: D 영상 효율 검증 후 ₩30,000 스케일업 여부 판단 (3차 단가 ₩3,290 기준)

### D 영상 v3 — 클로드 디자인 사용량 풀린 후
- [ ] 클로드 디자인 사용량 초과로 보류 중 (2026-05-03 기준)
- [ ] 사용량 초기화 후 "투표좀요" / "납부좀요" 단톡방 직접 인용 패턴으로 의뢰
- [ ] 참고: pending.md 버전 D 광고 소재 항목 (39차 신규), feedback_ad_fatigue_pattern.md

### 다음카페 4편 발행
- [ ] 티스토리 #3 발행 완료 후 동일 주제로 카페 게시 (1주일 지연 패턴 고려)
- [ ] 참고: docs/blog-post-3-final.md (미커밋, 발행 대기)

### 미커밋 파일 정리 (v1.0.4 후보 포함)
- [ ] `docs/blog-post-3-final.md` — 티스토리 #3 발행 후 커밋
- [ ] `docs/blog-velog-4.md` — 이미 발행 완료, 백업 커밋
- [ ] `docs/localhost_3000_login(iPhone SE).png` — untracked 스크린샷, 필요 여부 확인 후 처리
- [ ] `.claude/settings.json` — 자동 갱신분 커밋

### if (!ctx.teamId) 데드 코드 제거
- [x] ~~`src/app/api/player-attributes/evaluate/route.ts`~~ — 무효(moot): PitchScore 50차 전면 제거로 `player-attributes/` 디렉터리 자체가 없음 (102차 확인)
- [ ] 이미 body.team_id 명시 구조로 변경됨 — 불필요 가드 잔재

## 41차 후반 신규 추가 (2026-05-03)

### 경기 후기 — SSR 룰 베이스 자동 생성 (A안 완성)
- 41차에 룰 베이스 단락 풍부화·AI 게이트 OFF는 완료
- 미완성: 신규 경기에 후기 자동 표시 (현재는 ai_summary 캐시 있는 경기만 표시)
- 작업: `src/lib/server/getMatchDetailData.ts` 에서 ai_summary null + status=COMPLETED + REGULAR 일 때 `generateRuleBasedSummary` 호출해 채움
- 입력 데이터(score·result·goals·assists·mom·attendanceCount·weather·playerCount·date)는 이미 SSR fetch됨 — 매핑만 추가
- `generateRuleBasedSummary` export 추가 필요

## 41차 신규 추가 (2026-05-03) — 풋살 미커버 영역

### 풋살 7·8인제 역할 가이드 (LOW)
- 현재 5·6인제만 지원. 1팀(FCMZ 풋살)이 8인제 또는 그 변형일 수 있음
- `isSupported` 조건에 7·8 추가 + `base/futsal.ts`에 역할 추가 필요
- 우선순위 낮음 — 실 사용 팀 수 1팀 이하

### 풋살 `default_player_count=11` 1팀 — 비표준 데이터 처리
- DB 조회 결과 풋살인데 `default_player_count=11` 팀 1건 발견
- `sport_type=FUTSAL`이면 `default_player_count` 범위 3~8로 검증 (현재 3~6)
- 해당 팀 운영진이 직접 수정하거나 어드민 화면에서 교정 필요

## 41차 신규 추가 (2026-05-03) — safeText 잔여 적용

### 자유 텍스트 검증 미적용 진입점 (운영진/본인만 노출 영역)
41차에 6곳(posts·comments·match-comments·diary·rules·join-request)에 `validateFreeText` 적용 완료. 노출 범위 좁고 위험도 낮은 나머지 7곳은 분리 이월:

- [ ] `src/app/api/dues/route.ts` POST/PUT — `description` (회비 입금/지출 설명)
- [ ] `src/app/api/dues/payment-status/route.ts` POST — `note` (납부 메모)
- [ ] `src/app/api/dues/penalties/route.ts` POST — `note` (벌금 사유)
- [ ] `src/app/api/dues-settings/route.ts` POST — `description` (회비 타입 설명)
- [ ] `src/app/api/guests/route.ts` POST/PUT — `note` (용병 메모)
- [ ] `src/app/api/matches/route.ts` POST — `opponentName`, `location` (자유 입력 텍스트)
- [ ] 일정 메모·출석 사유 등 추가 진입점 grep 후 처리

각 진입점에 `validateFreeText({ maxLength, fieldLabel })` 적용. 헬퍼는 `src/lib/validators/safeText.ts:60-95`.

## 40차 신규 추가 (2026-05-02) — 우선순위 검토 필요

### ~~세션 쿠키 옵션에 domain 명시~~ ✅ 41차 완료 (`699df36`)
- [x] `SESSION_COOKIE_BASE_OPTIONS`에 `domain: ".pitch-master.app"` 추가 완료

## HIGH — 39차 신규 추가 (2026-05-01)

### 인스타 4차 광고 종료 후 분석 (5/4 종료)
- [ ] Meta 인사이트 최종 수치 확인 (후킹 / 랜딩 조회 / 단가)
- [ ] Supabase 5/1~5/4 신규 가입 직접 조회 (신규 팀 수 핵심 지표)
- [ ] GA4 Paid Social referrer 확인 (UTM 없어서 시간대 매칭으로 역추산)
- [ ] 결과별 다음 액션:
  - 신규 팀 5개 이상 → 본 캠페인 ₩30,000 스케일업
  - 신규 팀 0~2개 → 소재 hook 재검토 ("회장님 보세요" 오프닝 + 명확한 회장 CTA 필요)

### 메타 광고 관리자 캠페인 정리
- [ ] `20260501_main_33s` 생성 실패 캠페인 삭제 (미게시 상태로 남아있을 수 있음)
- [ ] 비즈니스 관리자 비정상 광고 객체 정리

### PitchMaster Facebook 페이지 광고 자격 검증 확인
- [ ] 비즈니스 포트폴리오 내 PitchMaster 페이지 자격 검증 통과 여부 확인
- [ ] 통과 시 메타 광고 관리자에서 PitchMaster 페이지로 캠페인 생성 테스트 (₩1,000 최소)
- [ ] 참고: feedback_facebook_page_eligibility_lag.md

## HIGH — 36차 신규 추가 (2026-04-29)

### ~~인스타 3차 광고 결과 분석 (5/1 종료 후)~~ ✅ 완료 (39차)
- [x] Supabase 신규 팀 수 직접 조회 — 신규 팀 0팀 (11초 영상 실패 확인)
- [x] UTM 추적 확인 — GA4 Paid Social 6명 + Paid Other 2명 정상
- [x] 3초 재생률: 19% (하락, 11초 영상 효과 낮음 확인)

### ~~회장 0명 방지 다층 방어~~ ✅ 완료 (d62a72f, 36차)
- [x] 강등·강퇴·탈퇴 3경로 모두 차단 완료

### 야로수/FC워리어스 default_player_count 안내 (선택)
- [ ] 회장들에게 팀 설정에서 기본 인원을 풋살 인원(5~6명)으로 재설정 안내
- [ ] 이미 수동 SQL 보정 완료 — 앱 재확인 정도만 필요

## HIGH — 35차 신규 추가 (2026-04-29)

### GA4 가입 퍼널 발화 안정화 (카카오 인앱 누락 해소)
- [ ] 현 상태: `team_create`·`team_join`·`onboarding_complete` 카카오 인앱에서 누락 (4/29 확인)
- [ ] 옵션 A: Server Action에서 GA Measurement Protocol 직접 호출 (서버 사이드 발화)
- [ ] 옵션 B: redirect 후 즉시 동기 fetch로 GA 이벤트 전송
- [ ] 참고: feedback_ga_funnel_unreliable.md

### 광고 소재 후킹 강화 (3차 캠페인 전)
- [ ] 첫 1~2초 페인포인트 직접 후킹: "카카오톡 단체방 공지 밀렸죠?" 등
- [ ] 2차 연속 3초 재생률 22~24% — 30%+ 목표
- [ ] UTM 적용 필수 (`?utm_source=instagram&utm_medium=paid&utm_campaign=YYYYMMDD`)

### ~~v1.0.3 AAB 재빌드 + Play Console Alpha 업로드~~ ✅ 완료 (2026-04-30, 40차 갱신)
- [x] TWA AAB 재빌드 versionCode=7, versionName=1.0.3 — 4/30 10:21 Alpha 게시 완료
- [ ] Android 적응형 아이콘 #0a0c10 갱신 — v1.0.4에서 묶어 처리

## HIGH — 34차 신규 추가 (2026-04-28)

### velog/블로그 게시 후속 작업
- [x] velog 1·2·3편 게시 완료 (사용자, 4/29)
- [ ] velog 프로필 정비 (소개·링크 업데이트)
- [ ] GeekNews 제출 (1~2차 velog 글 기반)
- [ ] Threads 스레드 — 랜딩 v2 + velog 연동 게시

### ~~네이버 서치어드바이저 사이트맵 재제출~~ ✅ 완료 (2026-05-02, 40차)
- [x] robots.txt + 사이트맵 검증, 4개 URL 웹페이지 수집 요청, sitemap.xml 재제출
- [x] 근본 원인(Vercel Domains non-www → www redirect) 복구 완료
- [ ] 2~4주 후 색인 정상화 확인

### CLAUDE.md 통계 수치 outdated 정정
- [ ] "82개 팀, 647+ 명" 고정 수치 제거 → "실사용자 통계는 Supabase 직접 조회" 안내로 대체
- [ ] 이후 외부 콘텐츠 생성 시 reference_pitchmaster_stats.md + 직접 조회 활용

## HIGH — 32차 신규 추가 (2026-04-28)

### Meta 비즈니스 제한 — 검토 대기 (2026-04-28 발생)
- [ ] **검토 결과 대기 중** (보통 1~7일, 대부분 1~3일)
- [ ] 비즈니스 ID: `1455008159692614` (피치마스터)
- [ ] 원인: redirect loop·로그인 재시도 반복으로 자동화 의심 분류 (사용자 잘못 X)
- [ ] **현재 광고 자동 정지 + Meta Pixel 설치 불가 + 환불 자동 처리 예정**
- [ ] **검토 기다리는 동안 절대 금지**: 페이스북·비즈니스 매니저 반복 로그인, 시크릿 창 우회, 다른 IP 시도 (검토 결과 악화)
- [ ] 검토 통과 시 → Meta Pixel 설치 작업 재개 (아래 항목)

### Meta Pixel 설치 (검토 통과 후 재개)
- [ ] 비즈니스 매니저 → 이벤트 관리자 → ➕ 데이터 연결 → 웹 → Meta Pixel → 수동 설치
- [ ] ⚠️ Vible(앱 데이터세트) 클릭 X / Shopify·파트너 통합 옵션 X
- [ ] Pixel ID 16자리 받으면 코드 작업 (5분):
  - `layout.tsx`에 `<Script>` 컴포넌트로 Meta Pixel base script 삽입 (`afterInteractive`)
  - `analytics.ts`에 `fbq()` 호출 추가 (PageView·Lead·CompleteRegistration)
- [ ] 참고: reference_meta_ads_setup.md

### ~~랜딩 개선 (1순위 A)~~ ✅ 33차에서 Hero·HowItWorks·Features v2 완료 (e4ba64c, f67fb28)
- 나머지 섹션(BeforeAfter·Faq·Comparison·Testimonials·Footer)은 33차 신규 추가 항목으로 이동

### ~~네이버 서치어드바이저 사이트맵 재제출~~ ✅ 완료 (2026-05-02, 40차)
- [x] Vercel Domains primary non-www 변경 + 네이버 sitemap 재제출 완료

### UTM 파라미터 다음 광고에 적용
- [ ] 인스타 광고 링크에 `?utm_source=instagram&utm_medium=paid&utm_campaign=YYYYMMDD` 추가
- [ ] 카페 포스팅 링크에도 `?utm_source=naver_cafe&utm_medium=community` 적용

## HIGH — 31차 신규 추가 (2026-04-28)

### GA4 404 referrer 추적 + redirect 정비
- [ ] GA4 탐색 분석에서 404 페이지 유입 소스 확인 (세션 소스/매체 + 페이지 경로 필터)
- [ ] 오래된 외부 링크 → 실제 경로 redirect 추가 (`next.config.ts` redirects)
- [ ] 대상 후보: `/public/guide.html` 등 legacy 경로
- 배경: 이탈률 91.7% 페이지 GA4 보고서에서 발견. referrer 확인 후 조치 결정.

### 광고/SEO 백로그 (2026-04-28 신규)
**2순위 — 배포 대기 (사용자 직접 작업)**
- [ ] v1.0.2 AAB 재빌드 + Play Console Alpha 업로드 (웹 코드 `c14ea2d`)
- [ ] migration 00044 Supabase SQL Editor 수동 실행

**3순위 — 알려진 미구현 (CLAUDE.md)**
- [ ] 회비 선납 (6개월/1년) — UI·로직 모두 없음. 신규 기능 (3~5파일)
- [ ] 회원 벌크 CSV 등록 — 한 명씩만 가능. 중간 작업 (2~3파일)
- [ ] guide.html → Next.js 마이그레이션 — 883줄 정적 HTML 컴포넌트화 (장기)

**4순위 — 코드 품질**
- [ ] OCR 에러 이중 표시 (`setOcrStatus` + `showToast` 동시 발생) 정리
- [x] ~~생일 confetti CSS pseudo-element 리팩토링~~ — 무효 항목. confetti div 자체가 이미 제거됨(`pm-dash-bday-banner`로 교체, 코드에 confetti 0). 전수조사에서 확인·종료
- [x] ~~스크린샷 경로 통일 (`/screenshot/` vs `/screenshots/`)~~ — 완료(2026-06-28). `public/screenshot/` 19개 → `public/screenshots/` 이동, 단수 폴더 제거, AppScreenSlider 6경로 + middleware matcher 복수로 갱신

**SEO 장기 — 광고 안정화 후**
- [ ] 랜딩 텍스트 SEO 키워드 보강 (HeroSection·FeaturesSection·FaqSection 등)
  - "조기축구 팀관리", "풋살 매니저 앱", "조기축구 회비 관리" 등 롱테일 키워드 자연스럽게 포함
  - h1/h2 구조 강화
- [ ] velog 1·2편 게시 + 카페 게시 (초안: docs/blog-post-1·2-draft.md, marketing-cafe-post.md)
- [ ] /login 콘텐츠를 / 로 통합 (현재 / 는 redirect만 — 색인 효율 떨어짐)

## HIGH — 30차 후반부 신규 추가 (2026-04-25)

### v1.0.3 빌드 + Alpha 업로드 (5/2~3 목표)
- [x] 상대팀 전적 UI + 개인 출석 히트맵 ✅ 완료 (OpponentHistoryCard·AttendanceHeatmap 렌더링, 102차 확인)
- [ ] TWA AAB 재빌드 (versionCode=7, versionName=1.0.3)
- [ ] Play Console Alpha 트랙 업로드

### 5/8 프로덕션 재신청
- [ ] 증빙 자료 준비: 테스터 수(12명+)·버전 이력(v1.0.1/1.0.2/1.0.3)·피드백 건수 정성 작성

### 인스타 광고 2차 사이클 개선
- [ ] 첫 3초 후킹 강화 (현재 시청률 23%, 목표 30%+)
- [ ] UTM 파라미터 적용 (`?utm_source=instagram&utm_medium=paid&utm_campaign=...`)

### 온보딩 가입 경로 1문항 추가
- [ ] "어디서 알게 됐나요?" (조기축구 카페 / 인스타 광고 / 지인 소개 / 구글 검색 / 기타)

## HIGH — 29차 신규 추가 (2026-04-24) — 일부 완료

### ~~v1.0.2 AAB 재빌드 + Play Console Alpha 업로드~~ ✅ 완료 (4/25 23:16)
- [x] TWA AAB 재빌드 versionCode=6, Play Console Alpha 업로드, 12명 테스터 자동 배포

### migration 00044 Supabase 적용 ← (구 00042, 번호 충돌로 리네임)
- [ ] `penalty_records` PARTIAL UNIQUE INDEX (match_id, rule_id, member_id)
- [ ] Supabase SQL Editor에서 수동 실행 필요
- 참고: `fdfed72` 에서 00042/43 → 00044/45 리네임 완료 (번호 충돌 해소)

## HIGH — 27차 신규 추가 (2026-04-23)

### Play Console 프로덕션 재신청 대응 (14일 테스트)

- [x] v1.0.1 AAB Alpha 업로드 (4/23)
- [x] v1.0.2 AAB Alpha 업로드 (4/25)
- [x] v1.0.3 Alpha 게시 완료 (4/30 10:21, versionCode=7)
- [ ] 5/6~7 v1.0.4 최종 안정화 빌드
- [ ] 5/8 프로덕션 액세스 재신청 (증빙: 테스터 수·피드백 건수·버전 이력·정성 작성)

### 홍보 영상 제작 (12컷 스토리보드 기반)

- [ ] 영상화 파이프라인: Runway Gen-3 또는 Kling으로 각 컷 2.5초 렌더
- [ ] 내레이션: ElevenLabs 한국어 또는 자체 녹음
- [ ] BGM/SFX 적용 (문서 BGM 디렉션 참조)
- [ ] 30초 풀버전 + 15초 숏컷 + 썸네일 3종 파생물
- [ ] 배포 채널: 인스타 릴스·유튜브 쇼츠·플레이스토어 프리뷰·조기축구 페북/카페

## 🔄 다음 세션 즉시 착수 (26차 작업 연속성)

### 역할 가이드 검증 (26차 배포 확인)
- [ ] **용병 카드 위치 동작 확인** — 배포 `24d2b31` 반영 후 테스트
  - 새 경기 진입 시 용병 카드 상단에 뜨는지 (사용자가 "맨밑에 있다" 보고, quarterCount 0/undefined 방어 후 재확인 필요)
  - 자동 편성 전체 완료 → 용병 카드 하단으로 이동 확인
  - 수동 배치 전부 완료 → 용병 카드 하단으로 이동 확인
  - 부분 배치·포메이션만 변경·심판만 지정 → 편성 미완료로 상단 유지되는지
  - 자체전(INTERNAL) A/B 편성 케이스 확인
- [ ] **역할 가이드 실전 테스트** — 회원/운영진 계정으로 FCMZ 등 실제 경기에서:
  - 회원 뷰: 본인 배치된 쿼터 카드만 뜨는지, 불참 시 메시지 정상인지
  - 운영진 뷰: 선수 드롭다운 정상 작동, 용병 제외됐는지
  - 쿼터별 다른 포메이션 (3-5-2 → 4-4-2 등) → 포메이션별로 다른 whyItMatters·linkage 나오는지
  - 같은 포메이션·같은 포지션 비연속 쿼터 → "2·4쿼터" 형태로 합쳐지는지
  - 전술판 미작성 + 운영진 진입 → 포메이션 폴백 가이드 정상인지

### 역할 가이드 콘텐츠 피드백 수집
- [ ] 실사용자(FCMZ 등 대표) 몇 명에게 카드 내용 검토 요청
  - 톤/용어가 친근한지, 이유 설명이 충분한지, 혼동되는 부분 없는지
- [ ] 피드백 반영해 base/override 튜닝 (필요 시)

### AI 기능 품질 스윕 (25차에서 연기됨)
- [ ] **4/13 FCMZ vs 올챙이FC 경기 후기 재생성 검증**
  - Vercel 배포(07107ca 이후) 확인 → 경기 상세 → 일지 탭 → 재생성 버튼
  - 스코어 6-2 정확히 반영되는지, 용병 이름(지두찬/박상혁) 포함되는지, MOM 최일훈·고건우 언급되는지
  - 환각 없는지 (있는 정보만 서술)
- [ ] **다른 AI 기능 순차 점검**
  1. **AI 코치 분석** (`aiTacticsAnalysis.ts`) — 전술 탭 활성화 시 품질 샘플 확인
  2. **AI Full Plan** (자동편성) — `formationAI.ts` 관련 — 품질·맥락 검증
  3. **OCR 회비 파싱** (`api/ocr/route.ts`, Clova + Claude) — 인식 정확도 체크

### 경기 후기 관련 후속 작업
- [ ] 경기 후기에도 **레이트리밋 v2** 동일 적용 확인 (경기당 1회 + 팀당 월 10회)
- [ ] 프롬프트 튜닝 후 5~10개 경기로 품질 재평가

### AI 시그니처 전환 후속
- [ ] 룰 기반 50개 패턴 실사용자 반응 수집 (FCMZ·시즌FC 등)
- [ ] 사용자 제시 패턴을 풀에 심기 (`playerCardUtils.ts generateSignature`)

### 다음 세션 유의사항
- `scorer_id` / `assist_id` / `candidate_id`는 **users.id + team_members.id + match_guests.id 세 소스** 중 하나
- AI 기능 점검 시 **실제 DB 샘플 조회**가 핵심
- 전술판 이벤트 동기화는 `window.dispatchEvent(new CustomEvent('match-squads-saved', { detail: { matchId } }))` 규약
- 용병 카드 위치 판단은 `isFormationComplete` computed (state 아님). 수정 시 `MatchTacticsTab.tsx` 해당 memo 확인

## HIGH

### RLS 근본 방어 + Supabase 커스텀 JWT (별도 스프린트, 2~3일)

- [ ] **RLS Policy 전면 작성 + 카카오 세션 → Supabase JWT 발급 시스템**
  - 현재 상태: 모든 테이블 RLS enabled 이나 Policy 0개. `anon key` 가 클라이언트에 노출되어 이론상 curl 로 전체 DB 스크래핑 가능
  - Realtime 실시간 동기화(match_attendance·match_goals·match_mvp_votes) 가 anon key 로 구독되고 있어 단순 비활성화 불가
  - 26차 진단 시 W2#6 로 논의됐으나 작업량(2~3일) 초과로 별도 스프린트로 분리
  - 설계 방향:
    1. 카카오 로그인 성공 시 Supabase 커스텀 JWT 발급 (SUPABASE_JWT_SECRET 으로 서명)
    2. 클라이언트에서 Supabase client 초기화 시 이 JWT 를 헤더로
    3. RLS Policy: `auth.uid()` 기반 본인 팀 데이터만 SELECT 허용
    4. Realtime 구독도 이 JWT 로 인증 → 필터 조작해도 본인 팀 아니면 구독 실패
  - 중간 완화안(사용 안 함): write 차단 Policy 만 추가(10분) — "읽기는 뚫림" 상태 남아 실효 약함
  - 트리거: 마케팅 이후 사용자 증가 + 잠재 공격 표면 커지면 즉시 착수

### API Rate Limiting (보류 — 사고 시 3일 내 도입 가능)

- [ ] **일반 API 레이트리밋 도입**
  - 현재: AI 라우트만 `checkRateLimit` 적용. `/api/auth/*` `/api/posts` `/api/comments` `/api/dues` 등 무방어
  - 리스크: brute force 로그인, 스팸 스크립트, Vercel CPU 한도 소진(Pro 100h) 통한 과금
  - 26차 진단 시 W1에서 "당장 CRITICAL은 아님"으로 판단해 보류 (82팀 규모, 악의적 자동화 공격 경험 없음)
  - 도입 시 권장 구성: **Upstash Redis 무료 티어** + `@upstash/ratelimit` `slidingWindow`
    - `/api/auth/*` : 5분 10회 (brute force 방어)
    - 그 외 `/api/*` : 1분 60회
    - `/api/cron/*` : Bearer 인증 있으므로 제외
  - 트리거: 마케팅 이후 봇 트래픽 관측되면 즉시 도입. 3일이면 완료 가능.

### W3 — 마케팅 유입 폭증 대비 (26차 진단 기반, 2026-04-19)

W1(보안)·W2(운영 안전망) 완료 후 순차 착수.

- [ ] **경기 상세 SSR AI 블로킹 해소**
  - 현재: `src/lib/server/getMatchDetailData.ts:82-109`에서 `getOrComputeTeamStats()` await
  - 신규팀·캐시 미스 시 LCP +2~3초
  - 조치: AI 팀스탯 계산을 경기 후기 API route로 이동 (SSR 언블록)
- [ ] **탭별 중복 fetch 통합**
  - 현재: `MatchTacticsTab`의 `/api/squads`, `MatchInfoTab`의 `/api/weather` 등 탭마다 독립 fetch
  - 경기 상세 상위에서 공통 데이터 fetch 후 props 주입
- [ ] **ClientLayout 60초 폴링 visibilityState 게이트**
  - 현재: `/api/notifications` 항상 폴링 (탭 비활성이어도)
  - 조치: `document.visibilityState === 'visible'` 일 때만 폴링
- [ ] **신규가입자 팀 선택 경로 CTA 개선**
  - 현재: 초대 없이 자체 가입 시 "팀 만들기" 버튼 눈에 안 띔
  - 조치: `/team` 페이지에 "이미 팀이 있으신가요?" vs "새로 팀 만들기" 2-column 명확 분기
- [ ] **탭 내부 로딩 상태 통일**
  - 현재: 탭 전환 시 데이터 로드 중 아무 표시 없음
  - 조치: 각 탭 Skeleton 또는 최소 스피너 패턴 표준화

### 19차 보류(출시 후 첫 패치용)
- [ ] **옵티미스틱 업데이트 롤백 패턴 도입** — MatchRecordTab/DuesRecordsTab 외 다른 곳에도 실패 시 rollback 적용 (현재는 pessimistic이라 당장 치명적이지 않음)
- [ ] **MVP 후보자 팀 소속 검증** — POST /api/mvp에서 candidateId가 team_members에 속하는지 추가 검증 (UI에서 이미 필터링되지만 방어 심화)
- [ ] **모바일 터치 타겟 44px** — MatchVoteTab 대리 투표/마감·재개 버튼 등 < 44px 높이 보정
- [ ] **긴 텍스트 UI 넘침** — 멤버 이름 20자+/장소 긴 주소/게시글 제목 200자에 `truncate` 일괄 적용
- [ ] **포지션 약자 설명** — GK/CB/CDM/FIXO/ALA/PIVO 첫 진입 시 튜토리얼 또는 long-press 툴팁
- [ ] **댓글 Enter 자동 제출** — Shift+Enter 개행 + Enter 제출
- [ ] **드롭다운 키보드 네비게이션** — MatchesClient 장소 자동완성 화살표 키/Enter 선택
- [ ] **유니폼 색상 다크모드 대비** — 밝은 색 유니폼 border 자동 추가
- [ ] **매우 큰 금액·매우 과거 날짜 경고** — 회비 1억+ / 경기 5년 전 등록 시 확인 모달
- [ ] **경기 삭제 버튼 접기** — "위험한 작업" 섹션에 숨겨 오터치 방지
- [ ] **ClientLayout fetchNotifications deps 안정화** — 유지보수 위험 예방
- [ ] **useApi AbortController 패턴 강화**
- [ ] **DB CASCADE 정책 검토** — users 삭제 시 goals/posts orphan 처리 확인
- [ ] **파일 업로드 스토리지 쿼터 모니터링** — 팀별 쿼터 + 오래된 파일 자동 정리
- [ ] **RLS Policy 활성화 검토** — 현재 서비스 롤로 전부 접근 중, 직접 SQL 노출 방어

### 운영/마케팅
- [ ] 중복/테스트 팀 정리 (골드문FC/골드문, fc_libre/FC.LIBRE) **[수동 SQL]**
- [ ] 활성 팀 CS 대응 — 피드백 수집 **[수동]**
- [ ] 실제 사용자 후기로 소셜프루프 교체 (실명 + 팀명) **[수동+개발]**
- [x] ~~회비 선납 기능 (6개월/1년치 일괄 납부 처리)~~ → 40차에서 면제(EXEMPT) 도메인에 PREPAID 타입으로 통합 완료

### 킬러 기능 v2 UI wiring
- [ ] 선수 카드 디자인 개선 (FIFA 스타일) — **백엔드 v2 완료** (JSON variant, rarity/signature/rank/streak/isHero). v0 컴포넌트 `v0card/` 에 이식, 실제 페이지 wiring 남음
- [ ] 시즌 어워드 디자인 개선 (7종 시상) — **백엔드 v2 완료** (mvp/seasonSummary/context). v0 컴포넌트 이식 + 노출 경로 결정 남음
- [ ] 개인 커리어 프로필 디자인 개선 (/player/[id] 공개 페이지) — **백엔드 v2 완료** (bestMoments/ranks/streaks). v0 디자인 wiring 남음

## MEDIUM

### 기능
- [ ] Play Store 등록 (TWA, $25) **[추후 과제]**
- [ ] 회원 벌크 사전등록 (CSV/다중 입력)
- [x] 회비 월별 수지결산 대시보드 ✅ 완료 (`src/app/(app)/dues/monthly/page.tsx`, DuesClient 링크, 102차 확인)
- [ ] 회비 납부 현황 통계 (월별 납부율, 장기 미납자)
- [ ] 회비 납부 현황 통계 차트 (월별 납부율 추이)
- [ ] 전적 전체 기록 모바일 카드 정보 밀도 축소 (기본 2항목 + 탭 확장)

### 마케팅/SEO
- [ ] guide.html → Next.js 라우트 마이그레이션
- [ ] GA4 커스텀 이벤트 확장 (데모 전환율, 가입 퍼널)

### 캘린더
- [ ] 한국 공휴일 표시 (하드코딩 또는 API, 날짜 코랄/빨강 강조)

### 풋살 특화
- [ ] 쿼터 라벨 개선 ("1Q" → "전반/후반" 옵션)

### 포메이션 확장 (2026-04-10 옵션A 완료 후 남은 작업)
- [ ] 풋살 추가 포메이션 3종 (5인 2-2, 6인 3-2, 7인 3-3)
- [ ] 축구 인원별 포메이션 카테고리 신설 (6인/7인/8인/9인 조기축구)
  - `FormationTemplate.fieldCount`를 축구에도 적용
  - 경기 등록 시 인원수 선택 → 포메이션 필터
  - 자동 포메이션(AutoFormationBuilder)도 인원별 지원
  - 후보:
    - 6인(GK+5): 2-2-1, 1-3-1, 1-2-2
    - 7인(GK+6): 2-3-1, 3-2-1, 2-2-2
    - 8인(GK+7): 3-3-1, 2-3-2, 3-2-2
    - 9인(GK+8): 3-3-2, 3-4-1, 4-3-1

## LOW

- [ ] 게시판 페이지네이션/무한스크롤
- [ ] 개별 선수 상세 통계 페이지
- [ ] 벌금 관리 별도 페이지
- [ ] 데모 데이터 일일 자동 리셋 (Vercel Cron)
- [ ] 프리미엄 모델 설계
- [ ] 바이럴 공유 메커니즘 (결과 카드 워터마크)
- [ ] 다른 스포츠 확장 (농구, 배구)
- [ ] 실력 기반 자체전 팀 분배 (레이팅)
- [ ] 출석률 기반 자동 휴면 전환

## v1.0.3 이후 후보 (29차 숨은 자산 발굴 결과)

- [x] **상대팀 전적 UI** ✅ 완료 (`OpponentHistoryCard` 경기 상세 정보 탭 렌더, 102차 확인)
- [ ] **포메이션별 승률 UI** — 내부 집계 존재, UI 미노출. 기록 페이지 통계 탭 후보
- [x] **개인 출석률 히트맵** ✅ 완료 (`AttendanceHeatmap` 선수 프로필, 102차 확인)
- [ ] **AI 회비 독촉 문구 생성** — 총무 pain 직접 해소. TeamLinkt Emi 벤치마크. 미납자 목록 → Haiku로 문구 초안 생성
- [ ] **AI 경기 공지 초안 생성** — 경기 일정 정보 → 카카오 단체방용 공지 초안
