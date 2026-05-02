// 사용자 입력 텍스트(이름·팀명 등) 안전성 검증.
// SQL/스크립트 인젝션 payload가 닉네임·팀명으로 저장되는 것을 차단한다.
// (DB는 파라미터 바인딩으로 안전하지만, 운영 표시·AI 프롬프트 경로에서 노출되는 것을 막기 위함)

const DANGEROUS_PATTERN = /['"\\<>;]|--|\/\*|\*\//;
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;
// 의미있는 문자 = 한글 완성형(가-힣) + 영문 + 숫자
// 자음/모음 자모(ㄱ-ㅎ, ㅏ-ㅣ)는 의미 없는 입력으로 간주해 거부
const MEANINGFUL_CHAR = /[가-힣a-zA-Z0-9]/;

export type SafeNameResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

export type SafeNameOptions = {
  maxLength: number;
  minLength?: number;
  fieldLabel?: string;
  // true 시 한글/영문/숫자가 최소 1자 이상 포함되어야 함 (특수문자만으로 구성된 이름 거부)
  requireMeaningful?: boolean;
};

export function validateSafeName(
  input: unknown,
  options: SafeNameOptions,
): SafeNameResult {
  const label = options.fieldLabel ?? "이름";
  if (typeof input !== "string") {
    return { ok: false, reason: `${label}은 문자열이어야 합니다` };
  }
  const trimmed = input.trim();
  const min = options.minLength ?? 1;
  if (trimmed.length < min) {
    return {
      ok: false,
      reason:
        min > 1
          ? `${label}은 최소 ${min}자 이상이어야 합니다`
          : `${label}을 입력해주세요`,
    };
  }
  if (trimmed.length > options.maxLength) {
    return { ok: false, reason: `${label}은 ${options.maxLength}자 이하로 입력해주세요` };
  }
  if (DANGEROUS_PATTERN.test(trimmed)) {
    return { ok: false, reason: `${label}에 사용할 수 없는 특수문자가 포함되어 있습니다` };
  }
  if (CONTROL_CHARS.test(trimmed)) {
    return { ok: false, reason: `${label}에 사용할 수 없는 제어 문자가 포함되어 있습니다` };
  }
  if (options.requireMeaningful && !MEANINGFUL_CHAR.test(trimmed)) {
    return { ok: false, reason: `${label}에 한글·영문·숫자가 최소 1자 이상 필요합니다` };
  }
  return { ok: true, value: trimmed };
}

// 카카오 OAuth 콜백 전용. 카카오 닉네임은 사용자가 외부에서 자유롭게 설정 가능하므로
// 거부하는 대신 안전하지 않으면 fallback("사용자")으로 치환해 저장한다.
// 사용자는 이후 온보딩 단계에서 본인 이름을 다시 입력하게 된다.
export function sanitizeKakaoNickname(
  input: string | null | undefined,
): string {
  if (!input || typeof input !== "string") return "사용자";
  const trimmed = input.trim();
  if (trimmed.length === 0) return "사용자";
  if (DANGEROUS_PATTERN.test(trimmed)) return "사용자";
  if (CONTROL_CHARS.test(trimmed)) return "사용자";
  // 의미있는 문자(한글 완성형/영문/숫자) 1자도 없으면 fallback (자모만 닉네임 등)
  if (!MEANINGFUL_CHAR.test(trimmed)) return "사용자";
  if (trimmed.length > 20) return trimmed.slice(0, 20);
  return trimmed;
}
