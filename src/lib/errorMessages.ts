const errorMap: Record<string, string> = {
  "Unauthorized": "로그인이 필요합니다.",
  "Forbidden": "접근 권한이 없습니다.",
  "Not Found": "요청한 데이터를 찾을 수 없습니다.",
  "Internal Server Error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  "Bad Request": "잘못된 요청입니다.",
  "Conflict": "이미 존재하는 데이터입니다.",
  "Too Many Requests": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "Network Error": "네트워크 연결을 확인해주세요.",
  "Failed to fetch": "네트워크 연결을 확인해주세요.",
};

/** Map English/technical error messages to Korean user-friendly messages */
export function toKoreanError(error: string): string {
  // Check exact match
  if (errorMap[error]) return errorMap[error];
  // Check partial match
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(key.toLowerCase())) return value;
  }
  // If already Korean, return as-is
  if (/[\uAC00-\uD7AF]/.test(error)) return error;
  // Fallback
  return "오류가 발생했습니다. 다시 시도해주세요.";
}
