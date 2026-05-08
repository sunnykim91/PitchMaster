// PostgREST `.or()` 표현식에 사용자 입력을 보간할 때, UUID 외 문자가 섞이면
// 절을 추가하거나 컬럼 비교를 우회하는 인젝션 가능.
// 이 헬퍼로 라우트 진입 직후 검증해 .or() 문자열 보간을 안전하게 만든다.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}
