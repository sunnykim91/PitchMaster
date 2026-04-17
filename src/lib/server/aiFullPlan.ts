import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage, extractTokenUsage } from "@/lib/server/aiUsageLog";
import { fetchHistoryBlock } from "@/lib/server/aiTacticsAnalysis";
import type { TacticsAnalysisInput } from "@/lib/server/aiTacticsAnalysis";

/**
 * Phase C — AI 풀 플랜 생성.
 *
 * 입력: 참석자 + 팀히스토리(자동 fetch) + 상대팀 + 매치타입
 * 출력: 쿼터별 다른 포메이션 + 슬롯-선수 배치 (JSON)
 *
 * 사용 시나리오: 감독이 "AI 최적 포메이션 (쿼터별 변경)" 체크옵션 활성화 시.
 * 체크 해제 상태에선 기존 룰 엔진 사용 (이 함수 호출 안 함).
 */

const MODEL = "claude-haiku-4-5";
const MAX_OUTPUT_TOKENS = 4000;
const TEMPERATURE = 0.4; // 구조화 출력이라 낮게 — 일관성 우선

const SYSTEM_PROMPT = `당신은 한국 아마추어 축구·풋살 동호회의 **수석 코치**입니다.
참석자 명단·각 선수 선호 포지션·팀 히스토리·상대팀 이력을 보고,
**쿼터별로 다른 포메이션과 배치**를 짜는 것이 임무입니다.

## 출력 규칙 (절대 엄수)

1. **순수 JSON 배열만** 반환. 마크다운 코드 블록·설명 절대 금지.
2. 배열 길이 = quarterCount (입력값과 동일).
3. 각 요소 스키마:
   \`\`\`
   {
     "quarter": 1,                    // 쿼터 번호 (1부터 시작)
     "formation": "4-3-3",            // 포메이션 이름
     "placement": [                   // 슬롯-선수 매핑 (10~11명 또는 풋살 5~6명)
       { "slot": "GK", "playerName": "홍길동" },
       { "slot": "CB1", "playerName": "김철수" },
       ...
     ],
     "note": "공격적 시작"            // 1줄 코칭 메모 (15자 이내)
   }
   \`\`\`

4. \`playerName\`은 입력 attendees의 이름과 **정확히 일치**.
5. 한 쿼터에 같은 선수 중복 배치 금지.
6. 응답 첫 글자 = \`[\`, 마지막 글자 = \`]\`.

## 편성 원칙

1. **선호 포지션 존중**: attendees[].preferredPosition 우선 활용. 다만 팀 밸런스를 위해 한두 명은 다른 포지션도 가능.
2. **체력 분배**: 4쿼터 동안 모든 선수가 합리적으로 출전. 1~2쿼터 풀타임 후 3쿼터 휴식 같은 패턴.
3. **포메이션 변화**: 쿼터마다 동일 or 다르게. 정답 없음. **상황에 맞게**.
   - 초반 공격적, 후반 수비적 (체력 고려)
   - 상대 압박 강하면 미드 보강 (4-4-2 → 4-3-3 같은 변화는 부적절, 미드 두꺼운 쪽)
   - 우리 팀 잘 쓰는 포메이션 우선 (히스토리 승률 참고)
4. **상대팀 약점 공략**: opponentHistory가 있으면 과거 패턴 반영.
5. **GK 고정**: 골키퍼는 4쿼터 동일 인물 권장 (실력 차 큰 선수 한 명).

## 팀 히스토리 활용

- 우리 팀 승률 높은 포메이션을 1~2 쿼터에 우선 배치
- 핵심 선수(playerPositionStats top)는 주력 포지션 유지
- 새 포메이션 시도는 1~2 쿼터로 제한 (3~4쿼터 검증된 것)

## 풋살 vs 축구 구분

- attendees 수가 5~6명 또는 placement.slot이 FIXO/ALA/PIVO 포함 → 풋살
- 풋살 포메이션: 1-2-1, 2-2, 3-1 등 (5인 기준)
- 축구 포메이션: 4-3-3, 4-4-2, 4-2-3-1, 5-3-2, 3-4-3 등

## 응답 형식

오직 JSON 배열만. 첫 글자가 \`[\`이고 마지막 글자가 \`]\`여야 함.
\`\`\`json 블록 감싸지 말 것.`;

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type QuarterPlan = {
  quarter: number;
  formation: string;
  placement: Array<{ slot: string; playerName: string }>;
  note?: string;
};

export type FullPlanResult = {
  plans: QuarterPlan[];
  source: "ai" | "rule";
  model?: string;
  error?: string;
};

