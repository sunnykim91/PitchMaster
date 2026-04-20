---
title: Supabase 주간 백업 운영 가이드
summary: GitHub Actions 기반 주간 pg_dump 자동화 — 설정·확인·복원 절차
last_updated: 2026-04-19
related: [../docs/backlog/pending.md]
---

# Supabase 주간 백업 — 운영 가이드

Supabase 무료 플랜은 일일 백업 7일만 보존하므로, 추가 안전망으로
GitHub Actions에서 매주 `pg_dump` 를 실행해 Artifact 로 90일간 보관한다.

## 스케줄

- **매주 일요일 03:00 KST** (UTC 토요일 18:00) 자동 실행
- **수동 실행** 가능: GitHub → Actions → "Supabase Weekly Backup" → Run workflow

## 초기 설정 (1회)

### 1. Supabase Direct Connection URL 얻기

1. Supabase Dashboard → 프로젝트 선택
2. **Project Settings** → **Database** → **Connection string** 섹션
3. **URI** 탭 선택
4. **"Use connection pooling"** 은 **체크 해제** (Direct connection 사용 — pg_dump 요구사항)
5. 표시된 문자열 복사. 형식:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.<project-ref>.supabase.co:5432/postgres
   ```
   - `[YOUR-PASSWORD]` 는 Supabase 대시보드에서 설정한 DB 패스워드로 실제 치환

### 2. GitHub Secret 등록

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `SUPABASE_DB_URL`
4. Secret: 위에서 복사한 연결 URL (패스워드 포함)
5. **Add secret**

## 첫 실행 확인

1. GitHub → **Actions** 탭
2. **"Supabase Weekly Backup"** 클릭 → **Run workflow** → main 브랜치 선택 → Run
3. 약 2~3분 후 완료. 실패 시 로그 확인 (가장 흔한 실패: `SUPABASE_DB_URL` secret 미설정 또는 패스워드 오타)
4. 완료된 run 페이지 하단 **Artifacts** 섹션에 `supabase-backup-<timestamp>.sql.gz` 다운로드 가능

## 복원 절차 (실제 장애 발생 시)

### 로컬에서 검증만

```bash
# 1. artifact 다운로드 후 압축 해제
gunzip supabase_backup_20260419_030000_KST.sql.gz

# 2. 로컬 Postgres에 복원 테스트
createdb pitchmaster_restore_test
psql pitchmaster_restore_test < supabase_backup_20260419_030000_KST.sql

# 3. 검증 쿼리
psql pitchmaster_restore_test -c "SELECT COUNT(*) FROM matches;"
```

### 프로덕션 복원

**주의: 전체 복원은 현재 DB를 덮어쓰니 극단적 장애 시에만.**

방법 A — Supabase SQL Editor (Recommended):
1. 새 Supabase 프로젝트 생성 (기존 건드리지 말고)
2. Dashboard → SQL Editor → sql 파일 전체 붙여넣기 → Run
3. 검증 후 앱 환경변수를 새 프로젝트로 전환

방법 B — psql 직접 (위험):
```bash
psql "postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres" < dump.sql
```
기존 데이터 DROP 후 덮어씌움. 되돌리기 불가.

## 포함 / 제외 범위

- **포함**: `public` 스키마의 모든 테이블·인덱스·함수 (우리가 만드는 데이터 전체)
- **제외**:
  - `auth.*` (Supabase 관리 — 카카오 OAuth 사용자 매핑)
  - `storage.*` (Supabase Storage 버킷 — 이미지 파일 자체는 Supabase 복원 정책 의존)
  - `realtime.*`

Storage 이미지(프로필·게시판 첨부)는 이 백업에 포함 안 됨. 손실 나면 재업로드 필요.

## 비용·한도

- GitHub Actions 무료 티어: Public repo 무제한, Private 월 2,000분
- pg_dump + artifact 업로드 = 회당 약 2~3분
- Artifact 스토리지: Private repo 월 500 MB 무료 (이후 과금). 백업 파일 압축 후 수 MB 수준이라 연 52회 × 10MB ≈ 520MB — 한도 근접 시 retention-days 단축 고려

## 장기 보존 옵션 (필요 시)

Artifact 90일은 분기당 1회 수동 다운로드 + 개인 저장소 복사로 보완 가능.
연간 아카이빙 자동화가 필요하면:
- Cloudflare R2 (무료 10GB) + `aws s3 cp` workflow step
- 또는 별도 private repo 에 월 1회 commit

## 관련 항목

- [docs/backlog/pending.md](backlog/pending.md) — Supabase Pro 전환 필요 시점 논의 (W2#5)
- 마이그레이션 롤백 불가 문제 — DOWN 쿼리 없어 긴급 롤백 시 이 백업이 유일한 복구 수단
