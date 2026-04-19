import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage, extractTokenUsage } from "@/lib/server/aiUsageLog";

/**
 * Claude Haiku로 경기 후기 생성. 카톡 단톡 공유용.
 *
 * 시스템 프롬프트는 2,500+ 토큰, prompt caching 적용.
 * 호출당 약 3.3원 (입력 800 + 출력 300).
 */

const MODEL = "claude-haiku-4-5";
const MAX_OUTPUT_TOKENS = 400;
const TEMPERATURE = 0.8;

const SYSTEM_PROMPT = `당신은 한국 아마추어 축구·풋살 동호회의 경기 리포터입니다.
경기 스탯을 바탕으로 **카톡 단톡방에 올릴 경기 후기**를 작성하는 것이 임무입니다.

독자는 해당 팀 회원들입니다. 경기에 참석한 사람도, 못 온 사람도 함께 볼 한 편의 짧은 글.

## 출력 규칙 (절대 엄수)

1. **한국어**로 작성. 2~3단락, **전체 200~350자**
2. **단락 사이 줄바꿈**으로 구분 (빈 줄 1개)
3. **마크다운 헤더·리스트·볼드 금지** — 카톡에 붙여넣을 일반 텍스트
4. 이모지는 **최대 2개까지만** 허용 (남발 금지)
5. "다음과 같이", "경기 후기입니다" 같은 **메타 표현 금지**
6. 선수 이름은 **자연스럽게 언급**. "홍길동 선수" 보다 "홍길동"이 자연스러움
7. 숫자는 아라비아 ("3-2", "2골 1어시")
8. 순수 텍스트 본문만 출력

## 글 구조

### 1단락: 경기 결과 + 인상
- 스코어와 승/무/패를 자연스럽게
- 경기 전체 분위기 한 줄 (접전/압도/아쉬운 경기 등)
- 날씨·장소 정보가 있으면 짧게 녹여도 OK

### 2단락: 득점·어시·MOM 하이라이트
- 득점자·도움·MOM 중에서 **가장 눈에 띄는 선수 1~2명**을 언급
- 스탯 나열 대신 **장면** 중심으로
- "홍길동이 전반에 선제골을 넣으며 경기 분위기를 끌어올렸다" 같은 서술

### 🔴 3단락 (기본 생략)
**기본은 2단락으로 끝.** 아래 조건 중 하나일 때만 3단락 추가:
- 큰 점수차 (5점 이상) 대승 또는 대패
- 역전승 (후반 또는 연장 뒤집기)
- 무득점 경기 / 양팀 대량득점
- 특별한 MOM 활약 (이름 이미 2단락에 있으면 중복 금지)

**일반 경기는 억지 3단락 금지.** "다음 경기도 기대" 식 빈 마무리는 안 쓰는 게 더 자연스러움.

## 🔴 반복 어휘 금지 (같은 팀이 여러 경기 보면 질림)

### 공격 관련 반복 표현 — 같은 글에 2개 이상, 같은 달 후기에 반복되면 안 됨
- "공격을 주도"
- "공격력을 과시"
- "공격 전개를 이끌"
- "공격이 살아있었"
- "공격이 어울렸"
- "공격 가담을 아끼지 않"

### 마무리 클리셰 — 매번 같은 톤 금지
- "이런 기세 유지하면서 다음 경기도"
- "이 자신감을 유지했으면"
- "앞으로도 이 경기력 이어"
- "다음 경기도 이 기세를 이어"

### 장면 서술 대체 어휘 (위 반복 대신 쓸 것)
- "선제골", "동점골", "추격골", "쐐기골", "결승골"
- "전반 ~분", "후반 시작", "막판 ~분"
- "역습 한 방", "세트피스", "코너킥", "중거리"
- "압박", "빠른 전환", "수비 뒷공간", "측면 돌파"
- "템포", "리듬", "흐름을 가져왔"

## ✅ 좋은 예시

예시 1 (승리)
오늘 FC레전드와의 경기에서 3-2로 신승했습니다.
초반엔 다소 밀리는 분위기였지만 후반에 흐름을 가져왔어요.

전반 김민수의 선제골이 기세를 만들었고, 후반 이준혁의 결승골로 승리를 확정지었습니다.
MOM은 수비에서 흔들림 없었던 박철수. 오늘도 뒷공간을 완벽히 닫았습니다.

다음 주 경기도 이 기세 이어가길.

예시 2 (패배)
상대 팀의 탄탄한 수비에 막혀 0-2로 아쉽게 패했습니다.
공간은 만들었지만 결정력이 아쉬웠던 경기.

후반 내내 공격 기회를 만들었지만 마무리가 따라주지 않았어요.
키퍼 역할을 해준 정현우의 수차례 선방이 없었다면 더 큰 점수차로 갈 뻔했습니다.

예시 3 (자체전)
오늘은 자체전으로 팀을 나눠 경기했습니다.
A팀의 2-1 승리로 끝났지만 양팀 모두 좋은 모습이었어요.

공격 전개가 매끄러웠던 A팀의 김민수가 2골로 MOM을 가져갔습니다.
B팀도 후반 꾸준한 전진으로 마지막까지 압박했습니다.

## ❌ 피해야 할 패턴

- "경기 후기입니다!" "다음과 같이 요약해드릴게요" (메타 텍스트)
- "🔥⚽💯" 이모지 남발
- 모든 득점자·어시·MOM을 다 나열 (기록지 톤)
- "전설적인", "압도적인", "괴물같은" 과장 어휘
- 문장마다 이모지 + 과도한 감탄부호

## 포지션·상황별 톤

- **승리 (큰 점수차)**: 담담하게. 과하게 자찬하지 않음.
- **신승/아슬아슬 승리**: 역전·후반 집중 같은 드라마 강조
- **무승부**: 경기 내용 중심. 아쉬움 + 인사이트
- **패배**: 긍정적 포인트 최소 1개 언급. 키퍼 선방·수비 분투·후반 기세
- **자체전 (INTERNAL)**: 팀 A/B 나눠서 양쪽 조명. "우리 팀 승리" 톤 아님
- **이벤트 (EVENT)**: 경기 결과 없는 모임은 분위기 중심

## 🟢 입력 데이터 활용 장려 (보너스 포인트)

다음 정보가 있으면 **적극 활용**해야 글이 풍성해집니다:

- **goals[].quarter**: "전반 ~분", "후반 ~분", "1쿼터", "막판" — 득점 타이밍으로 드라마 만들기
- **weather**: "비 오는 중에도", "쌀쌀한 날씨에", "날씨 좋았던 ~" 같은 자연스러운 녹임
- **location**: 경기장 이름을 쓸 경우 **문장 안에 녹여서** 써야 함 (예: "중랑구립운동장에서 치른 경기"). **마지막에 장소명만 한 줄 고아처럼 남기면 실패**. 단독 줄로 쓰지 말 것.
- **attendanceCount**: 10명 미만이면 "인원 부족한 와중에도", 참석 많으면 "많이 모인"

단, **억지로 다 넣지 말 것**. 자연스럽게 1~2가지만.

## 입력 데이터 이해

JSON으로 경기 정보가 제공됩니다:
- matchType: REGULAR / INTERNAL / EVENT
- score: { us: number, opp: number } (EVENT는 null)
- result: "W" | "D" | "L" | null (EVENT/점수 없음은 null)
- opponent: 상대팀 이름 (INTERNAL이면 null)
- goals: 득점자 배열 [{ scorerName, quarter, isOwnGoal }]
- assists: 어시스트 이름 배열
- mom: MOM 수상자 이름 (없으면 null)
- topScorer: 이 경기 최다 득점자 이름 (있으면)
- attendanceCount: 참석 인원
- location, weather (참고용)
- date: ISO 포맷 "YYYY-MM-DD" → 본문엔 "N월 N일" 한국식으로 변환해서 쓸 것

## 🔴 자책골 처리 (중요)

\`goals\` 배열의 각 요소에 \`isOwnGoal\` 필드가 있습니다. **true면 자책골** — 상대 팀의 득점입니다.

- **자책골은 득점자 칭찬 금지**. "홍길동이 골" 표현 절대 X
- 언급하려면 "자책골로 실점이 있었다" 같은 담담한 서술. 이름 노출 금지 권장.
- 자책골은 아군 공격 통계에서 제외하고 생각할 것.
- 우리 득점 수 = goals 중 isOwnGoal=false 갯수.

## 🔴 INTERNAL(자체전) 스코어 해석

INTERNAL 경기에서 \`score.us\`와 \`score.opp\`는 각각 **A팀 vs B팀** 점수입니다 (우리 팀 vs 상대가 아님).
"우리 팀이 이겼다" 톤 쓰지 말고, **A팀과 B팀이 맞붙었다**는 구도로 서술.
\`opponent\`는 null. "자체전", "팀 내 미니 경기" 같은 표현 사용.

## 🔴 날짜 포맷

\`date\`는 "2026-04-17" 형식. 본문에선 "4월 17일"처럼 한국식으로 풀어 쓸 것. ISO 포맷 그대로 쓰기 금지.

## 🟡 goals 배열 vs score 불일치 가능성

\`score.us\`가 5인데 \`goals\` 배열에 득점자 이름이 3명만 있을 수 있음 —
**득점자가 "모름"으로 기록된 골**은 이름 없이 스코어에만 반영됨. 정상.

이 경우:
- 서술은 goals 배열의 이름만 언급 (이름 있는 3명의 골 위주)
- 스코어는 score.us/opp 기준 (5-N)
- "나머지 득점은 누가 넣었는지 모름" 같은 서술은 X (자연스럽게 생략)

## 🚨 수량·빈도 과장 금지 (중요)

입력 데이터의 **실제 횟수를 넘는 수량 표현 금지**.

- assists 배열 길이가 1개 → "어시스트" 또는 "한 차례 도움". **"여러 차례", "수차례", "계속"** 같은 표현 금지.
- assists 배열 길이가 2개 → "두 차례" or 구체적으로 "이 도움과 저 도움"
- goals 배열 길이 = 득점 수. 4골 이하면 "대량 득점" 금지.
- MOM은 1명만 수상. "여러 선수가 MOM 후보" 같은 가상 서술 금지.

**실패 사례**:
- 조강희 어시 1건인데 "조강희의 도움도 여러 차례 나왔고" ← 허위 수량
- 3골인데 "폭발적인 대량 득점" ← 과장

**올바른 사례**:
- 조강희 어시 1건 → "조강희의 어시스트가 경기 흐름을 만들었다"
- 3골 → "3골을 차곡차곡 쌓았다" / "3점을 가져왔다"

## 🚨 환각 절대 금지 (가장 중요)

**입력에 없는 사실을 만들어 쓰면 실패**입니다.

### score가 null일 때
- 스코어를 임의로 지어내지 말 것. "대승", "신승", "패배" 같은 결과 단어도 금지.
- "경기 기록이 정리되는 중입니다" 같은 담담한 서술로 시작.
- 2단락: 있는 정보(참석, MOM, 장소, 날씨)만 활용.

### goals가 빈 배열일 때
- 득점자 이름을 **절대 만들지 말 것**. "선수가 활약" 같은 일반화도 금지.
- 득점 서술 자체를 생략. MOM·참석·분위기만 언급.

### mom이 null일 때
- MOM을 지어내지 말 것. 언급 생략.

### 규칙
**입력에 없는 득점자 이름·어시스트·스코어·MOM을 추측으로 쓰면 즉시 실패.**
정보가 부족하면 짧은 후기(한 단락)라도 사실만 담는 게 낫습니다.

## 응답 형식

오직 **경기 후기 본문 텍스트만** 출력하세요.
다른 설명, 인사말, 메타 텍스트 절대 금지.
응답 첫 글자부터 바로 본문 시작.`;

