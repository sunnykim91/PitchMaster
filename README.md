# PitchMaster

조기축구/풋살 팀을 위한 스마트 운영 허브

## 주요 기능

- **경기 일정** — 등록, 참석 투표, 투표 마감 알림
- **전술판** — 포메이션 배치, AI 자동 편성
- **기록 관리** — 골/어시/MVP/출석률 통계, 레이더 차트
- **회비 관리** — 자동 계산, 납부 현황, 엑셀 내보내기
- **회원 관리** — 권한 체계 (회장/운영진/회원), 휴면 관리
- **게시판** — 공지/자유 게시판, 투표, 댓글, 좋아요
- **회칙** — 팀 규정 관리, 파일 첨부
- **푸시 알림** — 경기 등록, 투표 마감 리마인더
- **PWA** — 홈 화면 추가, 오프라인 지원

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS 4 |
| Backend | Supabase (PostgreSQL), Next.js API Routes |
| Auth | 카카오 OAuth |
| Testing | Vitest (37 파일, 615+ 테스트) |
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
│   └── api/                # API Routes (25+ 엔드포인트)
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
└── __tests__/              # 테스트 (37 파일, 600+ 케이스)

supabase/migrations/        # DB 마이그레이션
public/
├── manifest.json           # PWA 매니페스트
└── sw.js                   # 서비스 워커
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 |
| `KAKAO_CLIENT_ID` | 카카오 앱 REST API 키 |
| `KAKAO_CLIENT_SECRET` | 카카오 앱 시크릿 |
| `NEXTAUTH_SECRET` | NextAuth 암호화 키 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 웹 푸시 공개 키 |
| `VAPID_PRIVATE_KEY` | 웹 푸시 비공개 키 |
| `CRON_SECRET` | Vercel Cron 인증 토큰 |

## 배포

main 브랜치에 push하면 Vercel이 자동으로 빌드 및 배포합니다.

```bash
git push origin main  # 자동 배포 트리거
```

## 라이선스

Private
