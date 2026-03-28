# PitchMaster 개발 지시서

## 프로젝트 개요
한국 조기축구(아마추어 축구팀)를 위한 팀 관리 웹 애플리케이션

## 기술 스택
- **프론트엔드**: Next.js 16 (App Router) + React 19 + TypeScript + TailwindCSS 4
- **백엔드**: Next.js API Routes
- **DB**: Supabase (PostgreSQL)
- **인증**: 카카오 OAuth (커스텀 구현)
- **파일저장**: Supabase Storage
- **테스트**: Vitest (37 파일, 600+ 케이스)
- **배포**: Vercel (main push 시 자동 배포)
- **도메인**: pitch-master.app (Cloudflare DNS)
- **PWA**: Service Worker, Web Push (VAPID)

---

## 권한 구조 (3단계)

| 권한 | 설명 |
|------|------|
| 회장 | 모든 권한 (팀 설정, 회원 관리, 회칙 수정 등) |
| 운영진 | 대부분의 관리 권한 (경기 관리, 회비 관리, 회원 조회) |
| 평회원 | 기본 기능 (본인 정보, 경기 참석, 투표, 기록 조회) |

---

## 화면 구조

### 홈 화면 (대시보드)
- 다가오는 경기 일정 (가장 가까운 경기)
- 현재 진행 중인 투표 목록 (참석 투표, MVP 투표 등)
- 해야 할 일 알림 (MVP 투표 미완료 등)
- 최근 경기 결과 요약

### 메뉴 구조
1. 회비 관리
2. 경기 관리
3. 내 기록
4. 회원 관리
5. 회칙
6. 설정

---

## 상세 기능 명세

### 1. 회비 관리

#### 1.1 회비 기준 설정 (회장/운영진)
- 회비 유형별 금액 설정
  - 예: 직장인 월 2만원, 학생 월 1.5만원
- 선납 옵션 (6개월, 1년)
- 회비 기준 설명 텍스트 입력

#### 1.2 입출금 기록
- 스크린샷 업로드 방식 (카카오뱅크, 토스 등)
- 수동 입력도 가능 (날짜, 금액, 입금자, 메모)
- 회원별 납부 현황 조회
- 전체 회원 납부 현황 리스트

#### 1.3 회비 조회 (전체 회원)
- 본인 납부 내역 확인
- 전체 입출금 내역 열람 (투명성)

---

### 2. 경기 관리

#### 2.1 경기 일정 등록 (회장/운영진)
- 날짜, 시간, 장소
- 상대팀 (선택)
- 쿼터 수 (기본 4쿼터, 최대 6쿼터)
- 쿼터당 시간 (기본 25분 경기 + 5분 휴식)

#### 2.2 참석 투표
- 경기별 참석 여부 투표 (참석/불참/미정)
- 투표 마감일 설정
- 참석 예정 인원 실시간 확인

#### 2.3 스쿼드 편성 (회장/운영진)
- **전술판 UI**: 축구장 그림 위에 선수 드래그앤드롭 배치
- 참석 투표한 인원 중에서 선택
- 기본 포메이션 템플릿:
  - 4-4-2
  - 4-2-3-1
  - 4-3-3
  - 3-5-2
  - 3-4-3
  - 커스텀 포메이션 저장 가능
- **쿼터별 스쿼드**: 각 쿼터마다 다른 스쿼드 편성 가능
- 선수 포지션 표시 (GK, DF, MF, FW)

#### 2.4 경기 기록 (경기 시작 후)
- **골 기록**: 누구나 기록 가능
  - 득점자 선택
  - 실점도 기록 (상대팀 골)
  - 쿼터, 시간(분) 선택
- **어시스트 기록**: 누구나 기록 가능
  - 골과 연결하여 어시스트 선수 선택
- **MVP 투표**: 경기 종료 후
  - 해당 경기 참석자만 투표 가능
  - 1인 1표
  - 투표 마감 시간 설정

#### 2.5 경기 결과
- 최종 스코어
- 득점자/어시스트 목록
- MVP 선정 결과
- 쿼터별 스쿼드 기록

---

### 3. 내 기록 (본인 기록)

#### 3.1 개인 통계
- 총 골 수
- 총 어시스트 수
- MVP 선정 횟수
- 경기 참석률
- 시즌별 기록 분리

#### 3.2 선호 포지션
- 본인이 설정한 선호 포지션 표시
- 실제 출전 포지션 통계

#### 3.3 팀원 기록 조회
- 다른 팀원의 공개 기록 조회 (골, 어시스트, MVP)
- 팀 내 랭킹 (득점왕, 어시스트왕, MVP왕)

---

### 4. 회원 관리

#### 4.1 회원 정보 필드
- 이름 (필수)
- 나이/생년월일 (필수)
- 연락처 (필수)
- 선호 포지션 (필수) - GK/DF/MF/FW 중 복수 선택
- 주발 (필수) - 오른발/왼발/양발

#### 4.2 최초 로그인 플로우
1. 카카오 로그인
2. 회원 정보 입력 폼 (필수 정보 미입력 시 서비스 이용 불가)
3. 팀 가입 (초대 코드/링크)
4. 서비스 이용

#### 4.3 회원 정보 접근 권한
- **본인**: 본인 정보 조회/수정
- **운영진/회장**: 전체 회원 정보 조회 (민감 정보 포함)
- **평회원**: 다른 회원의 이름, 선호 포지션만 조회 가능

#### 4.4 회원 관리 (회장/운영진)
- 회원 목록 조회
- 권한 변경 (회장만)
- 회원 강제 탈퇴 (회장만)

---

### 5. 회칙

