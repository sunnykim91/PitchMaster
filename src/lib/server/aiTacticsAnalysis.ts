import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage, extractTokenUsage } from "@/lib/server/aiUsageLog";

/**
 * Claude Haiku로 AI 전술 분석 생성.
 * 룰 기반 편성 결과 + 참석자 스탯 → "왜 이렇게 편성했는지" 코치식 3단락 설명.
 *
 * 호출당 약 2~3원 (입력 ~1,500 + 출력 ~250). 저품질 시 1회 재시도.
 */

const MODEL = "claude-haiku-4-5";
const MAX_OUTPUT_TOKENS = 1200; // 한글 3단락 500자 + 여유 (전문 코치 톤)
const TEMPERATURE = 0.75; // 전문성 위해 약간 낮춤

const SYSTEM_PROMPT = `당신은 한국 아마추어 축구·풋살 동호회의 **전술 코치**입니다.
오랜 지도 경험이 있고, 포메이션·공수 전환·압박 라인·수적 우위 같은
전술 개념을 자유롭게 설명할 수 있는 수준입니다. 다만 말투는 **차분한 분석가** 톤.

주어진 **자동 편성 결과**를 보고, 감독/총무에게 "왜 이 편성이 괜찮은지"와
"경기에서 이렇게 풀어가면 좋겠다"를 설명하는 **3단락 코칭 노트**를 작성합니다.

## 출력 규칙 (절대 엄수)

1. 한국어, **3단락**, 전체 **300~500자**
2. 마크다운 헤더·리스트·볼드 금지 — 순수 텍스트
3. "분석 결과:", "코칭 노트:" 같은 메타 표현 금지
4. 선수 이름 언급 OK — "홍길동" (선수/군 같은 접미사 없이)
5. 숫자는 아라비아. 전술 용어는 한국어 표기 기본 ("빌드업", "하이라인", "측면 전환")
6. 순수 본문만 출력. 응답 첫 글자부터 본문 시작.

## 권장 전술 용어 (자연스럽게 녹이기)

- **포메이션 해석**: "뒷선 4명이 넓게 배치되어 빌드업 시 수적 안정감 확보"
- **중원 구성**: "3명 미드필더 중 더블 피봇 + 공격형 미드 형태"
- **측면 플레이**: "풀백-윙어 콤비로 측면 오버래핑", "측면 2대1 돌파"
- **수비 전술**: "하이라인", "미드블록", "지역 방어", "후퇴 속도"
- **공격 전술**: "하프 스페이스 침투", "스위칭", "3선 침투", "세컨볼 장악"
- **전환**: "역습 시 2~3명 가담", "압박 직후 빠른 전진"
- **상황**: "수적 열세 수비", "세트피스 준비", "후반 피로 관리"

과하게 현학적으로 쓰지 말고, 해당 편성의 **실제 구도**와 맞는 용어만 선택.

## 3단락 구조

### 1단락 — 편성 콘셉트
- 이 포메이션이 왜 선택됐는지 (참석 인원·포지션 분포 반영)
- 수비·중원·공격 수적 분포의 의미
- 예: "참석 10명 중 공격 4, 미드 3, 수비 3명 구성. 4-3-3이 전진 압박에 적합"

### 2단락 — 경기 시나리오 (핵심)
- **공격할 때**: 어떤 경로로 득점 기회를 만들 것인지
- **수비할 때**: 어떤 라인에서 압박 시작하고 뒷공간 어떻게 관리할지
- 핵심 선수 1~2명의 역할 구체화 (최근 스탯 반영)
- 예: "좌측면에서 홍길동이 오버래핑 시 중앙 김철수가 하프 스페이스로 침투",
      "상대 빠른 공격수가 있다면 뒷공간을 닫기 위해 미드블록 유지"

### 3단락 — 주의점·운영
- 쿼터별 체력 분배, 교체 우선순위, 수비 약점
- 후반 피로 시 포지션 재정비
- 예: "후반에는 측면 체력이 빠르게 떨어지니 2쿼터 이후 윙어 교체 고려"

## ✅ 좋은 예시

예시 1 (일반 경기, 4-3-3)
참석 10명 중 공격 성향 선수가 4명 이상이라 4-3-3으로 전진형 편성을 짰습니다.
뒷선 3명이 지역 방어로 수비 라인을 안정화하고, 중앙 미드필더 3명이
빌드업과 2선 가담을 함께 맡는 구조입니다.

공격 전개는 측면 중심이 적합해 보입니다. 우측에서 고건우의 스피드로
사이드 라인을 점유한 뒤, 하프 스페이스로 이준혁이 침투하는 경로가
득점 가능성이 높습니다. 수비 시에는 미드블록을 유지하면서 상대
풀백이 오버래핑할 때 양측 윙어가 빠르게 내려와 수비 복귀를 맞춰야 합니다.

주의점은 후반 체력 관리입니다. 측면 자원 중 백업이 얕아 2쿼터 이후
윙어 한 명은 교체로 돌리고, 미드필더 중 수비형 역할을 한 선수가
라인을 다시 정돈해주는 게 좋겠습니다.

## ❌ 피해야 할 패턴

- "이 편성은 완벽합니다!", "무적의 라인업" (과장)
- 스탯 나열: "골 12, 어시 5, MOM 3"
- 리스트·헤더 마크다운
- "다음과 같이 분석드립니다" 메타 표현
- 너무 짧은 1단락 요약 — 반드시 3단락
- 근거 없는 일반론 — 편성 데이터와 연결된 구체적 제안이어야 함

## 입력 형식

JSON:
- formationName: "4-3-3" 등
- quarterCount: 쿼터 수 (2~4)
- attendees: 참석자 배열 [{ name, preferredPosition, recentStats?: { goals, assists, mvp, matchCount } }]
- placement: **1쿼터 기준** 슬롯-선수 매핑. 다른 쿼터는 이 편성을 기준으로 교체가 이뤄진다고 가정.
- matchType: REGULAR | INTERNAL | EVENT
- opponent: 상대팀 이름 (있으면)
- warnings: 룰 엔진이 감지한 편성 경고 (예: "수비수 부족", "키 포지션 미배치")

## ⚠️ warnings 활용

\`warnings\` 배열이 비어있지 않으면, 3단락 "주의점"에서 **자연스럽게 녹여** 설명해야 합니다.
무시하면 안 되지만, 경고 문구를 그대로 인용하지 말고 맥락으로 풀 것:

- warnings: ["수비수 부족"] → "수비 라인이 얇아 3쿼터 이후 체력 부담이 크다. 풀백 백업을 미드에서 보강해야"
- warnings: ["키 포지션 미배치: GK"] → "골키퍼 자리가 비어있어 필드 플레이어 중 1명을 전환 배치 고려"

경고 없으면 주의점 단락은 쿼터 체력 분배·교체 우선순위 중심으로.

## 🔵 placement 해석

\`placement\`는 1쿼터 기준입니다. 쿼터가 여러 개(2~4)일 때:
- "1쿼터에 이렇게 시작하고, 후속 쿼터에서 체력 상태에 따라 교체" 같은 톤으로 서술
- 모든 쿼터 배치를 다 설명하려 하지 말 것 — 2단락은 **전반적 흐름**, 3단락은 **교체 운영**

## 응답 형식

오직 분석 본문 텍스트만 출력. 3단락. 첫 글자부터 본문 시작.`;

