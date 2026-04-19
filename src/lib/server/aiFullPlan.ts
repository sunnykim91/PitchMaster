import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage, extractTokenUsage } from "@/lib/server/aiUsageLog";
import { fetchHistoryBlock } from "@/lib/server/aiTacticsAnalysis";
import type { TacticsAnalysisInput } from "@/lib/server/aiTacticsAnalysis";
import { formationTemplates } from "@/lib/formations";

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
     "quarter": 1,
     "formation": "4-2-3-1",          // 아래 **formationCatalog의 name과 정확히 일치**
     "placement": [                   // 아래 catalog.slots와 **정확히 같은 slot 라벨·개수**
       { "slot": "GK",  "playerName": "홍길동" },
       { "slot": "LB",  "playerName": "김철수" },
       ...
     ],
     "note": "공격적 시작"            // 1줄 코칭 메모 (15자 이내)
   }
   \`\`\`

4. **slot 이름은 입력 formationCatalog에서 제공된 라벨만 사용.**
   예: 4-2-3-1 catalog가 [GK, LB, LCB, RCB, RB, LDM, RDM, LAM, CAM, RAM, ST]라면
   placement에 **정확히 이 11개 slot만** 나와야 함.
   "CB1", "CB2", "CB3" 같은 임의 이름 **절대 금지**.

5. 각 쿼터의 placement 배열 길이 = 해당 formation의 slots 수.

6. \`playerName\`은 입력 attendees의 이름과 **정확히 일치**.
7. 한 쿼터에 같은 선수 중복 배치 금지.
8. 응답 첫 글자 = \`[\`, 마지막 글자 = \`]\`.

## 🔴 포메이션 모드 (입력 singleFormation 플래그로 분기)

### 모드 A — singleFormation=true (고정 포메이션 모드)
사용자가 이미 포메이션을 선택한 상태. **모든 쿼터 동일 formation(defaultFormation과 일치) 사용 필수**.
- 쿼터별 다양화 시도 금지 — 배치(선수 매칭)만 쿼터별로 다르게
- 선수 체력·로테이션 관점에서 같은 포메이션 안에서 포지션을 조정
- note는 "초반 공격 집중" 같이 배치/의도 설명

### 모드 B — singleFormation=false 또는 미지정 (자유 모드)
**"쿼터별 변경"이 핵심.** 4쿼터 모두 동일 포메이션은 **실패**.
- \`quarterCount >= 4\`면 **최소 2가지 서로 다른 포메이션** 사용 필수
- \`quarterCount == 2\`면 동일 허용 (체력 분배 이유 있을 때)
- 구체 패턴 예시:
  - 1Q: 4-3-3 (공격적 시작) / 2Q: 4-4-2 (미드 강화) / 3Q: 5-3-2 (수비) / 4Q: 4-3-3 (승부수)
  - 1Q: 4-2-3-1 (기본) / 2Q: 3-4-3 (측면 가속) / 3Q: 4-4-2 (피로 대응) / 4Q: 4-2-3-1 (안정)
- 한 가지 formation만 반복하려면 매우 분명한 근거 필요 (히스토리 승률 95%+ 등)

## 편성 원칙

1. **선호 포지션 존중**: attendees[].preferredPosition 우선 활용
2. **체력 분배**: 4쿼터 동안 모든 선수 합리적 출전. 1~2쿼터 풀타임 후 3쿼터 휴식 같은 패턴.
3. **포메이션 변화 가이드**:
   - 초반 공격적, 후반 수비적 (체력 고려)
   - 상대 압박 강하면 미드 두꺼운 쪽 (4-3-3 → 4-2-3-1)
   - 우리 팀 잘 쓰는 포메이션을 1~2쿼터에 배치 (히스토리 승률 참고)
4. **상대팀 약점 공략**: opponentHistory가 있으면 과거 패턴 반영 (없으면 일반 원칙만)
5. **GK 고정**: 골키퍼는 4쿼터 동일 인물 권장
6. **용병 배치**: attendees[].isGuest=true인 선수는 실력 미지수. 핵심 포지션(GK·중앙 수비 중심축·주공격수)보다는 선호 포지션에 맞춰 안전하게 배치. note에도 "용병 ○○ 적응 확인" 정도로만 서술.

## 🔴 쿼터별 가용 선수 (availableByQuarter) 엄수

입력에 \`availableByQuarter\` 객체가 있으면 **각 쿼터는 그 명단의 선수만 사용**. 이건 **운영진이 이미 출전 로테이션을 정해둔 것**이라 **절대 위반 금지**.

- 예: \`availableByQuarter[2] = ["김선휘","박철수","홍길동",...]\`이면 2쿼터 placement에는 이 이름들만 나올 수 있음
- 명단에 없는 선수를 해당 쿼터 placement에 넣으면 **실패 처리**
- \`availableByQuarter\`가 없거나 비어있으면 attendees 전체에서 자유 배치

## 팀 히스토리 활용

- 우리 팀 승률 높은 포메이션을 1~2쿼터에 우선 배치
- 핵심 선수(playerPositionStats top)는 주력 포지션 유지
- 새 포메이션 시도는 1~2쿼터로 제한, 3~4쿼터는 검증된 것

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

/**
 * 종목·인원별 formation catalog를 프롬프트용 JSON 배열로 변환.
 * AI가 이 slot 라벨만 사용하도록 명시.
 */
function buildFormationCatalog(sportType: "SOCCER" | "FUTSAL" | undefined, fieldCount: number | undefined) {
  const normalizedSport: "SOCCER" | "FUTSAL" = sportType ?? "SOCCER";
  const filtered = formationTemplates.filter((f) => {
    if (f.sportType !== normalizedSport) return false;
    if (fieldCount && f.fieldCount && f.fieldCount !== fieldCount) return false;
    return true;
  });
  return filtered.map((f) => ({
    name: f.name,
    slots: f.slots.map((s) => s.label),
  }));
}

/** placement가 formation catalog의 slots와 정확히 일치하는지 + 쿼터 가용성 + singleFormation 일관성 검증 */
function validatePlan(
  plan: QuarterPlan,
  catalog: ReturnType<typeof buildFormationCatalog>,
  availableByQuarter?: Record<number, string[]> | null,
  singleFormation?: { expected: string } | null,
): string | null {
  const fmt = catalog.find((c) => c.name === plan.formation);
  if (!fmt) return `unknown formation "${plan.formation}"`;
  // singleFormation 모드면 모든 쿼터가 지정 formation이어야 함
  if (singleFormation && plan.formation !== singleFormation.expected) {
    return `quarter ${plan.quarter}: expected "${singleFormation.expected}" (singleFormation), got "${plan.formation}"`;
  }
  const expected = new Set(fmt.slots);
  const got = new Set(plan.placement.map((p) => p.slot));
  if (expected.size !== plan.placement.length) {
    return `quarter ${plan.quarter}: expected ${expected.size} slots, got ${plan.placement.length}`;
  }
  for (const s of got) {
    if (!expected.has(s)) return `quarter ${plan.quarter}: unknown slot "${s}" for ${plan.formation}`;
  }
  // availableByQuarter 제약 검증: 해당 쿼터 명단에 없는 선수 배치 금지
  const allowed = availableByQuarter?.[plan.quarter];
  if (allowed && allowed.length > 0) {
    const allowedSet = new Set(allowed);
    for (const p of plan.placement) {
      if (!allowedSet.has(p.playerName)) {
        return `quarter ${plan.quarter}: "${p.playerName}" not in availableByQuarter`;
      }
    }
  }
  return null;
}

export async function generateAiFullPlan(input: TacticsAnalysisInput): Promise<FullPlanResult> {
  const started = Date.now();
  const logBase = {
    feature: "tactics" as const,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    matchId: input.matchId ?? null,
    entityId: input.matchId ? `${input.matchId}:full-plan` : "full-plan",
  };

  if (!client) {
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_api_key" });
    return { plans: ruleBasedFallback(input), source: "rule", error: "API key not configured" };
  }

  // formation catalog — AI가 사용 가능한 포메이션 + 정확한 slot 라벨 나열
  const catalog = buildFormationCatalog(input.sportType, input.playerCount);
  if (catalog.length === 0) {
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_catalog" });
    return { plans: ruleBasedFallback(input), source: "rule", error: "no formation catalog for sport/count" };
  }

  const userContent = JSON.stringify({
    quarterCount: input.quarterCount,
    attendees: input.attendees.slice(0, 30),
    matchType: input.matchType,
    opponent: input.opponent ?? null,
    defaultFormation: input.formationName,
    availableByQuarter: input.availableByQuarter ?? null,
    singleFormation: input.singleFormation ?? false,
  });
  const catalogBlock = `## formationCatalog (이 안에서만 formation + slots 선택)\n\n${JSON.stringify(catalog, null, 2)}`;

  const historyBlock = await fetchHistoryBlock(input);

  const hasAvailability = input.availableByQuarter && Object.keys(input.availableByQuarter).length > 0;
  const isSingle = input.singleFormation === true;
  const userMessage = [
    `다음은 formation catalog·팀 통계·이번 경기 정보입니다. quarterCount만큼의 JSON 배열로 쿼터별 포메이션과 배치를 생성하세요.`,
    `📌 반드시 formationCatalog의 slots 라벨을 그대로 사용 (임의 이름 생성 금지).`,
    isSingle
      ? `📌 singleFormation=true: 모든 쿼터를 defaultFormation(${input.formationName})으로 통일. 쿼터별 formation 변화 금지. 배치만 쿼터별로 달리하세요.`
      : `📌 4쿼터 중 최소 2가지 다른 포메이션 사용.`,
    hasAvailability ? `📌 availableByQuarter에 명시된 쿼터별 명단 외의 선수는 해당 쿼터에 절대 배치 금지.` : "",
    `JSON 배열만 반환.`,
    ``,
    catalogBlock,
    historyBlock ? `\n${historyBlock}` : "",
    `\n## 이번 경기 정보\n${userContent}`,
  ].filter(Boolean).join("\n");

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

    // 각 쿼터 검증: formation이 catalog에 존재 + slots가 catalog와 정확히 일치 + 쿼터 가용성 + singleFormation
    const warnings: string[] = [];
    const singleFormationConstraint = isSingle ? { expected: input.formationName } : null;
    for (const plan of plans) {
      const err = validatePlan(plan, catalog, input.availableByQuarter, singleFormationConstraint);
      if (err) {
        console.warn(`[aiFullPlan] 검증 실패: ${err}`);
        warnings.push(err);
      }
    }
    if (warnings.length > 0) {
      await recordAiUsage({ ...logBase, source: "rule", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: `validation_${warnings.length}` });
      return { plans: ruleBasedFallback(input), source: "rule", error: `validation failed: ${warnings.join("; ")}` };
    }

    // quarterCount >= 4인데 1가지 formation만 쓴 경우 경고 (실패 아님, 기록만).
    // singleFormation 모드일 땐 당연히 동일이므로 스킵.
    if (!isSingle && input.quarterCount >= 4) {
      const unique = new Set(plans.map((p) => p.formation));
      if (unique.size < 2) {
        console.warn("[aiFullPlan] 4쿼터 모두 동일 포메이션 — 권장 위반");
        await recordAiUsage({ ...logBase, source: "ai", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: "single_formation_used" });
        return { plans, source: "ai", model: MODEL };
      }
    }

    await recordAiUsage({ ...logBase, source: "ai", model: MODEL, ...tokens, latencyMs: Date.now() - started });
    return { plans, source: "ai", model: MODEL };
  } catch (err) {
    console.error("[aiFullPlan] API 호출 실패:", err);
    await recordAiUsage({ ...logBase, source: "error", model: MODEL, latencyMs: Date.now() - started, errorReason: "api_error" });
    return { plans: ruleBasedFallback(input), source: "rule", error: String(err) };
  }
}