/** JSON 배열 추출 (코드블록·설명 섞여도 안전) */
function extractJsonArray(raw: string): unknown[] | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const p = JSON.parse(trimmed);
      return Array.isArray(p) ? p : null;
    } catch {/* continue */ }
  }
  const blockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (blockMatch) {
    try {
      const p = JSON.parse(blockMatch[1].trim());
      return Array.isArray(p) ? p : null;
    } catch {/* continue */ }
  }
  const first = trimmed.indexOf("[");
  const last = trimmed.lastIndexOf("]");
  if (first >= 0 && last > first) {
    try {
      const p = JSON.parse(trimmed.slice(first, last + 1));
      return Array.isArray(p) ? p : null;
    } catch { /* fall through */ }
  }
  return null;
}

function normalizePlan(raw: unknown): QuarterPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const quarter = typeof r.quarter === "number" ? r.quarter : null;
  const formation = typeof r.formation === "string" ? r.formation : null;
  const note = typeof r.note === "string" ? r.note : undefined;
  if (quarter === null || !formation || !Array.isArray(r.placement)) return null;

  const placement = (r.placement as unknown[])
    .map((p) => {
      if (!p || typeof p !== "object") return null;
      const pp = p as Record<string, unknown>;
      const slot = typeof pp.slot === "string" ? pp.slot : null;
      const playerName = typeof pp.playerName === "string" ? pp.playerName : null;
      if (!slot || !playerName) return null;
      return { slot, playerName };
    })
    .filter((x): x is { slot: string; playerName: string } => x !== null);

  if (placement.length === 0) return null;
  return { quarter, formation, placement, note };
}

/** 룰 기반 fallback — 단순 1쿼터 placement 반복 */
function ruleBasedFallback(input: TacticsAnalysisInput): QuarterPlan[] {
  return Array.from({ length: input.quarterCount }, (_, i) => ({
    quarter: i + 1,
    formation: input.formationName,
    placement: input.placement.slice(0, 15),
    note: i === 0 ? "기본 편성" : "동일 유지",
  }));
}

export async function generateAiFullPlan(input: TacticsAnalysisInput): Promise<FullPlanResult> {
  const started = Date.now();
  const logBase = {
    feature: "tactics" as const,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    entityId: input.matchId ? `${input.matchId}:full-plan` : "full-plan",
  };

  if (!client) {
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_api_key" });
    return { plans: ruleBasedFallback(input), source: "rule", error: "API key not configured" };
  }

  const userContent = JSON.stringify({
    quarterCount: input.quarterCount,
    attendees: input.attendees.slice(0, 30),
    matchType: input.matchType,
    opponent: input.opponent ?? null,
    defaultFormation: input.formationName, // 참고용 (감독이 미리 선택한 기본 포메이션)
  });

  const historyBlock = await fetchHistoryBlock(input);

  const userMessage = historyBlock
    ? `다음은 우리 팀 최근 통계와 이번 경기 정보입니다. quarterCount만큼의 JSON 배열로 쿼터별 포메이션과 배치를 생성하세요. JSON만 반환.\n\n${historyBlock}\n\n## 이번 경기 정보\n${userContent}`
    : `다음 경기 정보로 quarterCount만큼의 JSON 배열로 쿼터별 포메이션과 배치를 생성하세요. JSON만 반환.\n\n${userContent}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const tokens = extractTokenUsage(response);

    if (!textBlock || textBlock.type !== "text") {
      await recordAiUsage({ ...logBase, source: "rule", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: "no_text_block" });
      return { plans: ruleBasedFallback(input), source: "rule", error: "no text block" };
    }

    const arr = extractJsonArray(textBlock.text);
    if (!arr || arr.length === 0) {
      console.warn("[aiFullPlan] JSON 파싱 실패. raw=", textBlock.text.slice(0, 200));
      await recordAiUsage({ ...logBase, source: "rule", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: "invalid_json" });
      return { plans: ruleBasedFallback(input), source: "rule", error: "invalid JSON" };
    }

    const plans = arr.map(normalizePlan).filter((p): p is QuarterPlan => p !== null);
    if (plans.length !== input.quarterCount) {
      console.warn(`[aiFullPlan] 쿼터 수 불일치: 기대 ${input.quarterCount}, 실제 ${plans.length}`);
      await recordAiUsage({ ...logBase, source: "rule", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: `quarter_mismatch_${plans.length}` });
      return { plans: ruleBasedFallback(input), source: "rule", error: `expected ${input.quarterCount} quarters, got ${plans.length}` };
    }

    await recordAiUsage({ ...logBase, source: "ai", model: MODEL, ...tokens, latencyMs: Date.now() - started });
    return { plans, source: "ai", model: MODEL };
  } catch (err) {
    console.error("[aiFullPlan] API 호출 실패:", err);
    await recordAiUsage({ ...logBase, source: "error", model: MODEL, latencyMs: Date.now() - started, errorReason: "api_error" });
    return { plans: ruleBasedFallback(input), source: "rule", error: String(err) };
  }
}
