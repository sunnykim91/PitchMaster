/**
 * AI 프롬프트에 사용자 입력을 안전하게 삽입하기 위한 sanitization 헬퍼.
 *
 * 방어 대상:
 * 1. 시스템 명령 인젝션: "이전 지시 무시", "ignore previous", "system:", "[INST]" 등
 * 2. 격리 마커 escape: 사용자 데이터를 `<user_data>`로 감쌀 때 사용자가 `</user_data>`로 빠져나가는 시도
 * 3. 과도한 길이: 토큰 폭탄·비용 폭증 차단
 * 4. 제어문자: 모델 토크나이저 교란
 *
 * 사용:
 *   - JSON.stringify 직전: `sanitizePromptObject(data)` — 객체 내 모든 string 재귀 정제
 *   - 단일 string 직접 삽입: `sanitizePromptText(text)`
 *   - 격리 영역 감싸기: `wrapUserData(text, "label")`
 */

const DEFAULT_MAX_TEXT_LEN = 200;

const SUSPICIOUS_PATTERNS: RegExp[] = [
  // 영문 시스템 지시 무시 시도
  /\b(ignore|disregard|forget|skip)\s+(previous|all|prior|above|the)\s+(instructions?|prompts?|rules?|messages?)/gi,
  // 한글 동일 의도
  /이전\s*(지시|명령|프롬프트|규칙)[을를]?\s*(무시|잊)/g,
  // 메타 prompt 마커
  /\[INST\]|\[\/INST\]/gi,
  /<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>/gi,
  // 행 시작의 "system:" 류
  /^\s*(system|assistant|user)\s*:/gim,
  // 우리가 쓰는 격리 마커 escape 시도 (closing tags)
  /<\/(user_data|user_input|system_data|system_instruction|context)>/gi,
];

/** 단일 string 정제 — 길이 제한 + 제어문자 제거 + 의심 패턴 무력화. */
export function sanitizePromptText(input: unknown, maxLen = DEFAULT_MAX_TEXT_LEN): string {
  if (input == null) return "";
  let text = String(input);

  // 길이 제한 (이름·메모 등 user-text는 200자 이내 충분)
  if (text.length > maxLen) text = text.slice(0, maxLen) + "…";

  // 제어문자 제거 (LF/CR/Tab 보존)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 의심 패턴 — 차단(단어 일부 *로 치환)으로 의도 무력화. 차단 자체가 시스템 인지 가능
  for (const pat of SUSPICIOUS_PATTERNS) {
    text = text.replace(pat, (m) => m.replace(/[A-Za-z가-힣]/g, "*"));
  }

  return text.trim();
}

/** 객체/배열 deep walk — 모든 string 필드를 sanitize. JSON.stringify 직전에 호출. */
export function sanitizePromptObject<T>(obj: T, maxLen = DEFAULT_MAX_TEXT_LEN): T {
  if (obj == null) return obj;
  if (typeof obj === "string") return sanitizePromptText(obj, maxLen) as unknown as T;
  if (typeof obj === "number" || typeof obj === "boolean") return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => sanitizePromptObject(v, maxLen)) as unknown as T;
  }
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = sanitizePromptObject(v, maxLen);
    }
    return out as T;
  }
  return obj;
}

/** 사용자 데이터를 격리 마커로 감싸 system/user prompt에 삽입. */
export function wrapUserData(data: string, label = "user_data", maxLen = DEFAULT_MAX_TEXT_LEN): string {
  const safe = sanitizePromptText(data, maxLen);
  return `<${label}>\n${safe}\n</${label}>`;
}
