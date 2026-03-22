# PitchMaster - Claude Code 프로젝트 설정

## 프로젝트 개요
- 풋살/축구 팀 관리 웹앱 (Next.js 15 + Supabase + TypeScript)
- 한국어 UI, 코드 주석은 한국어/영어 혼용

## 기술 스택
- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS 4
- **Backend**: Supabase (PostgreSQL), Next.js API Routes
- **Testing**: Vitest
- **Language**: TypeScript (strict mode)

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

## 주의사항
- 테스트가 실패하면 빌드/커밋 진행하지 말고 먼저 수정
- 빌드가 실패하면 커밋하지 말고 먼저 수정
- 커밋 메시지는 한국어로 작성 (feat/fix/docs 접두어 사용)
- `.env` 파일이나 시크릿은 절대 커밋하지 않음