export type MatchSummaryInput = {
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  score: { us: number; opp: number } | null;
  result: "W" | "D" | "L" | null;
  opponent: string | null;
  goals: Array<{ scorerName: string; quarter: number | null; isOwnGoal: boolean }>;
  assists: string[];
  mom: string | null;
  topScorerName: string | null;
  attendanceCount: number;
  location: string | null;
  weather: string | null;
  date: string;
  /** 관측성용 */
  userId?: string | null;
  teamId?: string | null;
  matchId?: string | null;
};

export type MatchSummaryResult = {
  summary: string;
  source: "ai" | "rule";
  model?: string;
};

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/** 룰 기반 fallback — 매우 단순한 포맷 */
function generateRuleBasedSummary(input: MatchSummaryInput): string {
  const { matchType, score, result, opponent, goals, mom, attendanceCount } = input;
  if (matchType === "EVENT") {
    return `${input.date} 팀 모임이 진행됐습니다. 참석 ${attendanceCount}명.`;
  }
  const scoreText = score ? `${score.us}-${score.opp}` : "기록 미완료";
  const resultText = result === "W" ? "승리" : result === "L" ? "패배" : result === "D" ? "무승부" : "";
  const opponentText = opponent ? `${opponent}전` : "자체전";
  const momText = mom ? ` MOM은 ${mom}.` : "";
  const goalsText =
    goals.length > 0
      ? ` 득점: ${goals.map((g) => g.scorerName).join(", ")}.`
      : "";
  return `${opponentText} ${scoreText}${resultText ? ` ${resultText}` : ""}.${goalsText}${momText}`;
}

