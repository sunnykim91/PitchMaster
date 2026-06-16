/**
 * 외부 API fetch 타임아웃 래퍼.
 *
 * Why: 카카오 로컬 / OpenWeather 같은 외부 호출에 타임아웃이 없으면, 상대 서버가 느리거나
 *      응답을 안 줄 때 SSR·API 라우트가 무한 대기한다 (페이지 멈춤·서버리스 함수 점유 비용).
 *      지정 시간 초과 시 AbortController 로 요청을 중단 → 호출부의 try/catch 가 폴백 처리.
 *
 * 주의:
 * - Next.js fetch 캐시(`next: { revalidate }`)는 그대로 통과(스프레드). 캐시 HIT 시엔 실제
 *   네트워크가 없어 timer 만 정리된다.
 * - 호출부가 직접 signal 을 넘기는 케이스는 현재 없음. 넘기면 여기서 덮어쓴다.
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 2500,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
