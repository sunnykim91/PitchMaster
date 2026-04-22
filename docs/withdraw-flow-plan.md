# 회원 탈퇴 플로우 설계

> **배경**: 2026-04-22 Explore 확인 결과, 탈퇴 API·UI 전무. 개인정보처리방침 제7조 "즉시 파기" 약속 이행 불가 상태. 출시 차단급 법적 리스크.

---

## 정책 결정

### 삭제 vs 보존 대상

| 테이블 | 처리 | 이유 |
|--------|------|------|
| `users` | **soft delete** (`deleted_at` 컬럼) → 14일 후 cron 으로 hard delete | 개인정보 즉시 파기 원칙, 14일은 실수 복구 여유 |
| `users.email` / `users.phone` / `users.birth_date` / `users.profile_image_url` | **즉시 NULL 처리** | 개인 식별 정보 즉시 제거 |
| `users.name` | **"탈퇴한 회원" 으로 치환** | 경기 기록에서 참조되니 NULL 불가 |
| `team_members` | **status='LEFT'** (기존 LEFT 상태 활용) | 팀 운영 데이터는 유지, 활성 멤버에서 제외 |
| `match_attendance`, `match_goals`(scorer_id, assist_id) | **유지** | 팀 경기 기록 = 팀 자산 (이용약관 제10조) |
| `dues_records`(user_id) | **user_id → NULL + note 에 '탈퇴자' 기록** | 회비 내역 감사 가능성 유지 |
| `push_subscriptions` | **즉시 삭제** | 더 이상 알림 받을 주체 없음 |
| `notifications` | **즉시 삭제** | 개인 알림 이력 |
| `posts`, `post_comments` (작성자) | **작성자명 "탈퇴한 회원" 치환 + 본문 유지** | 팀 커뮤니티 맥락 유지, 본인 식별 정보만 제거 |
| `match_mvp_votes`(voter_id) | **삭제** | 투표 익명성 유지, 투표자 식별 불가 |

### 14일 보류 기간 (Grace Period)
- `deleted_at` 설정 후 14일간 **로그인 시도 시 복구 옵션 제공** (카카오 재로그인 → "복구하시겠습니까?")
- 14일 경과 → cron 으로 hard delete

---

## 구현 체크리스트

### A. DB 마이그레이션
- [ ] `users.deleted_at` TIMESTAMPTZ nullable 컬럼 추가
- [ ] `users` 에 부분 인덱스 `CREATE INDEX users_active_idx ON users (id) WHERE deleted_at IS NULL`
- [ ] 모든 users 조회 쿼리에 `deleted_at IS NULL` 필터 추가 (또는 RLS 정책)

### B. API Route
- [ ] `POST /api/account/withdraw`
  - 카카오 세션 검증
  - 트랜잭션 안에서:
    1. `users.deleted_at = NOW()`
    2. `users.email = NULL, phone = NULL, birth_date = NULL, profile_image_url = NULL`
    3. `users.name = "탈퇴한 회원"`
    4. `team_members.status = "LEFT"` (해당 user 전체 팀)
    5. `push_subscriptions` 삭제
    6. `notifications` 삭제
    7. `dues_records` user_id → NULL
    8. `match_mvp_votes` 삭제
  - 세션 쿠키 destroy
  - 카카오 연결 해제 요청 (Kakao API `/v1/user/unlink` — 선택)
  - Response: 204

### C. UI
- [ ] `src/app/(app)/settings/PersonalSettings.tsx` 에 "계정 탈퇴" 버튼 추가 (로그아웃 아래)
- [ ] 2단계 확인 모달:
  - 1단계: "정말 탈퇴하시겠어요? 14일간 복구 가능합니다." → 확인
  - 2단계: "다시 한번 확인합니다. 팀 기록은 팀 자산으로 유지되고, 개인정보는 즉시 파기됩니다." → 탈퇴
- [ ] 탈퇴 성공 시 로그인 페이지로 redirect

### D. 복구 플로우 (선택, Grace Period)
- [ ] 카카오 로그인 시 `users.deleted_at IS NOT NULL && NOW() - deleted_at < INTERVAL '14 days'` 조건:
  - 복구 안내 페이지로 redirect
  - "복구하시겠습니까?" 확인
  - 복구 = `deleted_at = NULL` + 원본 이름 복원 (단, email/phone 등은 복원 불가 — 사용자가 재입력 필요)

### E. Cron 작업 (Hard Delete)
- [ ] `/api/cron/hard-delete-withdrawn` (Vercel Cron 매일 0시)
- [ ] `DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '14 days'`
- [ ] FK cascade 로 연관 데이터 정리 (또는 수동 삭제 순서 제어)

### F. 개인정보 정책 문서 반영
- [ ] `/privacy` 섹션 3 "14일 보류 기간" 명시 추가
- [ ] 섹션 7 "이용자의 권리" 에 탈퇴 경로 명시 ("설정 → 계정 탈퇴")

---

## 이번 세션 제공 범위

**긴급 수준 1**: 기본 API + UI 만 먼저 (2시간)
- POST /api/account/withdraw — soft delete 최소 구현
- PersonalSettings 에 버튼 + 단일 확인 모달

**본격 수준 2 (추후)**: 복구 플로우·cron·카카오 unlink (반나절)

---

## 주의사항

- **FK 의존성 확인 후 삭제 순서**: `dues_records.user_id` NULLable 인지 먼저 확인. NOT NULL 이면 마이그레이션 선행.
- **기존 LEFT 상태 멤버와 구분**: `team_members.status='LEFT'` 는 이미 "팀 나감" 의미로 쓰이는지 확인. 겹치면 별도 값 고려 (`WITHDRAWN`).
- **RLS 정책**: 탈퇴한 user 의 경기 기록을 다른 팀원이 조회해도 "탈퇴한 회원" 으로만 보이는지 검증 필요.