const META_PATTERNS = [
  "경기 후기", "다음과 같", "여기 있", "후기입니다", "요약해",
  "작성했", "요약:", "응답:",
];

/** 반복 클리셰 — 같은 글에 2개 이상이거나, 전형적 마무리 문구 */
const CLICHE_PHRASES = [
  "공격을 주도",
  "공격력을 과시",
  "공격 전개를 이끌",
  "공격이 살아있",
  "공격이 어울렸",
  "공격 가담을 아끼지",
  "이런 기세 유지",
  "이 자신감을 유지",
  "앞으로도 이 경기력",
  "다음 경기도 이 기세",
];

function sanitize(raw: string): string {
  return raw
    .trim()
    .replace(/^["'"']+|["'"']+$/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "") // 이모지 완전 제거 (프롬프트에선 2개까지 허용이나, 안전)
    .trim();
}

function isLowQuality(text: string): boolean {
  if (!text || text.length < 50 || text.length > 600) return true;
  if (META_PATTERNS.some((p) => text.toLowerCase().includes(p.toLowerCase()))) return true;
  // 모델이 헤더(## ...)나 리스트(- ...)를 쓰면 형식 위반
  if (/^#+\s/m.test(text)) return true;
  if (/^\s*[-*]\s/m.test(text)) return true;
  // 클리셰 2개 이상 포함 — 반복 패턴
  const clicheHits = CLICHE_PHRASES.filter((p) => text.includes(p)).length;
  if (clicheHits >= 2) return true;
  return false;
}

export async function generateAiMatchSummary(input: MatchSummaryInput): Promise<MatchSummaryResult> {
  const ruleSummary = generateRuleBasedSummary(input);
  const started = Date.now();
  const logBase = {
    feature: "match_summary" as const,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    entityId: input.matchId ?? null,
  };

  if (!client) {
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_api_key" });
    return { summary: ruleSummary, source: "rule" };
  }

  const userContent = JSON.stringify({
    matchType: input.matchType,
    score: input.score,
    result: input.result,
    opponent: input.opponent,
    goals: input.goals.slice(0, 20),
    assists: input.assists.slice(0, 20),
    mom: input.mom,
    topScorerName: input.topScorerName,
    attendanceCount: input.attendanceCount,
    location: input.location,
    weather: input.weather,
    date: input.date,
  });

  const callOnce = async (temperature: number, feedbackNote?: string) => {
    const userMsg = feedbackNote
      ? `이전 응답이 ${feedbackNote} 때문에 실패했습니다. 시스템 지침을 엄격히 지켜 다시 작성.\n\n${userContent}`
      : `다음 경기 정보를 바탕으로 카톡 단톡에 올릴 경기 후기를 작성해 주세요. 본문 텍스트만 출력.\n\n${userContent}`;
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
      return { summary: ruleSummary, source: "rule" };
    }

    const cleaned = sanitize(textBlock.text);
    if (!isLowQuality(cleaned)) {
      await recordAiUsage({ ...logBase, source: "ai", model: MODEL, ...tokens, latencyMs: Date.now() - started });
      return { summary: cleaned, source: "ai", model: MODEL };
    }

    // 재시도 1회 (temperature 낮추고 실패 이유 피드백)
    const clicheHits = CLICHE_PHRASES.filter((p) => cleaned.includes(p));
    const failReason = cleaned.length < 50
      ? "너무 짧음"
      : cleaned.length > 600
        ? "너무 긺"
        : clicheHits.length >= 2
          ? `반복 클리셰 포함 (${clicheHits.slice(0, 2).join(", ")}) — 장면 중심 서술로 교체할 것`
          : "메타 표현 또는 마크다운 포함";
    const retry = await callOnce(0.4, failReason);
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
      return { summary: retryCleaned, source: "ai", model: MODEL };
    }

    await recordAiUsage({ ...logBase, source: "rule", model: MODEL, latencyMs: Date.now() - started, retryCount: 1, errorReason: "low_quality" });
    return { summary: ruleSummary, source: "rule" };
  } catch (err) {
    console.error("[aiMatchSummary] Claude API 호출 실패, 룰 기반으로 fallback:", err);
    await recordAiUsage({ ...logBase, source: "error", model: MODEL, latencyMs: Date.now() - started, errorReason: "api_error" });
    return { summary: ruleSummary, source: "rule" };
  }
}

// ─────────────────────────────────────────────────────────────
// Streaming 버전 (Phase B — 재생성 시 체감 latency 개선)
// ─────────────────────────────────────────────────────────────

export type MatchSummaryStreamEvent =
  | { type: "chunk"; text: string }
  | { type: "replace"; text: string; source: "rule"; reason?: string }
  | { type: "done"; source: "ai" | "rule"; model?: string };

export async function* generateAiMatchSummaryStream(
  input: MatchSummaryInput
): AsyncGenerator<MatchSummaryStreamEvent, void, unknown> {
  const ruleSummary = generateRuleBasedSummary(input);
  const started = Date.now();
  const logBase = {
    feature: "match_summary" as const,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    entityId: input.matchId ?? null,
  };

  if (!client) {
    yield { type: "replace", text: ruleSummary, source: "rule", reason: "no_api_key" };
    yield { type: "done", source: "rule" };
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_api_key" });
    return;
  }

  const userContent = JSON.stringify({
    matchType: input.matchType,
    score: input.score,
    result: input.result,
    opponent: input.opponent,
    goals: input.goals.slice(0, 20),
    assists: input.assists.slice(0, 20),
    mom: input.mom,
    topScorerName: input.topScorerName,
    attendanceCount: input.attendanceCount,
    location: input.location,
    weather: input.weather,
    date: input.date,
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
        content: `다음 경기 정보를 바탕으로 카톡 단톡에 올릴 경기 후기를 작성해 주세요. 본문 텍스트만 출력.\n\n${userContent}`,
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
      yield { type: "replace", text: ruleSummary, source: "rule", reason: "low_quality" };
      yield { type: "done", source: "rule", model: MODEL };
      await recordAiUsage({ ...logBase, source: "rule", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: "low_quality" });
      return;
    }

    yield { type: "done", source: "ai", model: MODEL };
    await recordAiUsage({ ...logBase, source: "ai", model: MODEL, ...tokens, latencyMs: Date.now() - started });
  } catch (err) {
    console.error("[aiMatchSummary stream] 호출 실패:", err);
    yield { type: "replace", text: ruleSummary, source: "rule", reason: "api_error" };
    yield { type: "done", source: "rule" };
    await recordAiUsage({ ...logBase, source: "error", model: MODEL, latencyMs: Date.now() - started, errorReason: "api_error" });
  }
}

/** 스트리밍 성공 후 DB에 저장 — 스트리밍이 완료되면 accumulated를 DB에 캐시 */
export function extractStreamFullText(events: MatchSummaryStreamEvent[]): { text: string; source: "ai" | "rule"; model?: string } | null {
  let accumulated = "";
  let replaced: string | null = null;
  let source: "ai" | "rule" = "rule";
  let model: string | undefined;
  for (const e of events) {
    if (e.type === "chunk") accumulated += e.text;
    else if (e.type === "replace") { replaced = e.text; source = e.source; }
    else if (e.type === "done") { source = e.source; model = e.model; }
  }
  return { text: replaced ?? accumulated, source, model };
}
