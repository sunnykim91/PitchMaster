const errorMap: Record<string, string> = {
  // HTTP 표준
  "Unauthorized": "로그인이 필요합니다.",
  "Forbidden": "접근 권한이 없습니다.",
  "Not Found": "요청한 데이터를 찾을 수 없습니다.",
  "Internal Server Error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  "Bad Request": "잘못된 요청입니다.",
  "Conflict": "이미 존재하는 데이터입니다.",
  "Too Many Requests": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "Network Error": "네트워크 연결을 확인해주세요.",
  "Failed to fetch": "네트워크 연결을 확인해주세요.",
  // 인증·세션
  "Session expired": "로그인이 만료되었습니다. 다시 로그인해주세요.",
  "Invalid token": "로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.",
  // 권한
  "permission denied": "권한이 없습니다.",
  "insufficient permission": "이 작업을 수행할 권한이 없습니다.",
  // 입력 검증
  "validation failed": "입력값을 다시 확인해주세요.",
  "invalid input": "입력값이 올바르지 않습니다.",
  "required field": "필수 입력값이 비어있습니다.",
  // 중복·존재
  "already exists": "이미 등록된 항목입니다.",
  "duplicate": "이미 등록된 항목입니다.",
  "already voted": "이미 투표하셨습니다.",
  // 상태
  "expired": "만료된 항목입니다.",
  "deadline passed": "마감 시간이 지났습니다.",
  "vote closed": "투표가 마감되었습니다.",
  // 한도
  "rate limit": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "quota exceeded": "사용 한도를 초과했습니다.",
  "limit exceeded": "한도를 초과했습니다.",
  // 도메인
  "match not found": "경기를 찾을 수 없습니다.",
  "team not found": "팀을 찾을 수 없습니다.",
  "member not found": "회원을 찾을 수 없습니다.",
  "cannot delete": "이 항목은 삭제할 수 없습니다.",
  "cannot demote yourself": "본인을 강등할 수 없습니다.",
};

/** Map English/technical error messages to Korean user-friendly messages */
export function toKoreanError(error: string): string {
  // Check exact match
  if (errorMap[error]) return errorMap[error];
  // Check partial match (case-insensitive)
  const lower = error.toLowerCase();
  for (const [key, value] of Object.entries(errorMap)) {
    if (lower.includes(key.toLowerCase())) return value;
  }
  // If already Korean, return as-is
  if (/[가-힯]/.test(error)) return error;
  // Fallback
  return "오류가 발생했습니다. 다시 시도해주세요.";
}
