# 설정 모듈 컨텍스트

## 파일 구조

| 파일 | 역할 |
|------|------|
| `SettingsClient.tsx` | 탭 라우팅 컨테이너 |
| `TeamSettings.tsx` | 팀 설정 (870줄) — 로고, 팀명, 가입모드, 유니폼, 참가 신청 관리 |
| `PersonalSettings.tsx` | 개인 설정 — 알림, 프로필 |
| `SeasonManagement.tsx` | 시즌 생성/활성화/종료 |

## TeamSettings.tsx 주요 기능

- **로고 업로드**: `LogoUpload` 컴포넌트, react-easy-crop 크롭 포함 (완전 구현)
- **팀 검색 공개**: `isSearchable` 토글 → `PUT /api/teams`
- **스탯 기록 권한**: `statsRecordingStaffOnly` 토글
- **가입 모드**: `joinMode` (OPEN / INVITE / REQUEST) 토글
- **참가 신청 관리**: `join-requests` API — APPROVED / REJECTED 처리 (STAFF 이상)
- **유니폼 설정**: 홈/원정 저지 색상 + 번호 스타일

## 권한

- `canEditTeam` = `isPresident(role)` — 팀 설정 수정은 회장만
- `canManageRequests` = `isStaffOrAbove(role)` — 참가 신청 처리는 운영진 이상

## API

- `PUT /api/teams` — 팀 정보 수정
- `GET /api/teams/join-requests` — 참가 신청 목록
- `PUT /api/teams/join-requests/:id` — 신청 승인/거절