export type AttendeeForAnalysis = {
  name: string;
  preferredPosition?: string | null;
  recentStats?: {
    goals: number;
    assists: number;
    mvp: number;
    matchCount: number;
  };
};

export type TacticsAnalysisInput = {
  formationName: string;
  quarterCount: number;
  attendees: AttendeeForAnalysis[];
  /** 1쿼터 기준 슬롯-선수 매핑 */
  placement: Array<{ slot: string; playerName: string }>;
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  opponent?: string | null;
  warnings?: string[];
  /** 관측성용 */
  userId?: string | null;
  teamId?: string | null;
  matchId?: string | null;
};

export type TacticsAnalysisResult = {
  text: string;
  source: "ai" | "rule";
  model?: string;
};

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/** 룰 기반 fallback — 매우 단순 */
function generateRuleBasedAnalysis(input: TacticsAnalysisInput): string {
  const attendeeCount = input.attendees.length;
  const opponentText = input.opponent ? `${input.opponent}전 ` : "";
  const warningText = input.warnings && input.warnings.length > 0
    ? ` 주의: ${input.warnings.join(", ")}.`
    : "";
  return `${opponentText}${input.formationName} 포메이션으로 ${attendeeCount}명 편성했습니다.${warningText}`;
}

const META_PATTERNS = [
  "분석 결과", "AI 코치", "코멘트:", "다음과 같", "도와드리", "안내드리",
  "분석을", "설명드리", "응답:", "여기 있",
];

