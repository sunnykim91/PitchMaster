# PitchMaster 개선 백로그

최종 업데이트: 2026-04-14 (21차)
현재 점수 추정: Designer 95 / UX 97 / Dev 98 / Marketing 85 / Business 82 (평균 91.4)
서비스 현황: 81팀 · 520명 · 170+경기 (14일 신규 37팀 폭발 성장)
회비 운영: 실제 입금 내역 있는 팀 2 / 설정만 한 팀 9
테스트: 657 passed (39 파일)
앱 출시: Play Store 비공개 테스트 14일 충족 예정 (4/20), 프로덕션 신청 예정

---

## 완료 (✅)

### UX/기능

- [x] 팀 생성 후 온보딩 위저드 (3단계 가이드)
- [x] 초대 플로우 대시보드 전면 노출
- [x] 경기 완료 전환 버튼 (SCHEDULED → COMPLETED)
- [x] 투표 마감일 메인 폼 이동 + 기본값 버그 수정
- [x] 평회원 "입금했어요" 자기 신고 버튼
- [x] 전체 워딩 개선 24건 (자동매칭→납부확인, 미연동→미가입 등)
- [x] 납부현황 별도 탭 + 평회원 숨김 (내 납부 상태만 표시)
- [x] 납부 기준일 설정 (월 경계 유연 매칭)
- [x] 튜토리얼 모달 제거
- [x] 골 삭제/전원 참석 확인 다이얼로그
- [x] 시즌 커스텀 관리 (설정 페이지에서 CRUD)
- [x] 전체 통합 기록 조회 (레거시 + 실제 경기 합산)
- [x] 휴면 회원 기능 (ACTIVE ↔ DORMANT 전환)
- [x] 감독 지정 포지션 (자동편성 시 감독 설정 우선)
- [x] 401 세션 만료 → 로그인 자동 리다이렉트
- [x] 카카오 인앱브라우저 투표 실패 수정 (credentials: include)
- [x] 전체 통합 출석률 100% 초과 버그 수정
- [x] 출석률 카운트 user_id/member_id 분리 시 버그 수정
- [x] 실점 버튼: 쿼터 미지정으로 등록 + 수정 시 OPPONENT 옵션
- [x] 투표 버튼 비활성 스타일 통일 (참석도 중립 회색)
- [x] 평회원 설정 페이지 팀설정 숨김
- [x] 경기 상세 뒤로가기 버튼 추가
- [x] 게시판 시간 표시 오류 수정
- [x] 설정 페이지 UI/UX 리디자인 (프로필+알림 통합, 유니폼 섹션 분리)
- [x] 알림 설정 토글 (푸시 알림 on/off)
- [x] PWA 설치 안내 개선 (인앱 브라우저 감지, iOS 가이드, 이미 설치 시 숨김)
- [x] 데모 모드 (로그인 없이 1클릭 체험)
- [x] Web Push 알림 인프라 (VAPID, SW push handler, 구독 API)
- [x] FK Rebirth 시즌 날짜 수정
- [x] 운영진 투표 독촉 알림 버튼 (경기 상세)
- [x] 평회원 투표 버그 수정 (memberId → user_id 기반 자동 처리)
- [x] DuesClient 탭별 컴포넌트 분리 (1987→490줄 + 4탭)
- [x] MatchDetailClient 탭별 컴포넌트 분리 → 5탭 (정보/투표/전술/기록/일지)
- [x] SettingsClient 섹션 분리 (931→280줄 + 3섹션)
- [x] React.memo 13개 컴포넌트 적용
- [x] uniformUtils.ts 공유 유틸 추출 (getJerseyStyle 2곳 중복 해소)
- [x] 랜딩 페이지 AI 패턴 제거 + 색상 토큰 통합
- [x] TacticsBoard 30+ 하드코딩 hex → CSS 변수
- [x] 팀 검색 가입 기능 (초대링크 병행 + 승인제)
- [x] 경기별 유니폼 홈/원정 선택 + 대시보드/목록 표시
- [x] 경기 일정 인라인 수정 기능
- [x] CM(중앙 미드필더) 포지션 추가
- [x] 데모 계정 팀 생성/가입 차단
- [x] 앱 복귀 시 데이터 자동 갱신 (visibilitychange)
- [x] 더보기 바텀시트 + 페이지에 PWA 홈 화면 추가 버튼 (전역 프롬프트 공유)
- [x] 시작 가이드 페이지 (guide.html + 초대 문구 템플릿 + 팀원 가이드)
- [x] 회비 엑셀 업로드 형식 안내 (서비스 내 + 가이드)
- [x] 카카오 오픈채팅 문의 채널 연동
- [x] 자동포메이션 하프쿼터 빈 슬롯 버그 수정
- [x] RLS 미활성화 테이블 보안 수정 (match_internal_teams 포함)
- [x] 팀 생성 후 환영 토스트
- [x] 대시보드 '카카오톡으로 초대' 버튼 (온보딩 위자드 + 초대 카드)
- [x] 온보딩 필수 필드 축소 (5개→2개: 이름+포지션만)
- [x] 1명 팀 넛지 푸시 크론 (24시간 후 초대 리마인더)
- [x] 가이드 상단 CTA 2개 + 랜딩↔가이드 양방향 링크
- [x] 관리자 대시보드 (/admin) + 데모 데이터 제외
- [x] 투표 마감 리마인더 크론 (마감일 미설정 경기도 전날 자동 알림)
- [x] 소셜프루프 수치 업데이트 + 실시간 조회 (49팀 · 347명)
- [x] 온보딩 생년월일 기본값 개선 (빈 값으로 변경)
- [x] 빈 상태 CTA 버튼 통일 (경기/기록/게시판/회칙 4곳)
- [x] FAQ 섹션 랜딩 페이지 추가 (4개 질문 아코디언)
- [x] voteStyles 3개 파일 중복 → 공통 모듈 추출
- [x] 경기 상세 미투표자 필터/하이라이트 + 인원 뱃지
- [x] OG 이미지 브랜드 컬러 통일 (코랄 primary + "28개 팀 사용 중")
- [x] 데모 버튼 가시성 강화 ("30초 만에 데모 체험하기" + 배경색 강화)
- [x] 대시보드 퀵투표 버그 수정 (memberId 대리투표 판정)
- [x] 푸시 알림 테스트 페이지 (/push-test, 운영진 전용)
- [x] 푸시 알림 토글 로딩 UI 개선 (스피너 + 안내 문구)
- [x] 초대링크 접속 시 가입 폼만 메인 표시
- [x] /api/push/send 인앱+푸시 동시 발송 수정 (sendTeamPush 통합)
- [x] 앱 아이콘 배지 숫자 표시 (navigator.setAppBadge)
- [x] 푸시 알림 아이콘 절대경로 + 진동/재알림 옵션
- [x] 푸시 알림 토글 기본값 OFF (구독 전 ON 표시 방지)
- [x] Service Worker 캐시 v4 + Network-First 전략
- [x] GA4 (Google Analytics 4) 도입 (G-XWRB861513)
- [x] Google Search Console 등록 (소유권 인증 + sitemap 제출 완료)
- [x] 전체 가독성 개선 (색상 대비 강화 — 8개 파일)
- [x] primary/warning 버튼 텍스트 흰색 변경
- [x] PC Chrome 폰트 가독성 개선 (text-rendering, font-optical-sizing)
- [x] UX 기본기 전면 개선 (cursor-pointer, 터치타겟 44px, safe-area, 스크롤)
- [x] WCAG 접근성 대비율 개선
- [x] 폰트 가독성 개선 (text-[10px]/[11px] 제거, type-* line-height)
- [x] 전체 섹션 제목 크기 통일 (sm:text-2xl)
- [x] 검색 input 자동완성 — 회원관리, 입출금, 투표관리 3곳 (datalist)
- [x] 회장 이임 모달 라벨 동적 변경 + 세션 갱신
- [x] 자체전(Internal Match) 기능 전체 구현
  - 경기 유형 토글 (일반/자체전) + 통계 반영 체크박스
  - A팀/B팀 팀 편성 (랜덤 + 2열 수동 토글)
  - 골 기록 side(A/B) 구분 + A vs B 스코어보드
  - 전술판 A/B 팀 탭 분리 + 팀별 roster 필터링
