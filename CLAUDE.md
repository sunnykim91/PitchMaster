# PitchMaster - Claude Code 프로젝트 설정

## 프로젝트 개요
- 풋살/축구 팀 관리 웹앱 (Next.js 15 + Supabase + TypeScript)
- 한국어 UI, 코드 주석은 한국어/영어 혼용
- 도메인: pitch-master.app (Cloudflare DNS + Vercel 배포)

## 기술 스택
- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS 4
- **Backend**: Supabase (PostgreSQL), Next.js API Routes
- **Testing**: Vitest (615+ 테스트)
- **Language**: TypeScript (strict mode)
- **PWA**: Service Worker + Web Push (VAPID)
- **인증**: 카카오 OAuth + 데모 모드
- **테마**: 라이트/다크 모드 (ThemeProvider, 기본 다크)

## 코드 작업 후 필수 워크플로우

코드 변경 작업을 완료한 후, 아래 순서를 반드시 실행합니다:

### 1. 테스트 실행
```bash
npx vitest run
```

### 2. 빌드 확인
```bash
npm run build
```

### 3. 커밋 & 푸시 (사용자가 요청한 경우)
```bash
git add <변경된 파일들>
git commit -m "<커밋 메시지>"
git push origin main
```
→ Vercel이 자동으로 프로덕션 배포

### 4. 문서 업데이트 (기능 추가/변경 시)
- `docs/improvement-backlog.md` — 완료 항목 체크, 신규 항목 추가
- `.claude/projects/.../memory/` — 관련 메모리 파일 업데이트

## 주의사항
- 테스트가 실패하면 빌드/커밋 진행하지 말고 먼저 수정
- 빌드가 실패하면 커밋하지 말고 먼저 수정
- 커밋 메시지는 한국어로 작성 (feat/fix/docs 접두어 사용)
- `.env` 파일이나 시크릿은 절대 커밋하지 않음
- 기능 변경 후 관련 문서(백로그, 메모리)도 반드시 업데이트

## 주요 데이터
- **등록 팀**: FCMZ (축구), FCMZ 풋살, FK Rebirth, FC서순, FC DEMO (데모), 시즌FC
- **데모 계정**: kakao_id=demo_kakao_id_pitchmaster, 팀=FC DEMO, 역할=회장
- **FK Rebirth 시즌**: 2024(1-12월), 2025(1-11월), 2026(12월-12월) — 다른 팀과 다름
- **시즌FC**: 34명, 14경기 데이터 이관 완료 (2026 시즌)