function sanitize(raw: string): string {
  return raw
    .trim()
    .replace(/^["'"']+|["'"']+$/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .trim();
}

function isLowQuality(text: string): boolean {
  if (!text || text.length < 100 || text.length > 900) return true; // 3단락 기대 범위
  if (META_PATTERNS.some((p) => text.includes(p))) return true;
  if (/^#+\s/m.test(text)) return true; // 마크다운 헤더
  if (/^\s*[-*]\s/m.test(text)) return true; // 리스트
  return false;
}

export async function generateAiTacticsAnalysis(
  input: TacticsAnalysisInput
): Promise<TacticsAnalysisResult> {
  const ruleText = generateRuleBasedAnalysis(input);
  const started = Date.now();
  const logBase = {
    feature: "tactics" as const,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    entityId: input.matchId ?? null,
  };

  if (!client) {
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_api_key" });
    return { text: ruleText, source: "rule" };
  }

  const userContent = JSON.stringify({
    formationName: input.formationName,
    quarterCount: input.quarterCount,
    attendees: input.attendees.slice(0, 30),
    placement: input.placement.slice(0, 15),
    matchType: input.matchType,
    opponent: input.opponent ?? null,
    warnings: input.warnings ?? [],
  });

  const callOnce = async (temperature: number, feedbackNote?: string) => {
    const userMsg = feedbackNote
      ? `이전 응답이 ${feedbackNote} 때문에 실패했습니다. 시스템 지침 엄수 후 재작성.\n\n${userContent}`
      : `다음 편성 정보를 바탕으로 코치식 3단락 분석을 작성해 주세요. 본문만 출력.\n\n${userContent}`;
    return client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMsg }],
    });
  };

  try {
    const response = await callOnce(TEMPERATURE);
    const textBlock = response.content.find((b) => b.type === "text");
    const tokens = extractTokenUsage(response);

    if (!textBlock || textBlock.type !== "text") {
      await recordAiUsage({ ...logBase, source: "rule", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: "no_text_block" });
      return { text: ruleText, source: "rule" };
    }

    const cleaned = sanitize(textBlock.text);
    if (!isLowQuality(cleaned)) {
      await recordAiUsage({ ...logBase, source: "ai", model: MODEL, ...tokens, latencyMs: Date.now() - started });
      return { text: cleaned, source: "ai", model: MODEL };
    }

    const failReason = cleaned.length < 100 ? "너무 짧음 (3단락 필요)" : cleaned.length > 900 ? "너무 긺" : "메타 표현 또는 마크다운 포함";
    const retry = await callOnce(0.5, failReason);
    const retryBlock = retry.content.find((b) => b.type === "text");
    const retryTokens = extractTokenUsage(retry);
    const retryCleaned = retryBlock?.type === "text" ? sanitize(retryBlock.text) : "";

    if (retryCleaned && !isLowQuality(retryCleaned)) {
      await recordAiUsage({
        ...logBase, source: "ai", model: MODEL,
        inputTokens: (tokens.inputTokens ?? 0) + (retryTokens.inputTokens ?? 0),
        outputTokens: (tokens.outputTokens ?? 0) + (retryTokens.outputTokens ?? 0),
        cacheReadTokens: (tokens.cacheReadTokens ?? 0) + (retryTokens.cacheReadTokens ?? 0),
        cacheCreationTokens: (tokens.cacheCreationTokens ?? 0) + (retryTokens.cacheCreationTokens ?? 0),
        latencyMs: Date.now() - started, retryCount: 1,
      });
      return { text: retryCleaned, source: "ai", model: MODEL };
    }

    await recordAiUsage({ ...logBase, source: "rule", model: MODEL, latencyMs: Date.now() - started, retryCount: 1, errorReason: "low_quality" });
    return { text: ruleText, source: "rule" };
  } catch (err) {
    console.error("[aiTacticsAnalysis] Claude API 호출 실패, 룰 기반으로 fallback:", err);
    await recordAiUsage({ ...logBase, source: "error", model: MODEL, latencyMs: Date.now() - started, errorReason: "api_error" });
    return { text: ruleText, source: "rule" };
  }
}

