// PitchMaster 플랫폼 운영자(전체 서비스 admin) 식별 — 팀 역할(PRESIDENT 등)과는 별개.
//
// ⚠️ 닉네임(user.name)은 사용자가 자유롭게 변경 가능 → 이름으로 권한을 주면
//    누구나 "김선휘"로 개명해 admin·운영공지 권한을 탈취할 수 있음 (권한 상승 취약점).
//    변경 불가능한 user.id 로 식별한다.
//
// 추가/변경 시 이 배열만 수정. (향후 is_admin 컬럼/env 도입 시 이 함수만 바꾸면 됨)
const PLATFORM_ADMIN_USER_IDS: readonly string[] = [
  "7bc8a1b2-7844-41f3-b592-05a2c38f8085", // 김선휘 (운영자)
];

export function isPlatformAdmin(userId: string | null | undefined): boolean {
  return !!userId && PLATFORM_ADMIN_USER_IDS.includes(userId);
}
