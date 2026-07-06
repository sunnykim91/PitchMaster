# PitchMaster

조기축구/풋살 팀을 위한 스마트 운영 허브

## 주요 기능

- **경기 일정** — 등록, 참석 투표, 투표 마감 알림, 경기장 지도 링크
- **전술판** — 포메이션 배치, AI 자동 편성, 풋살 키퍼 로테이션, 전술 영상 편집
- **AI 기능** — AI 전술 코치 분석, AI 자동 편성 풀플랜, 통장 캡처 OCR 회비 인식 (Claude Haiku)
- **기록 관리** — 골/어시/MVP/출석률/수비 포인트 통계, 레이더 차트, 시즌 어워드
- **선수 평점·카드** — 상호 평점, FIFA 스타일 선수 카드, OVR
- **회비 관리** — 통장 캡처 OCR 자동 인식, 자동 계산, 납부 현황, 벌금/면제, 엑셀 내보내기
- **회원 관리** — 권한 체계 (회장/운영진/회원), 휴면 관리
- **게시판·팀 앨범** — 공지/자유 게시판, 투표, 댓글, 좋아요, 사진 갤러리
- **회칙** — 팀 규정 관리, 파일 첨부
- **푸시 알림** — 경기 등록, 투표 마감 리마인더 (Web Push + 네이티브 FCM)
- **PWA + Android 앱** — 홈 화면 추가, 오프라인 지원, Google Play 정식 출시

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS 4 |
| Backend | Supabase (PostgreSQL), Next.js API Routes |
| Auth | 카카오 OAuth |
| Testing | Vitest (58 파일, 905+ 테스트) |
| Deploy | Vercel (main push 시 자동 배포) |
| Domain | pitch-master.app (Cloudflare DNS) |
| PWA | Service Worker, Web Push (VAPID) |
| Analytics | GA4, Google Search Console |

## 시작하기

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 Supabase, 카카오, VAPID 키 설정

# 개발 서버
npm run dev

# 테스트
npx vitest run

# 빌드
npm run build
```

## 프로젝트 구조

```
src/
├── app/
│   ├── (app)/              # 인증 필요 페이지
│   │   ├── dashboard/      # 대시보드
│   │   ├── matches/        # 경기 일정 & 상세
│   │   ├── members/        # 회원 관리
│   │   ├── records/        # 기록/통계
│   │   ├── board/          # 게시판
│   │   ├── dues/           # 회비
│   │   ├── rules/          # 회칙
│   │   └── settings/       # 설정
│   └── api/                # API Routes (44+ 엔드포인트)
├── components/
│   ├── ui/                 # 공통 UI (Button, Card, Input 등)
│   ├── board/              # 게시판 컴포넌트
│   ├── charts/             # 차트 (레이더, 바)
│   ├── TacticsBoard.tsx    # 전술판
│   └── AutoFormationBuilder.tsx  # AI 포메이션
├── lib/
│   ├── server/             # SSR 데이터 페칭
│   ├── supabase/           # DB 클라이언트
│   └── ...                 # 유틸, 훅, 컨텍스트
└── __tests__/              # 테스트 (58 파일, 905+ 케이스)

supabase/migrations/        # DB 마이그레이션
public/
├── manifest.json           # PWA 매니페스트
└── sw.js                   # 서비스 워커
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 (클라이언트) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 (서버) |
| `KAKAO_CLIENT_ID` | 카카오 앱 REST API 키 |
| `KAKAO_CLIENT_SECRET` | 카카오 앱 시크릿 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오 JS SDK 키 (공유) |
| `SESSION_SECRET` | HMAC-SHA256 세션 서명 키 (30일 쿠키) |
| `NEXTAUTH_URL` | 앱 베이스 URL (OAuth 리다이렉트) |
| `ANTHROPIC_API_KEY` | Claude API 키 (AI 전술·자동편성·OCR) |
| `CLOVA_OCR_INVOKE_URL` / `CLOVA_OCR_SECRET_KEY` | 네이버 Clova OCR (회비 폴백) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | 웹 푸시 키 (VAPID) |
| `VAPID_CONTACT_EMAIL` | 웹 푸시 연락 이메일 |
| `FIREBASE_SERVICE_ACCOUNT` | 네이티브 FCM (Android 푸시) |
| `OPENWEATHERMAP_API_KEY` | 경기 날씨 |
| `CRON_SECRET` | Vercel Cron 인증 토큰 |

## 배포

main 브랜치에 push하면 Vercel이 자동으로 빌드 및 배포합니다.

```bash
git push origin main  # 자동 배포 트리거
```

## 라이선스

Private