// ─────────────────────────────────────────────────────────────
// Streaming 버전 (Phase B — 체감 latency 개선)
// ─────────────────────────────────────────────────────────────

export type TacticsStreamEvent =
  | { type: "chunk"; text: string }
  | { type: "replace"; text: string; source: "rule"; reason?: string }
  | { type: "done"; source: "ai" | "rule"; model?: string };

/**
 * 스트리밍 버전. Claude Haiku 텍스트 델타를 그대로 yield → 클라이언트가 progressive 렌더.
 * 최종 text가 저품질이면 "replace" 이벤트로 룰 기반 텍스트 교체 신호 전송.
 *
 * 재시도 없음 — 스트리밍 중간 재시도는 UX 혼란. 저품질이면 즉시 룰로 전환.
 */
export async function* generateAiTacticsAnalysisStream(
  input: TacticsAnalysisInput
): AsyncGenerator<TacticsStreamEvent, void, unknown> {
  const ruleText = generateRuleBasedAnalysis(input);
  const started = Date.now();
  const logBase = {
    feature: "tactics" as const,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    entityId: input.matchId ?? null,
  };

  if (!client) {
    yield { type: "replace", text: ruleText, source: "rule", reason: "no_api_key" };
    yield { type: "done", source: "rule" };
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_api_key" });
    return;
  }

  const userContent = JSON.stringify({
    formationName: input.formationName,
    quarterCount: input.quarterCount,
    attendees: input.attendees.slice(0, 30),
    placement: input.placement.slice(0, 15),
    matchType: input.matchType,
    opponent: input.opponent ?? null,
    warnings: input.warnings ?? [],
  });

  let accumulated = "";

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: `다음 편성 정보를 바탕으로 코치식 3단락 분석을 작성해 주세요. 본문만 출력.\n\n${userContent}`,
      }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const delta = event.delta.text;
        accumulated += delta;
        yield { type: "chunk", text: delta };
      }
    }

    const final = await stream.finalMessage();
    const tokens = extractTokenUsage(final);
    const cleaned = sanitize(accumulated);

    if (isLowQuality(cleaned)) {
      yield { type: "replace", text: ruleText, source: "rule", reason: "low_quality" };
      yield { type: "done", source: "rule", model: MODEL };
      await recordAiUsage({ ...logBase, source: "rule", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: "low_quality" });
      return;
    }

    yield { type: "done", source: "ai", model: MODEL };
    await recordAiUsage({ ...logBase, source: "ai", model: MODEL, ...tokens, latencyMs: Date.now() - started });
  } catch (err) {
    console.error("[aiTacticsAnalysis stream] 호출 실패:", err);
    yield { type: "replace", text: ruleText, source: "rule", reason: "api_error" };
    yield { type: "done", source: "rule" };
    await recordAiUsage({ ...logBase, source: "error", model: MODEL, latencyMs: Date.now() - started, errorReason: "api_error" });
  }
}