- [x] 경기 삭제 기능 (운영진 이상, ConfirmDialog)
- [x] 전적 반영 토글 (경기별 stats_included ON/OFF)
- [x] 투표 마감 시 버튼 숨기고 "투표 마감됨" 표시
- [x] 투표 탭 분리 (MatchVoteTab 신규, max-h-[60vh] 내부 스크롤)
- [x] 경기별 댓글 기능 (match_comments 테이블 + API + UI)
- [x] 용병 등록 전술판 탭으로 이동 (원본 폼 복원)
- [x] 회원 목록 정렬/필터 (역할순·이름순·최근가입순 + 역할 필터)
- [x] 정렬 3단계 순환 (없음→오름차순→내림차순) — 회원·투표 명단
- [x] 투표 Optimistic UI (즉시 반응, 실패 롤백)
- [x] 회비 미납 알림 (납부현황 탭 "미납 알림" 버튼)
- [x] 회비 첫 사용 온보딩 가이드 (설정 없을 때 3단계 카드)
- [x] 풋살 코트 비율 수정 (축구 4:5 → 풋살 3:2)
- [x] 심판/촬영 재설정 버그 수정
- [x] 경기 상세 SSR (9개 클라이언트 API → 서버 1회 병렬)
- [x] useApi 글로벌 캐싱 (60초 TTL + mutation 캐시 무효화)
- [x] admin API N+1 쿼리 제거 (35회→9회)
- [x] 전체 API 성능 최적화 (게시글 CASCADE, 댓글 JOIN, goals 컬럼 선택)
- [x] DB 복합 인덱스 5개 추가
- [x] ChunkLoadError 자동 새로고침
- [x] React hydration error 수정 (new Date() 클라이언트 전용)
- [x] Google Fonts CORS crossOrigin 추가
- [x] PC 카드 이미지 클립보드 복사 지원
- [x] 풋살 포지션 UI 적용 (FIXO/ALA/PIVO — 온보딩·설정·전술판)
- [x] 랜딩/가이드 누락 기능 10개 추가 (댓글·용병·미납알림·풋살·일지 등)
- [x] 입출금 기록 스크린샷 첨부 제거 (내역 올리기 탭과 혼동 방지)
- [x] OCR 중복 제거 개선 (description 비교 제거, 날짜+금액+타입만)
- [x] OCR 날짜 파싱 한 자리 월/일 지원 (3.27 형식)
- [x] 회비 날짜 추출 안정화 (split("T") → slice(0,10))
- [x] 어드민 모바일 테이블 세로 스크롤 버그 수정 (overscroll-behavior 분리)
- [x] 완료 경기 투표 관리 허용 (운영진 지난 경기 참석자 추가 가능)
- [x] 가이드 페이지 서비스 내 링크 (더보기 + 사이드바)
- [x] 회비 미납 크론 자동 발송 (매월 1·15일)
- [x] 가입 승인 모드 토글 (AUTO/MANUAL)
- [x] 회장 이임 기능
- [x] 회원 권한변경 자기강등 버그 수정
- [x] 풋살 인원수 표기 개선 (5vs5 형식)
- [x] 풋살 전술판 인원수 선택 기능 (3~8인제)
- [x] 등번호 기능 (팀 내 유니크, 본인 자기 설정 + 운영진 편집)
- [x] 주장/부주장 지정 (관리 권한과 독립, 팀당 각 1명)
- [x] 기록 상세 드릴다운 (골/어시/MVP/출석 숫자 탭 → 경기 목록 모달)
- [x] 투표 현황 용병 수 표시 (0명이면 숨김)
- [x] 골/어시 기록에 "(용병)" 라벨 자동 표시
- [x] 경기 정보 탭 스코어 표시 (승/무/패 뱃지, 자체전 A:B)
- [x] 회원 목록 컴팩트 카드 + 탭 확장 UI 리디자인
- [x] 랜딩 CTA 순서 변경 (데모 먼저 → 카카오 나중)
- [x] 12개 기능 나열 → 6개 + "더 보기" 토글 압축
- [x] 가이드 경기 운영 흐름 순서 3번으로 이동
- [x] 가이드 FAQ 심화 (납부 기준일, 완료 경기 참석자 수정 등)
- [x] 가이드 URL www.pitch-master.app 통일
- [x] SSR 데이터 불일치 수정 (getMembersData, getMatchDetailData, getDashboardData)
- [x] 대시보드 생일 축하 카드 (KST 기준 월-일 비교, 그라데이션+컨페티 디자인)
- [x] 전적 페이지 3탭 분리 (내 기록 / 팀 랭킹 / 전체 기록) + 시즌 셀렉터 탭 바 이동
- [x] 설정 페이지 3탭 분리 (내 설정 / 팀 설정 / 시즌 관리, 평회원은 탭바 숨김)
- [x] 랜딩 슬라이더 실제 앱 스크린샷 6장으로 교체 (Mock UI 제거)
- [x] 랜딩 소셜프루프 실시간 조회 (anon→admin key, RLS 우회)
- [x] 랜딩 CTA 순서 데모 먼저 + 12개 기능→6개+더보기 토글
- [x] 가이드 페이지 UX 전면 개선 (sticky 네비 + 바로가기 그리드 + 프로그레스 바 + FAQ 아코디언 + Back to Top)
- [x] Z Flip 등 소형 화면(344px) 대응 (전술판·포메이션·대시보드 min-w/gap 조정)
- [x] 소형 화면 카드 우측 테두리 잘림 수정 (컨테이너 px-3→px-4)
- [x] 데모 팀 회비 데이터 시드 (6개월 입출금 84건 + 잔고 반영)
- [x] 개인정보처리방침/이용약관 이메일 통일 (pitchmaster.app@gmail.com)
- [x] DEVELOPMENT_INSTRUCTION.md 기술스택 Next.js 14→16 최신화
- [x] 이력서 PitchMaster 섹션 수정안 (문제 해결 경험 중심 재구성)
- [x] UI/UX 일관성 전면 개선 (text-[10px]/[9px]/[11px]→text-xs 16곳, 섹션 제목 통일, 하드코딩 색상 제거)
- [x] EmptyState 컴포넌트 통일 (DuesStatus·DuesRecords·Records 3곳)
- [x] 탭 바 underline 스타일 통일 (Dues·MatchDetail·Records·Settings 4곳)
- [x] Card border-radius 통일 (rounded-2xl→rounded-xl)
- [x] 색 대비 강화 (muted-foreground 58%→62%, WCAG 5.98→6.76)
- [x] OG 이미지 + 소셜프루프 50팀/375명 업데이트
- [x] 소셜프루프 pill 뱃지 스타일로 강조 (border + bg + bold)
- [x] 투표 탭 프로그레스 바 추가 (대시보드와 통일)
- [x] 가이드 네비 pill 10→6개 축소 + 크기 확대
- [x] 가이드 기타 기능 17개→8+더보기 접기
- [x] 가이드 섹션 디바이더 카드 스타일 구분 강화
- [x] 기록 Top3 순위 금색 차별화 (1위 warning 배경 + bold)
- [x] 레이더 차트 라벨 fontSize 11→13 + fontWeight 600
- [x] 대시보드 시즌전적 카드 색상별 배경 tint
- [x] 전술판 AI 추천 → details 접기 (전술판 바로 접근)
- [x] 회비 거래 멤버 이름 bold 강조
- [x] 미완료 항목 아이콘 2px + warning 색상
- [x] 투표 필터/정렬 버튼 터치 타겟 확대
- [x] 내 기록 0일 때 "-" + muted 색상 (허전함 해소)
- [x] 전체 기록 멤버 카드 구분선 border/40 강화
- [x] 회비 거래 내역 간격 space-y-2.5 확대
- [x] 슬라이더 폰 프레임 비율 9:17→9:19
- [x] 실점 수정 시 쿼터만 표시 (득점자/어시스트/골유형 숨김, 자체전 제외)
- [x] 경기 결과 공유 카드 이미지 복사 버튼 제거
- [x] 전술판 초기화 confirm 다이얼로그 추가
- [x] 전역 useConfirm 훅 도입 (ConfirmContext + Provider)
- [x] ConfirmDialog → useConfirm 전역 마이그레이션 (6파일 10인스턴스, prop drilling 제거)
- [x] 경기 일지 미표시 버그 수정 (SSR 테이블명 match_diary→match_diaries)
- [x] 골 기록 표시 순서 개선 ("PK Q3" → "3Q PK")
- [x] 가이드 하단 좌우 여백 깨짐 수정 (중복 HTML 요소 제거)
- [x] 대시보드 "마감: 마감:" 중복 텍스트 수정 (formatDue 접두어 제거)
- [x] 어드민 팀 상태 3단계 (활성/휴면/미사용, 14일 기준 + 회비/게시글/골 활동 포함)
- [x] 경기 0건 팀 대시보드 강제 유도 카드 ("첫 경기를 등록해보세요!")
- [x] 경기 0건 + 멤버 3명+ 팀 넛지 푸시 크론 (매일 KST 10:00)
- [x] 팀 기본 포메이션 설정 (팀 설정 → 전술판/자동편성에 반영)
- [x] 팀 설정 포메이션 순서/UI 개선 (유니폼 → 포메이션 순서, 셀렉터 w-full)
- [x] 자동편성 쿼터 분산 배치 (2Q 선수 1,3 또는 2,4 균등 간격)
- [x] 자동편성 재생성 기능 (버튼 누를 때마다 다른 라인업, 셔플)
- [x] 자동편성 포지션 매칭 개선 (선택지 적은 선수 우선 배정)
- [x] 자동편성 LAM/RAM→LW/RW, LM/RM→LW/RW 매핑 수정 (4-2-3-1, 4-4-2, 3-4-3)
- [x] 자동편성 3Q 선수 슬롯 부족 수정 (remaining 적은 쿼터 제외 방식)
- [x] 자동편성 인접 카테고리 배치 (수비수 넘침 시 CDM 우선, CAM 방지)
- [x] 평회원 본인 등번호 수정 권한 버그 수정 (PUT 전역 requireRole 우회)
- [x] 전술 탭 375px UI 넘침 수정 (min-w-0 overflow-x-hidden)
- [x] 자동 포메이션 375px 넘침 수정 (포지션 뱃지 flex-wrap, 통계 단순화)
- [x] CS 아웃리치 37팀 발송 완료 (카톡 28팀 + 인앱 알림 9팀)
- [x] 경기일 날씨 예보 표시 (대시보드 + 경기 상세, OpenWeatherMap + fallback)
- [x] 선수 카드 API 구현 (FIFA 스타일 SVG, 포지션별 지표 6종 + OVR, UI 숨김)
- [x] 시즌 어워드 API 구현 (7종 시상 산출 + 공유 카드 SVG, UI 숨김)
- [x] 개인 커리어 프로필 공개 페이지 (/player/[id], 로그인 불필요, UI 숨김)
- [x] 게시판 글 공유 기능 (Web Share API + 클립보드 fallback, 투표 글 포함)
- [x] 게시판 투표 Optimistic UI (즉시 반영 → 백그라운드 API → 실패 시 롤백)
- [x] 게시판 투표 현황 모달 (옵션별 투표자 + 미투표자 목록, Sheet 바텀시트)
- [x] 게시판 투표 myVote 새로고침 초기화 버그 수정 (SSR userId 전달)
- [x] 경기 종료시간 필드 추가 (시작 시간 +2h 자동, 전 페이지 반영, migration 00016)
- [x] 경기 수정 시간 select 30분 단위 통일 (Input type=time → select)
- [x] 경기 생성 투표 마감일 기본값 버그 수정 (matchDate 연동)
- [x] 날씨 안내 문구 (5일 초과 시 "D-5부터 날씨 확인", 상세 "경기 5일 전부터 표시")
- [x] hydration 에러 수정 (헤더 p→span, Badge div 중첩 해소)
- [x] 라이트/다크 모드 지원 (ThemeProvider + 헤더 토글 + 설정 페이지 3모드)
- [x] 라이트 모드 팔레트 디자인 (블루-그레이 톤, 진한 강조색, WCAG AA 충족)
- [x] 라이트 모드 UI 디테일 (전술판 선 강화, 네비바 그림자, 카드 보더 개선)
- [x] 다크 모드 접근성 개선 (border 대비 강화, loss 색상 조정)
- [x] Card 컴포넌트 border/shadow 양모드 대응 (white/4 → border/40, shadow-sm)
- [x] 터치 타겟 44px 일괄 적용 (대시보드 투표/회칙 필터/전적 정렬 헤더)
- [x] 대시보드 투표 영역 구분선 추가 + 미완료 항목 warning 강조
- [x] 대시보드 최근 전적/투표 카드 보더 구분 강화
- [x] 회비 납부현황 그룹핑 (미납→면제→납부, 납부자 접기)
- [x] 가이드 누락 기능 8건 추가 (날씨/테마/공유/투표현황/골유형/포메이션/삭제/공유카드)
- [x] 랜딩 누락 기능 5건 추가 (날씨/테마/글공유/골유형/결과카드)
- [x] 경기 결과 자동 푸시 크론 (매일 22:00 KST, result_pushed 중복방지)
- [x] 경기 일정 캘린더 뷰 (월간 달력 + 도트 + 날짜 클릭 상세)
- [x] 팀 일정(EVENT) 기능 (회식/MT/모임, 종료일 지원, 전술/기록 탭 숨김)
- [x] 게시판 투표 수동 마감 기능 (운영진 전용)
- [x] 회비 삭제 버튼 디자인 개선 (빨간 배경 → hover 전환)
- [x] 대시보드 최근 전적 카드 리디자인 (승/무/패 아이콘 + 가로 레이아웃)
- [x] 대시보드 React hook 순서 에러 수정 (#300)
- [x] dashboard API totalMatches/teamUniform 누락 수정
- [x] records SSR jerseyNumber/teamRole 누락 수정
- [x] kakaoShare 테스트 5건 수정 (fallback 방식 변경 반영)
- [x] 데모 팀 데이터 보강 (현실적 이름, 등번호, 4월 회비, 투표 글)
- [x] Play Store 스크린샷 8장 + manifest 업데이트 (id, screenshots, description)
- [x] 홈 예정 경기 카드 v0 기반 재설계 (시간 강조, 투표 현황 dot+바, 카드 전체 클릭)
- [x] 일정 목록 카드 v0 기반 재설계 (시간 primary, 스코어+승패 우측, 투표 버튼 납작)
- [x] 캘린더 뷰 개선 (주말 코랄 강조, 바 표시, 하단 카드 투표 버튼 추가, 꺽쇠 우측 상단)
- [x] 경기 등록 폼 — 경기 유형 최상단 이동 + 장소 칩 가로 스크롤 + 버튼 텍스트 동적
- [x] 완료 경기 opacity-70 흐릿 처리 + 시간 muted 색상
- [x] 팀일정 수정 시 "상대팀" → "일정 제목" 라벨 분기
- [x] 카카오 초대 공유 링크 중복 제거 + fallback 메시지 개선
- [x] 대시보드 위자드 UX 정리 (코드복사 제거, 중복 CTA 숨김)
- [x] 전술판 하프쿼터 수동 지원 (선수별 풀타임/전반/후반 선택 + 모바일 바텀시트)
- [x] 전술판 전체 쿼터 초기화 버튼 추가
- [x] 전술판 버튼 레이아웃 전면 리디자인 + Z플립 이름 겹침 수정
- [x] 투표 마감 시간 수정 + 수동 마감/재개 토글 (운영진 전용)
- [x] 투표 마감 리마인더 KST 오프셋 수정 (02:00 → 17:00)
- [x] 팀 일정(EVENT) 생성 폼 개선 (텍스트 수정 5곳, 경기유형 버튼 색상 차별화, 줄바꿈 해소)
- [x] 투표 공유 링크 ?tab=vote 직접 이동
- [x] 일정 목록 카드 공유 버튼 복원 + 꺽쇠 크기/밝기 강화
- [x] useIsMobile 훅 추가 (모바일 감지 유틸)
- [x] 대시보드 투표 현황 카드 개편 (운영진 전용, 경기 날짜 순 정렬, 3개 제한, 다가오는 경기와 중복 제거)
- [x] 투표 현황 카드 경기 유형별 표시 (일반 vs 상대팀 / 자체전 / 팀 이벤트 제목)
- [x] 투표 현황 카드 각 항목 진행 막대 추가 (다가오는 경기 카드와 통일)
- [x] 투표 현황 카드 마감일 표시 제거 (정보 과잉 정리)
- [x] 미완료 항목 카드 클릭 가능 링크 전환 (label → { label, href } 객체 배열)
- [x] 미완료 항목 신규 4종 추가: 프로필 완성 / 이번 달 회비 납부 확인 / 회비 영수증 업로드(운영진) / 가입 대기자 N명 승인(운영진)
- [x] OCR 중복 판정에 description 포함 (같은 날 같은 금액 다른 입금자 누락 버그 수정)
- [x] OCR 부분 인식 거래 분리 처리 (시간 누락 / 날짜 추정 / 날짜 없음 사유 배지 + 추가·제외 액션, 자동 저장 차단)
- [x] penalties 고아 테스트 파일 삭제 (3745156에서 라우트 폐기, 테스트만 남아있던 회귀)
- [x] dashboard.test.ts 회귀 수정 (match_guests / 활성 멤버 team_members mock 추가, db null fallback 200 검증)

#### 21차 (2026-04-14 심야) — AI 기능 Phase 0 + Phase 1 도입

**AI 멀티 모델 전략 확정**
- 사용자 접점 한국어 텍스트 = Claude Haiku 4.5 (한국어 톤 섬세함)
- 백엔드 분석·분류·구조화 = Gemini 2.0 Flash (비용 극소)
- 환경변수 기반 모델 스위칭, Prompt Caching 필수
- 문서: `docs/business-costs-pricing.md`, `memory/project_ai_roadmap.md`

**Phase 0 — AI 시그니처 카피 (Claude Haiku)**
- [x] `@anthropic-ai/sdk` v0.89 설치 + ANTHROPIC_API_KEY 환경변수 연동
- [x] `src/lib/server/aiSignature.ts` — Claude Haiku 호출 + prompt caching(`cache_control`) + 룰 기반 fallback (71f71ca)
- [x] 프롬프트 대폭 튜닝: 5가지 유형(장면·대조·인과·단언·헌신), 금지어 블랙리스트, 상투 표현 차단 (b7a16c9, 732a2cb, c30e2d0)
- [x] 품질 가드 (`isLowQuality`): 메타 텍스트, 약어 손상(MO·MV), 숫자 붙여쓰기, 상투어 자동 fallback
- [x] migration 00027: team_members.ai_signature / generated_at / model 3컬럼 추가
- [x] `src/lib/server/aiSignatureCache.ts` — TTL 7일 캐시 (e19067e)
- [x] `/player/[memberId]` 통합: 김선휘 Feature Flag + 모든 사용자에게 캐시 노출
- 결과 예시: "상대가 가장 먼저 쳐다보는 뒷공간을 장악한다" — 룰 기반 불가 표현
- 월 비용 예상: ~1,200원 (활성 선수 300명 주 1회 가정)

**Phase 3 — AI OCR (Claude Haiku Vision) — 회비 영수증 스마트 파싱**
- [x] `src/lib/server/aiOcrParse.ts`: 이미지 → 거래 JSON 배열 파싱
  프롬프트에 한국 은행 앱(카뱅/토스/국민 등) 파싱 가이드 + JSON 스키마
  extractJsonArray: 코드블록/설명문 섞여도 안전하게 추출
- [x] `POST /api/ocr/smart`: 김선휘 Feature Flag 라우트
- [x] DuesBulkTab에 "✨ AI OCR로 시도하기 (베타)" 버튼 추가
  기존 Clova OCR은 그대로 유지, AI는 선택지로 병존
  AI 결과를 Clova 스타일 텍스트로 재구성 → 기존 parseTransactions 재사용
- 호출당 ~3~5원 (이미지 ~1,500 + 프롬프트/출력 ~1,000)
- 기존 Clova 대비 장점: 부분 인식 거의 없음, 이미지 맥락 이해

**Phase 2 — AI 코치 분석 (Claude Haiku, Phase 1은 경기 후기로 확정)**
- [x] `src/lib/server/aiTacticsAnalysis.ts`: 편성 결과 + 참석자 스탯 → 코치식 1~2단락 분석 생성
  프롬프트에 1단락(편성 콘셉트) + 2단락(핵심 플레이어·주의점) 구조 가이드
- [x] `POST /api/ai/tactics` 라우트: 김선휘 Feature Flag(403) + 저품질 자동 fallback
- [x] AutoFormationBuilder에 "AI 코치 분석 보기" 버튼 + 결과 카드 UI
  편성 변경 시 자동 초기화, 에러 메시지 표시
- Props 연쇄: page.tsx → MatchDetailClient → MatchTacticsTab → AutoFormationBuilder
- 호출당 ~2.5원 (입력 ~1,500 + 출력 ~250)

**Phase 1 — AI 경기 후기 (Claude Haiku)**
- [x] migration 00028: matches.ai_summary / generated_at / model 3컬럼 추가
- [x] `src/lib/server/aiMatchSummary.ts`: 카톡 공유용 2~3단락(200~350자) 생성
  프롬프트에 승리/패배/무승부/자체전/이벤트 상황별 톤 가이드 + 좋은 예시 3개
- [x] `src/lib/server/aiMatchSummaryCache.ts`: 경기 1회 생성 후 영구 캐시
- [x] `getMatchDetailData`에 aiSummary 통합 (COMPLETED 경기만, 김선휘 flag)
- [x] MatchDiaryTab 상단 "AI 경기 후기" 카드 + 복사 버튼
- 월 비용 예상: ~300원 (월 100경기 가정)

**워딩 정리 — 영구 무료 약속 제거**
- [x] `public/guide.html` FAQ: "핵심 기능 계속 무료" → "추후 유료 도입 가능"
- [x] `src/app/terms/page.tsx` 제6조: 유료 전환 여지 유지 개정

**운영 비용·가격 정책 문서화**
- [x] `docs/business-costs-pricing.md` 작성 (272줄)
- [x] 메모리 3종 갱신: `reference_infra.md`, `project_ai_roadmap.md`, `project_pricing.md`
- Claude Code Max는 본업 공유 자산으로 손익 분리, 사이드 회수는 선택적 목표

#### 20차 (2026-04-14 밤) — 커리어 프로필 v0 UI 완성 + 카드 진입점 확장

**커리어 프로필 v0 UI 완성도**
- [x] 뒤로가기 버튼 추가 — PlayerProfilePage + PlayerProfileEmpty 상단 좌측 고정(fixed)
- [x] PlayerCard 이미지 onError fallback — 로드 실패 시 등번호 워터마크로 자동 전환
- [x] PlayerCard photoUrl 있을 때 이름과 간격 mb-4 sm:mb-5 추가
- [x] globals.css v0 카드 CSS 복구 — sparkle/holographic-bg/card-shimmer-slide/glow-*/text-glow-*/noise-overlay/vignette/stadium-pattern/perspective-1000/preserve-3d/scrollbar-hide (이식 시 누락됐던 것)
- [x] /player/[memberId] `?team=` URL 쿼리 지원 — 다중 팀 소속 시 올바른 팀 데이터 표시 (FCMZ/FCMZ 풋살 혼동 버그 수정)
- [x] DORMANT 회원도 프로필 열람 가능 — BANNED만 제외 (휴면 회원 404 버그 수정)

**카드 진입점 확장**
- [x] 사이드바 프로필 영역 Link + ChevronRight — 어디서든 내 프로필 접근
- [x] 대시보드 최상단 "내 프로필 보기 →" 한 줄 링크 — 최소 침해로 진입점 명시
- [x] 기록 페이지 이름 점선 언더라인 + 링크 — 클릭 가능 시그널 + /player 이동

**기록 페이지 "시즌 어워드" 4번째 탭 추가**
- [x] 탭 구조 my/ranking/all → my/ranking/all/**awards**
- [x] 기존 주석 처리된 SeasonAwardsCard 활용 (추후 v0 SeasonAwardsPage 연결 예정)
- [x] 시즌 드롭다운 위치 변경: 탭 바 오른쪽 → 아래 독립 줄 (공간 부족 해소)
- [x] 어워드 행 이모지 영역 고정 폭(h-6 w-6)으로 정렬 통일
- [x] name 비어있는 어워드 행 스킵 (베스트매치 빈 카드 방지)

**Rarity 기준 완화 (80/70/60)**
- [x] ICON 90→**80**, HERO 80→**70**, RARE 70→**60** — 동호회 맥락에서 에이스도 COMMON만 나오던 문제 해결. 김선휘 OVR 67 → COMMON → RARE(에메랄드)로 승급

**워딩 정리 — 무료 영구 약속 제거**
- [x] guide.html FAQ "핵심 기능은 계속 무료로 유지할 계획" → "현재 무료, 추후 유료 요금제 도입 가능"
- [x] terms 제6조 "유료 기능 도입 시 기존 무료 이용자의 기본 기능 사용에는 영향을 주지 않습니다" 삭제 → 변경 가능성 열어 둠

#### 19차 (2026-04-14 저녁) — 출시 직전 최종 QA·MVP 규칙 변경

**입력 검증·업로드 경계**
- [x] 이미지 업로드 크기·타입 제한 (OCR, 회비 엑셀) — 10MB + MIME/확장자 검증
- [x] 팀 설정(teams PUT) 입력 검증 — 팀명 30자, 로고 URL http(s) 화이트리스트
- [x] 경기 시작·종료 시간 순서 검증 (시작>종료, 같은 날 시간 역전)
- [x] 경기 상태 머신 역행 차단 (COMPLETED → SCHEDULED 금지)

**UX 포맷 통일**
- [x] 회비·대시보드 금액 표기를 `formatAmount()`로 일괄 전환 (6개 파일, 19건 치환)

**MVP 규칙 변경 — 참석자 70% 투표 시에만 실제 MVP로 인정**
- [x] `src/lib/mvpThreshold.ts` 유틸 신규 — `MVP_VOTE_THRESHOLD = 0.7`, `isValidMvpVoteTurnout`, `resolveValidMvp`
- [x] 대시보드 최근 경기 MVP 표시에 임계값 적용
- [x] 시즌 어워드 MOM 집계에 임계값 필터 적용
- [x] 선수 카드(player-card) 시즌 MVP 카운트에 임계값 적용
- [x] 레코드(records) MVP 집계에 임계값 적용
- [x] 효과: 참석 10명인 경기에서 MVP 투표 6명이면 → MVP 미확정 (투표 7명+ 필요)

**옵티미스틱 에러 처리**
- [x] 회비 삭제 실패 시 토스트 에러 노출 (기존 무반응 → `삭제에 실패했습니다` 안내)

**테스트 조정**
- [x] dues-excel 테스트: File 객체로 교체 (Blob의 "blob" 파일명 → ".xlsx" 보존)
- [x] records/dashboard 테스트: MVP 임계값 mock 추가 (attendance PRESENT/LATE 쿼리 + voting turnout ≥ 70%)
- [x] 전체 657 테스트 green 유지

#### 18차 (2026-04-14) — 앱 출시 직전 안정화·보안 스윕

**크로스 팀 접근 취약점 일괄 수정 (1차: 92fa215)**
- [x] **용병 API 권한 체크 추가** — POST/PUT/DELETE에 MATCH_EDIT(STAFF) 요구, 누구나 용병 추가·삭제 가능하던 버그 차단
- [x] **MVP/다이어리/경기댓글/스쿼드 GET team_id 검증** — 다른 팀 matchId로 조회 시 민감 데이터 유출 차단
- [x] **용병 DELETE team_id 검증** — PUT은 있고 DELETE만 누락된 비대칭 해소
- [x] **notifications PUT 단일 id 업데이트 user_id 검증** — 방어 심화
- [x] **벌금 API 권한 교체** — MATCH_CREATE → DUES_SETTING_EDIT / DUES_RECORD_ADD
- [x] **admin stats·레코드·회비 쿼리 휴면 필터 보정** — BANNED 제외, 통계 분모에 DORMANT 포함

**크로스 팀 접근 2차 패치 (10b6f1b)**
- [x] **attendance-check GET/POST matchId 팀 검증 추가**
- [x] **internal-teams GET matchId 팀 검증 추가**
- [x] **seasons PUT 활성화 시 team_id 조건 추가** (다른 팀 시즌 활성화 교란 방지)
- [x] **rules PUT 규칙 수정 시 team_id 조건 추가**
- [x] posts DELETE / autoCompleteMatches 문자열 비교 / poll.ends_at null 가드 — 재검토 결과 false positive

**출시 전 UX 일괄 개선 (079b16f)**
- [x] **원시 에러 메시지 순화** — Season/Personal/Team Settings 5곳 toKoreanError() 적용 (DB 에러 직접 노출 차단)
- [x] **위험 액션 모달 오터치 방지** — destructive variant일 때 "취소" 버튼에 autoFocus, 회장 이임 모달에 destructive 적용
- [x] **Toast 지속시간 가변** — 에러·긴 메시지(30자+) 5초, 일반 3.5초
- [x] **투표 버튼 로딩 상태 시각화** — Loader2 스피너, 실패 시 흔들림 애니메이션(animate-shake), 운영진 대리 투표에도 동일 적용 (loadingProxy)
- [x] **"하시겠습니까" → "할까요" 톤 현대화** — 11곳 일괄 치환 (삭제/이임/종료/제명)
- [x] **"유저" → "회원" 용어 통일** — admin 전체/신규 + 멤버 연동 셀렉트 문구
- [x] **formatters.ts 신규** — formatDate/formatDateKo/formatTime/formatTimeKo/formatAmount (점진적 통일용, SeasonManagement 1곳 적용)

**운영 기록**
- [x] **Play Console 프로덕션 답변 자료 작성** — docs/play-console-production-answers.md (테스터 피드백·수정 내역·FAQ 답변 팁)
- [x] **이근범 회장(불공FC) 앱 내 알림 발송** — 가입 대기 6명 안내 (카카오톡 채널 미보유, 푸시 미구독)

#### 17차 (2026-04-12)

**v0 카드 UI 이식 — Phase 1, 2**
- [x] **v0 컴포넌트 4종 src/components/pitchmaster/ 이식** — PlayerCard / PlayerProfilePage / SeasonAwardsPage / ShareCard (2,475줄)
- [x] **globals.css에 v0 프리미엄 애니메이션 CSS 이식** — holographic/sparkle/card-shimmer/glow-pulse/float keyframes + 15개 유틸 클래스 (shimmer keyframe 충돌 방지 위해 card-shimmer-slide로 rename)
- [x] **커리어 프로필 /player/[memberId] v0 UI 연결** — getPlayerData에 calculateOVR + PlayerCardProps 조립 + photoUrl 매핑
- [x] **calculateOVR playerCardUtils.ts 공유 유틸화** — /api/player-card에서 이동 + export
- [x] **dev 전용 /demo-cards 페이지 + 더보기 메뉴 항목** — 4탭 데모(카드/어워드/프로필/공유)
- [x] **PlayerCard 옵션B 9종 개선** — OVR text-7xl~8xl, rarity별 text-shadow, sparkle 18+개 4크기 랜덤, 시그니처 카피 컬러/크기, 등번호 워터마크 opacity 0.22, 카드 뒷면 stats 잘림 방지, rarity별 glow 3겹
- [x] **MVP 슈퍼카드 overflow-hidden 제거** — 외곽 wrapper 분리, PlayerCard max-w-[260px] sm:280px
- [x] **베스트 모먼트 가로형 카드** — min-h-[120px] flex items-center, 좌측 이모지 박스(그라디언트+링) + sparkle dots 6개 + 카테고리별 포인트 컬러
- [x] **시즌 어워드 1순위 featured 모드** — col-span-2, 좌측 큰 트로피(w-20~24) + 우측 큰 텍스트(3xl 이름 + 5~6xl 수치) + "시즌 1위" 라벨
- [x] **ShareCard 미리보기 확대 + 가로 스크롤** — Story 320x568, Square 360x360, OG 480x252, rounded-2xl + 모바일 가로 스크롤 컨테이너
- [x] **SeasonAwardsPage Award 타입 name/value optional** — bestMatch 호환
- [x] **v0 최종 프롬프트 작성 docs/v0-prompt-killer-features-final.md** — 이전 문제점 14가지 + 5대 원칙 + 실루엣 SVG 요청

**프로필 사진 기능**
- [x] **설정 > 개인 설정 프로필 사진 업로드** — POST /api/profile/image (Supabase Storage uploads/profiles/) + DELETE + 카카오 연동 버튼(scope=profile_image)
- [x] **카카오 프로필 이미지 자동 반영** — auth.ts findOrCreateKakaoUser에서 카카오 이미지가 있고 커스텀 업로드(uploads/profiles/)가 아니면 DB 업데이트
- [x] **auth() 세션 동기화에 profile_image_url 포함** — 다음 페이지 이동 시 즉시 반영
- [x] **카카오 OAuth redirect 쿼리 파라미터 지원** — state에 __redirect__ 마커 인코딩 → 연동 후 설정 페이지 복귀
- [x] **next.config kakaocdn.net 도메인 허용** — 카카오 프로필 이미지 로드
- [x] **프로필 이미지 3곳 적용** — 헤더(→사이드바), 회원 목록 각 카드, 게시판 글/댓글 아바타

**더보기/헤더 개편**
- [x] **더보기 페이지 상단 프로필 영역 + 하단 로그아웃** — Sparkles 아이콘 "카드 디자인 데모" 메뉴 항목 포함
- [x] **헤더 프로필 아이콘 제거 → 사이드바 상단으로 이동** — 모바일 헤더 UI 복잡도 감소

**보안 / 권한**
- [x] **쿠키 secure 플래그 추가** — process.env.NODE_ENV === "production"일 때만, SESSION_COOKIE_BASE_OPTIONS 공통 상수 추출
- [x] **투표 API 팀 소속 검증 추가** — POST /api/attendance에서 match.team_id !== ctx.teamId 시 403 (데모 계정이 FCMZ 경기에 투표 가능했던 버그 차단)
- [x] **감독 지정 포지션 권한 수정** — PRESIDENT 전용 → STAFF 이상 (MATCH_EDIT 권한으로 분리)

**전술판 / 자동 편성**
- [x] **전술판 하이라이트 — 감독 지정 포지션 우선 적용** — baseRoster가 선수 선호만 썼던 것을 coach_positions > preferred_positions 순으로 통일 (자동 배치와 동일 기준)
- [x] **자동 편성에서 휴면 회원 제외** — dormantIds 세트로 필터링

**투표 / 경기**
- [x] **투표 재개 버튼 — 경기 전날 17시로 복원** — 기존 new Date()+1달 임시값 버그 수정 (FCMZ 4/13 경기 마감일 5/5에서 4/12로 수동 정정)

**기타**
- [x] **PC 공유 클립보드 분기** — Windows 공유 모달 대신 clipboard.writeText, 모바일만 navigator.share
- [x] **회비 OCR description 포함 중복 판정** — 이미 16차에 있음 (확인용)

#### 16차 (2026-04-11)

- [x] **세션 쿠키 HMAC 서명 도입** — pm_session 조작 위장 방지, `SESSION_SECRET` 환경변수 (8d32f4e)
- [x] **경기 등록 직후 1인 팀 초대 CTA 모달** — 신규 팀 활성화 유도 (61464ce)
- [x] **전술판 선호 포지션 매칭 하이라이트** — 필드 타일에 선호 포지션과 일치하는 선수 success ring + 글로우 (785772f, a663f1a)
- [x] **전술판 선수 선택 패널 매칭 하이라이트** — 활성 슬롯과 카테고리 일치 선수만 success variant, 헤더 `추천 N명` 칩, 안내 한 줄 (a23844f)
- [x] **전술판 매칭 표시 라벨 명시화** — ✓ 기호 → "추천" / "적합" 한국어 라벨, 필드 상단 레전드 추가 (5ac1f40)
- [x] **모바일 전술판 — 적합 인라인 라벨 데스크탑(sm+) 전용** — 좁은 화면에서 이름 잘림 방지 (4860c89)
- [x] **전술판 공유 캡처 시 적합 표시 숨김** — isCapturing state로 필드 링·pill·레전드 일시 제거 (a48c2d7)
- [x] **축구 11인 포메이션 5종 추가** — 4-1-4-1 / 4-5-1 / 5-3-2 / 3-4-2-1 / 4-3-2-1 (3ce84e7)
- [x] **경기 기록 입력 운영진 전용 토글** — teams.stats_recording_staff_only 컬럼 + 팀 설정 토글 + /api/goals 권한 게이트. 평회원은 기록 보기 전용 (03269da, migration 00024)
- [x] **킬러 기능 백엔드 보강 — 선수 카드 JSON variant** — `/api/player-card?format=json` 추가. ovr/rarity/signature/stats[].rank/streak/isHero 필드. 팀 내 랭킹과 연속 기록 산출 (a37b57e)
- [x] **킬러 기능 백엔드 보강 — 시즌 어워드 MVP/요약** — `/api/season-awards`에 mvp(자동 선정) / 어워드별 context / seasonSummary 필드 추가 (a37b57e)
- [x] **킬러 기능 백엔드 보강 — 커리어 프로필 베스트 모먼트** — `/player/[memberId]`에 signature / bestMoments (베스트 경기·첫 골·연속 기록) / 랭킹 / streak / isHighlight 추가 (a37b57e)
- [x] **playerCardUtils 공유 헬퍼 + 단위 테스트 42개** — rarity/signature/ranking/streak/bestMoments 순수 함수 (a37b57e)
- [x] **경기 기록 탭 실점 수정 — 쿼터 UI 노출 + 취소 시 폼 닫기** (bd35300)
- [x] **자동 경기 완료 — 당일 match_end_time 이 지난 경기 포함** — 이전엔 `match_date < today` 만 → 오늘 오전 경기가 오후에도 SCHEDULED 로 남는 버그. `autoCompleteTeamMatches` 헬퍼로 3곳 통합 + KST 시각 비교 단위 테스트 14개 (b453727)
- [x] **골 기록 기본 정렬 등록순(created_at ASC)** — 최근 추가 순 → 경기 흐름 순 (ddd1af3)
- [x] **골 카드 드래그 정렬 + display_order 컬럼** — @dnd-kit 도입, 운영진 이상만 PUT `/api/goals/reorder`, optimistic UI + 실패 롤백 (ddd1af3, migration 00025)
- [x] **앱 복귀 자동 갱신 쿨타임 30초 → 10초** — 경기 끝나고 짧게 앱을 닫았다 열었을 때 즉시 반영 (d7f90c3)

### 접근성

- [x] ARIA 속성 전면 추가 (탭바, 투표, 정렬 헤더, 랜딩 섹션)
- [x] prefers-reduced-motion 미디어쿼리
- [x] focus-visible 스타일 (투표 버튼, 월 네비 등)
- [x] JSON-LD 구조화 데이터
- [x] 키보드 정렬 가능 테이블 헤더

### 디자인

- [x] 텍스트 최소 12px (65곳 교체)
- [x] 대시보드 Bento 그리드 레이아웃
- [x] 랜딩 스크롤 애니메이션 (IntersectionObserver)
- [x] 바텀시트 닫기 애니메이션
- [x] CTA 그라데이션 + 긴급성 프로그레션
- [x] 카드 border-radius 통일 + 카드 간격 gap-4 통일
- [x] 스켈레톤 shimmer 효과
- [x] 터치타겟 44px
- [x] ConfirmDialog Portal 적용
- [x] 랜딩페이지 디자인 전면 개선 (아이콘 추가, 스캔 애니메이션, 카드 비주얼, 연결선 등)

### 데이터

- [x] FK Rebirth 62경기 + 쿼터별 득실점 시드
- [x] 109개 골 실제 득점자/도움 매칭
- [x] 2011-2024 레거시 통계 441개
- [x] 활동/미가입/휴면 회원 90명 정리
- [x] 테스트 615개 통과 (37 파일)
- [x] 데모 팀 샘플 데이터 (경기 + 회비 84건 + 잔고)
- [x] 시즌FC 14경기 데이터 이관 (85골 + 56실점 + 196참석 + 11게스트)

---

## 미완료 — HIGH (현재 81팀 운영에 직접 영향)

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

- [ ] 중복/테스트 팀 정리 (골드문FC/골드문, fc_libre/FC.LIBRE) **[수동 SQL]**
- [ ] 활성 팀 CS 대응 — 피드백 수집 **[수동]**
- [ ] 실제 사용자 후기로 소셜프루프 교체 (실명 + 팀명) **[수동+개발]**
- [ ] 회비 선납 기능 (6개월/1년치 일괄 납부 처리)
- [x] OG 이미지 수치 업데이트 (50→81팀 사용 중)
- [ ] 선수 카드 디자인 개선 (FIFA 스타일) — **백엔드 v2 완료** (JSON variant, rarity/signature/rank/streak/isHero). v0 컴포넌트 `v0card/` 에 이식, 실제 페이지 wiring 남음
- [ ] 시즌 어워드 디자인 개선 (7종 시상) — **백엔드 v2 완료** (mvp/seasonSummary/context). v0 컴포넌트 이식 + 노출 경로 결정(/awards? 기록 탭 새 탭?) 남음
- [ ] 개인 커리어 프로필 디자인 개선 (/player/[id] 공개 페이지) — **백엔드 v2 완료** (bestMoments/ranks/streaks). v0 디자인 wiring 남음
- [x] 경기 종료 시간 필드 추가 (시작 시간 입력 시 +2시간 자동 설정, 수동 변경 가능)

## 미완료 — MEDIUM (팀 50개 이상 시)

### 기능
- [x] PK/FK 골 기록 기능 (골 유형 분류 — NORMAL/PK/FK/HEADER/OWN_GOAL)
- [ ] Play Store 등록 (TWA, $25) **[추후 과제]**
- [ ] 회원 벌크 사전등록 (CSV/다중 입력)
- [x] 팀 로고 파일 업로드 (URL → 업로드) — 이미 구현됨 (TeamLogo + 설정 페이지)
- [ ] 회비 월별 수지결산 대시보드 (수입/지출/잔고 추이)
- [ ] 회비 납부 현황 통계 (월별 납부율, 장기 미납자)
- [x] 벌금 관리 UI (penalty_rules CRUD) — 2026-04-11 점검 완료. DuesSettingsTab 내부 `PenaltyRulesSection`으로 구현됨 (C/R/D + is_active 토글). 규칙명·금액 직접 수정은 불가(삭제 후 재생성 필요)
- [ ] 회비 납부 현황 통계 차트 (월별 납부율 추이)
- [ ] 전적 전체 기록 모바일 카드 정보 밀도 축소 (기본 2항목 + 탭 확장)
- [x] 경기 일정 캘린더 뷰 (월간 달력에서 경기 있는 날 표시, 탭하면 상세)

### 마케팅/SEO
- [ ] guide.html → Next.js 라우트 마이그레이션
- [ ] GA4 커스텀 이벤트 확장 (데모 전환율, 가입 퍼널)

### 캘린더
- [ ] 한국 공휴일 표시 (하드코딩 또는 API, 날짜 코랄/빨강 강조)

### 풋살 특화
- [ ] 쿼터 라벨 개선 ("1Q" → "전반/후반" 옵션)

### 골 기록 순서 조정 (2026-04-11 완료 · 구현 노트)
- [x] 골 기록 기본 정렬을 등록 순(created_at ASC)으로 변경
- [x] 골 카드 길게 누르기(long-press 200ms)로 순서 재정렬
  - `supabase/migrations/00025_match_goals_display_order.sql` — display_order INT 컬럼 + 부분 인덱스 (**사용자가 Supabase 대시보드에서 직접 실행**)
  - GET 시 `display_order ASC (nullsFirst:false)` → fallback `created_at ASC`
  - PUT `/api/goals/reorder` 신규 — 운영진 이상만, matchId+goalIds 배열 순서대로 0,1,2... 할당
  - 프론트: @dnd-kit/core + @dnd-kit/sortable 도입, PointerSensor/TouchSensor delay 200ms
  - optimistic UI + 실패 시 롤백 + 에러 토스트
  - ℹ️ 마이그레이션 00025는 2026-04-11 Supabase 대시보드에서 실행 확인

### 포메이션 확장 (2026-04-10 옵션A 완료 후 남은 작업)
- [x] 축구 11인 포메이션 5종 추가 (4-1-4-1, 4-5-1, 5-3-2, 3-4-2-1, 4-3-2-1) — 2026-04-10 완료
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

## 미완료 — LOW (팀 100개 이상 시)

- [ ] 게시판 페이지네이션/무한스크롤
- [ ] 개별 선수 상세 통계 페이지
- [x] 라이트 모드 (야외 사용 대비) — 완료, ThemeProvider + 헤더 토글
- [ ] 벌금 관리 별도 페이지
- [ ] 데모 데이터 일일 자동 리셋 (Vercel Cron)
- [ ] 프리미엄 모델 설계
- [ ] 바이럴 공유 메커니즘 (결과 카드 워터마크)
- [ ] 다른 스포츠 확장 (농구, 배구)
- [ ] 실력 기반 자체전 팀 분배 (레이팅)
- [ ] 출석률 기반 자동 휴면 전환

## UX 관례 점검 (2026-03-31)

앱/PWA에서 사용자가 당연히 기대하는 UX 패턴 중 빠져있는 항목.

### HIGH (사용자 이탈에 직접 영향)

- [x] **헤더 탭 → 홈 이동**: 로고/팀명을 `<Link href="/dashboard">`로 감싸기
- [x] **풀-투-리프레시**: 브라우저/PWA 기본 동작으로 이미 지원됨 (Android Chrome)
- [x] **오프라인 상태 감지 + UI 알림**: `navigator.onLine` + 이벤트 리스너, 빨간 배너 표시

### MEDIUM (불편하지만 치명적이지 않음)

- [x] **이미지 로딩 placeholder**: 게시판 이미지에 animate-pulse skeleton 적용
- [x] **저장 안 한 변경사항 경고 확대**: 경기 등록 폼에 beforeunload 추가
- [x] **뒤로가기 버튼 일관성**: 경기 상세만 필요, 이미 구현됨
- [x] **페이지 전환 로딩 표시**: 탭 클릭 시 상단 loading-bar 애니메이션
- [x] **키보드 레이아웃 대응**: safe-area-inset-bottom 적용됨

### LOW (있으면 좋지만 급하지 않음)

- [ ] 탭 스와이프 전환 (경기 상세 5탭 좌우 스와이프)
- [ ] 햅틱/진동 피드백 (투표 시)
- [ ] 리스트 스와이프 삭제
- [ ] 롱프레스 컨텍스트 메뉴
- [ ] 정렬/필터 상태 URL 유지
- [ ] 검색 결과 텍스트 하이라이트
- [x] 알림/게시판 상대 시간 표시 — 이미 구현 (timeAgo 함수)
- [ ] 텍스트 크기 조절 UI
- [ ] 가로 모드 대응
- [ ] 페이지 전환 애니메이션 (라우트 전환 시 퇴장 효과)
- [ ] 폼 실시간 유효성 검사 (onChange 피드백)
- [ ] 새 콘텐츠 알림 배너 ("새 글이 있습니다")
- [ ] 스크롤 위치 복원 (뒤로가기 시)

## 보안/아키텍처 점검 (2026-04-04)

코드 기반 냉철한 분석 결과. 현재 규모(81팀 520명) 기준 시급성 판단 포함.

### CRITICAL (보안)

- [x] **세션 HMAC 서명 추가**: pm_session 쿠키가 서명 없는 JSON → 쿠키 조작으로 다른 사용자 위장 가능. 2026-04-10 HMAC-SHA256 서명 도입으로 완료. `SESSION_SECRET` 환경변수 필수. 상세 기록: `docs/security-session-hmac.md`
- [ ] **RLS Policy 작성**: RLS는 켜져 있지만 Policy가 0개. anon key가 클라이언트에 노출되어 있어 직접 DB 접근 시 전체 데이터 유출 가능.
  - **현재 규모에서 필요?**: YES — anon key + Supabase URL만 있으면 누구나 접근 가능. 하지만 Realtime 구독용으로만 사용 중이라 실질적 위험은 중간.

### HIGH (코드 품질)

- [ ] **대시보드 코드 중복 제거**: `getDashboardData.ts`(292줄)와 `/api/dashboard/route.ts`(244줄)가 거의 동일. API가 서버 함수를 호출하도록 변경.
  - **현재 규모에서 필요?**: YES — 한쪽 수정 시 다른 쪽 누락으로 이미 버그 경험.
- [ ] **API 입력 검증 (Zod)**: POST/PUT 라우트에 스키마 검증 없음. body를 직접 DB에 전달.
  - **현재 규모에서 필요?**: NICE TO HAVE — DB FK/CHECK 제약이 일부 방어 중. 팀 100개 이상 시 도입 권장.

### MEDIUM (유지보수)

- [ ] **TacticsBoard 1,270줄 분리**: 드래그/포메이션/이미지내보내기/쿼터관리가 하나에 혼재.
  - **현재 규모에서 필요?**: NO — 기능은 작동. 하프쿼터 등 추가 기능 넣을 때 분리 권장.
- [x] **console.log 프로덕션 잔존 정리** (2026-04-10): `dues/route.ts`, `ocr/route.ts`, `dues/excel/route.ts` 3개 라우트의 디버그 로그 제거. console.error는 유지(실제 오류 추적용). Vercel 로그에 입금자 이름·금액·OCR 텍스트 같은 개인정보가 남던 경로 차단.
- [ ] **next-auth 레거시 의존성 제거**: 실제로는 카카오 OAuth 직접 구현 사용. next-auth는 사용 안 함.
  - **현재 규모에서 필요?**: NICE TO HAVE — 번들에 영향은 없으나 정리 권장.

### 사업 관점 메모

- 수익화 시점: 최소 50~100 활성팀 + 3개월 리텐션 확인 후
- 바이럴: 팀→팀 확산 메커니즘 없음 (리그/교류전 기능 필요)
- 비시즌 리텐션: 경기 없으면 대시보드가 비어서 이탈 위험
- 운영비: 현재 $0~25/월, Supabase Pro 전환은 200~300팀 시점

## 기술 부채

- [ ] E2E 테스트 (Playwright, 인증된 플로우)
- [ ] 김선휘 하드코딩 역할전환 → DB admin 플래그
- [ ] OCR 다른 은행 포맷 지원 (토스, 신한 등)
- [ ] 차트 색상 토큰화 (PlayerRadarChart 하드코딩 hex)
- [ ] 컴포넌트 렌더링 테스트 부재 (React Testing Library 미사용)
- [ ] MatchesClient useState 17개 — 폼 상태 과다