#### 5.1 회칙 등록/수정 (회장/운영진)
- 제목, 내용 (리치 텍스트)
- 카테고리 분류 (일반, 회비, 경조사, 기타)
- 등록일, 수정일 자동 기록

#### 5.2 회칙 예시
- 회비 규정
- 경조사 지원: "1년 이상 팀 소속 회원 본인/직계 경조사 시 5만원 화환/조화 지원"
- 운영 규정
- 제재 규정

#### 5.3 회칙 조회 (전체 회원)
- 전체 회칙 목록
- 카테고리별 필터

---

### 6. 설정

#### 6.1 개인 설정
- 프로필 수정
- 알림 설정 (이메일/웹 푸시)
- 로그아웃

#### 6.2 팀 설정 (회장만)
- 팀명 변경
- 팀 로고 업로드
- 초대 코드 관리
- 팀 삭제

---

## 추가 기능

### 출석 체크
- 경기 당일 실제 출석 체크 (QR코드 또는 수동)
- 참석 투표 vs 실제 출석 비교
- 출석률 통계

### 팀 초대 시스템
- 초대 링크 생성 (유효기간 설정)
- 초대 코드 입력
- 가입 승인 (자동/수동 선택)

### 시즌 관리
- 시즌 생성 (예: 2026 상반기)
- 시즌별 기록 분리
- 시즌 종료 시 통계 요약

### 게시판
- 자유게시판
- 사진 갤러리 (경기 사진)

### 알림 시스템
- 웹 푸시 알림
- 이메일 알림
- 알림 유형: 경기 일정 리마인더, 투표 마감 임박, MVP 투표 요청

### 경기 결과 공유
- 경기 결과 카드 이미지 자동 생성
- SNS 공유 기능

---

## DB 스키마 설계 (Supabase)

### teams
- id (uuid, PK)
- name (팀명)
- logo_url (팀 로고)
- invite_code (초대 코드)
- created_at

### users
- id (uuid, PK)
- kakao_id (카카오 고유 ID)
- name
- birth_date
- phone
- preferred_positions (배열: GK, DF, MF, FW)
- preferred_foot (RIGHT, LEFT, BOTH)
- profile_image_url
- created_at

### team_members
- id (uuid, PK)
- team_id (FK)
- user_id (FK)
- role (PRESIDENT, STAFF, MEMBER)
- joined_at

### seasons
- id (uuid, PK)
- team_id (FK)
- name (시즌명)
- start_date
- end_date
- is_active

### matches
- id (uuid, PK)
- team_id (FK)
- season_id (FK)
- opponent_name
- match_date
- location
- quarter_count (기본 4)
- quarter_duration (기본 25)
- break_duration (기본 5)
- status (SCHEDULED, IN_PROGRESS, COMPLETED)
- created_at

### match_attendance
- id (uuid, PK)
- match_id (FK)
- user_id (FK)
- vote (ATTEND, ABSENT, MAYBE)
- actually_attended (boolean)
- voted_at

### match_squads
- id (uuid, PK)
- match_id (FK)
- quarter_number
- formation (예: "4-4-2")
- positions (JSON: 선수별 위치 정보)

### match_goals
- id (uuid, PK)
- match_id (FK)
- quarter_number
- minute
- scorer_id (FK to users, null if opponent goal)
- assist_id (FK to users, nullable)
- is_own_goal (boolean)
- recorded_by (FK to users)
- created_at

### match_mvp_votes
- id (uuid, PK)
- match_id (FK)
- voter_id (FK to users)
- candidate_id (FK to users)
- created_at

### dues_settings
- id (uuid, PK)
- team_id (FK)
- member_type (예: "직장인", "학생")
- monthly_amount
- description

### dues_records
- id (uuid, PK)
- team_id (FK)
- user_id (FK, nullable for team expenses)
- type (INCOME, EXPENSE)
- amount
- description
- screenshot_url
- recorded_by (FK to users)
- recorded_at

### rules
- id (uuid, PK)
- team_id (FK)
- title
- content (text)
- category
- created_by (FK to users)
- created_at
- updated_at

### posts
- id (uuid, PK)
- team_id (FK)
- author_id (FK to users)
- title
- content
- category (FREE, GALLERY)
- created_at

### notifications
- id (uuid, PK)
- user_id (FK)
- team_id (FK)
- type
- title
- message
- is_read
- created_at

---

## 개발 우선순위

### Phase 1: 핵심 기능
1. 프로젝트 셋업 (Next.js, Supabase, 카카오 로그인)
2. 회원 가입/로그인 플로우
3. 팀 생성/가입
4. 경기 일정 등록/조회
5. 참석 투표

### Phase 2: 경기 관리
1. 스쿼드 편성 (전술판 UI)
2. 경기 기록 (골, 어시스트)
3. MVP 투표
4. 경기 결과 페이지

### Phase 3: 기록/통계
1. 개인 기록 페이지
2. 팀 통계/랭킹
3. 시즌 관리

### Phase 4: 회비/회칙
1. 회비 설정
2. 입출금 기록
3. 회칙 관리

### Phase 5: 부가 기능
1. 게시판
2. 알림 시스템
3. 경기 결과 공유 카드

---

## 참고 사항

- 카카오 개발자 계정 필요 (보유)
- 카카오 비즈니스 채널 미등록 → 알림톡 불가, 웹 푸시/이메일로 대체
- 추후 구독제 SaaS로 확장 고려하여 멀티테넌시 구조로 설계
- 모바일 웹 최적화 필수 (반응형 디자인)

---

## 실행 명령어

```bash
# 프로젝트 루트에서 실행
ultrawork 이 지시서를 바탕으로 PitchMaster 프로젝트를 구현해줘. Phase 1부터 순차적으로 진행해줘.
```
