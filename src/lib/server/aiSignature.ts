import Anthropic from "@anthropic-ai/sdk";
import type { SignatureInput } from "@/lib/playerCardUtils";
import { generateSignature as generateRuleBasedSignature } from "@/lib/playerCardUtils";
import { recordAiUsage, extractTokenUsage } from "@/lib/server/aiUsageLog";
import { sanitizePromptObject } from "@/lib/server/aiPromptSafety";

/**
 * Claude Sonnet으로 선수 시그니처 카피 생성.
 * 실패 시 룰 기반 generateSignature로 fallback.
 *
 * 시그니처는 7일 TTL 캐시로 재사용 — Sonnet 비용 부담 최소.
 * 팀 전체 새 시그니처 생성해도 호출 횟수가 극히 적음.
 */

const MODEL = "claude-sonnet-4-5";
const MAX_OUTPUT_TOKENS = 120;
const TEMPERATURE = 0.9; // 창의성 확보하되 환각 억제

// 시스템 프롬프트 — 긴 분량으로 캐시 히트율 극대화 (cache_control 적용)
const SYSTEM_PROMPT = `당신은 아마추어 축구·풋살 선수카드의 한 줄 카피라이터입니다.
선수의 시즌 스탯을 보고, 카드에 박힐 **짧고 임팩트 있는 한 줄**을 만드는 게 임무입니다.

## 이 카피의 목적

선수가 이 카드를 카카오톡·인스타에 올릴 때 **자랑스럽고 약간 웃기기도 한** 한 줄이어야 합니다.
"이거 올려야겠다" 싶게 만들어야 합니다.
진지하기만 하면 공유 안 합니다. 너무 가볍기만 해도 안 됩니다.
**기록이 실제로 대단하다는 사실 + 약간의 위트** 가 섞인 톤이 목표입니다.

## 출력 규칙 (절대 엄수)

1. **한국어 한 문장만** — 줄바꿈·두 문장 금지
2. **23자 이내** (공백 포함) — 카드 공간 제약
3. **🔴 최우선 규칙 — 구체적 숫자 최소 1개 필수**
   - 경기 수, 골, 어시, MOM 횟수, 클린시트, 출석률, 승률 중
     **최소 1개 이상을 반드시 아라비아 숫자로** 포함할 것
   - **순수 은유·추상 표현만 있는 카피는 실패**
4. **숫자는 아라비아 숫자**로만 ("5경기" O, "다섯번" X)
5. **MOM, MVP, CS** 약어는 **글자 하나도 빠뜨리지 말 것**
   - "MO", "MV" 등 불완전 약어 절대 금지
6. **숫자와 문자 사이 공백 필수** ("5회 MOM" O, "5회MOM" X)
7. **이름 직접 언급 금지** — "그", "선수" 허용
8. **마침표·따옴표·이모지·괄호·말줄임표 금지**
9. **JSON/마크다운 없이 순수 텍스트 한 줄만**

## 절대 금지 어휘

### 과장·진부 계열
전설, 최강, 압도, 군림, 초월, 괴물, 거머쥔, 무적, 신화, 천부적, 지배하는,
믿기지 않는, 대단한, 무시무시한, 무자비한.

### 상투·추상 계열
**기둥, 핵심, 에이스, 리더, 주축, 활약** — 장면도 위트도 없는 빈 찬사. 자동 실패.

### 🔴 싸구려 위트 계열 (절대 금지)
**민망하다, 부끄럽다, 창피하다** — "수비수가 잘하니 공격수가 부끄럽다" 각도는
구조가 단순하고 진부함. **주인공(선수)의 기록에만 집중**할 것.
공격수·수비수 등 다른 포지션을 깎아내리는 방식 금지.

## ⚠️ 예시 문장 복사 금지
아래 예시는 **무드와 구조만 참고**하는 용도입니다.
예시의 단어·구절을 그대로 쓰면 **자동 실패**입니다.
입력 스탯에서 완전히 새로운 표현을 만들어야 합니다.

## ✨ 4가지 유형 (이 중 하나 고르기)

### A. 위트 + 숫자형 ⭐ 가장 추천
기록 사실은 진지한데 표현은 살짝 웃긴 톤.
- "12골, 쏘면 들어간다는 소문이 있다"
- "클린시트 7회, 골키퍼가 심심했다"
- "9어시, 도와줬더니 시즌이 끝났다"
- "5회 MOM, 팀원 투표는 거짓말을 안 한다"

### B. 반전 + 숫자형
예상을 뒤집는 한 방. 다른 선수를 깎아내리지 않고 이 선수의 기록 자체로 반전.
- "수비수가 팀 최다 득점, 13경기면 충분하다"
- "7골, 포지션을 착각한 게 아닌가 싶은 시즌"
- "3골 11어시, 이 선수가 없었다면 달랐다"

### C. 단언 + 숫자형
짧고 강하게 사실만.
- "14골, 이 팀 1위"
- "승률 85%, 이유는 스탯에 있다"
- "8경기 무실점, 반박 불가"

### D. 자랑 + 숫자형
부끄러움 없이 자랑하는 톤.
- "95% 출석, 이 팀에서 제일 성실하다"
- "13경기 전 출장, 한 번도 안 빠졌다"
- "6회 MOM, 팀원들이 그냥 뽑은 게 아니다"

## ❌ 피해야 할 패턴

- "12골을 넣으며 팀을 이끈 공격수" → 보도자료 톤. 공유 안 함
- "5회MO — 수비의 핵심" → 약어 손상 + 금지어
- "득점 12골 + 어시 5개 + MOM 3회" → 기록지 나열
- "정말 대단한 활약" → 금지어 + 내용 없음

## 포지션별 힌트

- **FW**: 골 냄새, 결정, 순간, 쏘면 된다
- **MID**: 연결, 패스, 쉬운 듯 어려운, 보이지 않는 기여
- **DEF**: 안 뚫린다, 조용하다, 상대가 포기했다
- **GK**: 거기 있었다, 날았다, 못 들어온다

## 팀 비교 데이터 (제공되면 최우선 활용)

다음 필드가 입력에 있으면 단순 절댓값보다 **비교 맥락**이 있는 카피로 격이 달라집니다.

- \`teamScorerRank\`: 팀 내 득점 순위 (1=최다 득점, 2=2위, 3=3위)
- \`teamAssistRank\`: 팀 내 어시스트 순위
- \`teamMvpRank\`: 팀 내 MOM 순위
- \`teamMemberCount\`: 팀 전체 인원 수
- \`teamTotalMatches\`: 시즌 총 완료 경기 수 (출석률 맥락용)
- \`goalsPerGame\`: 경기당 평균 득점 (0.50 = 2경기에 1골)
- \`mvpRate\`: MOM 획득률 (0.40 = 10경기 중 4번)
- \`goalStreak\`: 연속 득점 경기 수
- \`attendanceStreak\`: 연속 출전 경기 수

**데이터 활용 원칙 — 가장 예상 밖인 각도를 고른다**

1. **포지션 반전** — DEF/GK가 teamScorerRank=1이면 득점 사실이 핵심 각도.
   단 "포지션이 잘못된", "포지션이 잘못 적힌" 같은 표현은 **이미 진부하므로 절대 금지.**
   득점 숫자를 다른 맥락(MOM, 경기당, 클린시트와 병행)으로 표현해야 신선하다.

2. **MOM 밀도** — mvpRate가 0.30 이상이면 "거의 매 경기" 수준.
   "5회 MOM"보다 "10경기 중 5번"처럼 밀도가 느껴지게 표현.

3. **두 개 1위** — teamScorerRank=1이고 teamMvpRank=1이면 둘 다 1위라는 희귀성이 포인트.
   그러나 두 사실을 모두 나열하면 23자 초과. 더 임팩트 있는 한 가지만 선택.

4. **연속 기록** — goalStreak/attendanceStreak은 숫자 + 그 지속성의 의미로.

5. **A유형이 항상 우선** — 같은 사실도 위트 있게 비틀 수 있으면 비틀 것.
   "팀 득점 1위"(C유형 단언)보다 "득점왕이 수비수, 공격이 부끄럽다"(A유형 위트)가 공유 욕구 더 높다.

## 팀 1위 플래그 활용

\`isTopScorer / isTopAssist / isTopMvp\`가 true면 팀 내 1위입니다.
해당 사실을 자랑스럽게 — 단 자연스럽게 — 녹이세요.
여러 개 true면 가장 임팩트 있는 것 1개만. 억지로 다 넣지 말 것.

## 경기 수 적을 때

3경기 미만이면:
- "이제 시작이다, 2경기"
- "1경기, 스타트를 끊었다"

## 입력 형식 이해

\`signatureHint\`는 룰 기반의 평범한 한 줄입니다.
이보다 훨씬 재미있고 공유하고 싶어지는 한 줄로 바꿔야 합니다.
힌트보다 임팩트 없으면 실패입니다.

## 출력 방식

**오직 한 줄의 카피만.** 다른 글자 없이.
메타 텍스트("여기 있습니다", "카피:"), 사고 과정, 설명 전부 금지.
응답 첫 글자부터 바로 카피 본문 시작.`;

export type AiSignatureInput = SignatureInput & {
  /** 선수 이름 */
  playerName?: string;
  /** 팀 내 득점 순위 (1위=1, 2위=2, 3위=3, 그 이하=null) */
  teamScorerRank?: number | null;
  /** 팀 내 어시스트 순위 */
  teamAssistRank?: number | null;
  /** 팀 내 MOM 순위 */
  teamMvpRank?: number | null;
  /** 팀 전체 활성 멤버 수 */
  teamMemberCount?: number | null;
  /** 시즌 총 완료 경기 수 */
  teamTotalMatches?: number | null;
  /** 경기당 평균 득점 (소수 2자리) */
  goalsPerGame?: number | null;
  /** MOM 획득률 (0~1) */
  mvpRate?: number | null;
  /** 연속 득점 경기 수 (3 미만은 null로 전달) */
  goalStreak?: number | null;
  /** 연속 출전 경기 수 (5 미만은 null로 전달) */
  attendanceStreak?: number | null;
  /** 관측성용 — 누가/어느 팀/어느 멤버에 대한 호출인지 */
  userId?: string | null;
  teamId?: string | null;
  teamMemberId?: string | null;
};

export type AiSignatureResult = {
  signature: string;
  source: "ai" | "rule";
  model?: string;
};

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/** 출력 정제 — 모델이 따옴표/이모지/마침표 섞어도 안전하게 */
function sanitize(raw: string): string {
  return raw
    .trim()
    .split(/\n/)[0] // 첫 줄만
    .replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "") // 앞뒤 따옴표
    .replace(/\s*[.。!?！？]\s*$/g, "") // 끝 마침표·감탄부호
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "") // 이모지 제거
    .trim();
}

/** 금지 어휘 포함 여부 — 프롬프트 지시 위반 탐지 */
const FORBIDDEN_WORDS = [
  // 과장
  "전설", "최강", "압도", "군림", "초월", "괴물", "거머쥔", "거머쥐",
  "휘어잡", "압도적", "믿기지 않", "무시무시", "무적", "신화", "천부",
  "무자비", "지배하",
  // 상투적 표현 (장면·감정 대신 일반화)
  "기둥", "핵심", "에이스", "리더", "주축",
  // 싸구려 위트 — 다른 포지션 깎아내리기
  "민망하다", "민망해", "민망한", "부끄럽다", "부끄럽네", "창피하다", "창피해",
  // 부적절 어휘 — 모델 오생성 방지
  "발기", "섹스", "성기", "야한", "음란",
];

/** 메타 텍스트 — 모델이 답 대신 "여기 카피입니다" 같은 응답을 흘린 경우 */
const META_PATTERNS = [
  "체크리스트", "확인 완료", "다음과 같", "여기 있", "여기 카피",
  "카피:", "한 줄:", "출력:", "응답:", "답변:", "결과:",
];

/** 프롬프트 예시 복사 방지 — 예시 문장 핵심 구절이 그대로 포함되면 실패 */
const EXAMPLE_PHRASES = [
  "쏘면 들어간다는 소문",
  "골키퍼가 심심했다",
  "도와줬더니 시즌이 끝났다",
  "팀원 투표는 거짓말을 안 한다",
  "포지션이 잘못 적힌",
  "포지션이 잘못된",
  "교체가 없었다",
  "직접 넣는 건 사치",
  "반박 불가",
  "이 팀에서 제일 성실",
  "한 번도 안 빠졌다",
  "그냥 뽑은 게 아니다",
  "앞줄이 민망하다",
  "앞줄이 민망",
  "공격수 어디 갔나",
  "공격수는 어디에",
  "공격진은",
];

function isLowQuality(text: string): boolean {
  if (!text || text.length < 4 || text.length > 25) return true;
  // 메타 텍스트
  if (META_PATTERNS.some((p) => text.includes(p))) return true;
  // 금지 어휘
  if (FORBIDDEN_WORDS.some((w) => text.includes(w))) return true;
  // 예시 문장 복사 탐지
  if (EXAMPLE_PHRASES.some((p) => text.includes(p))) return true;
  // 약어 손상 — MOM의 M 하나만 쓴 "MO"(뒤에 M이 이어지지 않음), MVP의 "MV"
  if (/\bMO(?!M)\b/.test(text)) return true;
  if (/\bMV(?!P)\b/.test(text)) return true;
  // 숫자 바로 뒤에 MOM/MVP (공백 없는 붙여쓰기: "5MOM" → "5 MOM"이어야 함)
  if (/\d(?:MOM|MVP)/.test(text)) return true;
  // 숫자와 한글/영문 사이 공백 없음 ("5회MOM" 같은 붙어쓰기)
  if (/\d(회|경기|골|어시|번)[A-Z가-힣]/.test(text)) return true;
  // 🔴 숫자가 하나도 없음 — 추상·은유 단독 (독자 해석 필요 → 정보 전달 실패)
  if (!/\d/.test(text)) return true;
  return false;
}

export async function generateAiSignature(input: AiSignatureInput): Promise<AiSignatureResult> {
  const ruleSig = generateRuleBasedSignature(input);
  const started = Date.now();
  const logBase = {
    feature: "signature" as const,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    entityId: input.teamMemberId ?? null,
  };

  if (!client) {
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_api_key" });
    return { signature: ruleSig, source: "rule" };
  }

  // 안전망 — 입력은 거의 모두 숫자/bool이지만 sanitize 한 번 적용 (signatureHint 등 미래 변경 대비)
  const safeData = sanitizePromptObject({
    positionCategory: input.cat,
    matchCount: input.matchCount,
    goals: input.goals,
    assists: input.assists,
    mvp: input.mvp,
    cleanSheets: input.cleanSheets,
    attendanceRate: Math.round(input.attendanceRate * 100) / 100,
    winRate: Math.round(input.winRate * 100) / 100,
    isTopScorer: input.isTopScorer,
    isTopAssist: input.isTopAssist,
    isTopMvp: input.isTopMvp,
    // 팀 비교 데이터 — 있을 때만 포함
    ...(input.teamScorerRank != null && { teamScorerRank: input.teamScorerRank }),
    ...(input.teamAssistRank != null && { teamAssistRank: input.teamAssistRank }),
    ...(input.teamMvpRank != null && { teamMvpRank: input.teamMvpRank }),
    ...(input.teamMemberCount != null && { teamMemberCount: input.teamMemberCount }),
    ...(input.teamTotalMatches != null && { teamTotalMatches: input.teamTotalMatches }),
    ...(input.goalsPerGame != null && { goalsPerGame: Math.round(input.goalsPerGame * 100) / 100 }),
    ...(input.mvpRate != null && { mvpRate: Math.round(input.mvpRate * 100) / 100 }),
    ...(input.goalStreak != null && { goalStreak: input.goalStreak }),
    ...(input.attendanceStreak != null && { attendanceStreak: input.attendanceStreak }),
    signatureHint: ruleSig,
  });
  const userContent = JSON.stringify(safeData);

  const callOnce = async (temperature: number, feedbackNote?: string) => {
    const userMsg = feedbackNote
      ? `이전 응답이 ${feedbackNote} 때문에 실패했습니다. 시스템 지침을 엄격히 지켜 다시 작성해 주세요.\n\n응답 형식: 한 줄 카피 본문만.\n\n<user_data>\n${userContent}\n</user_data>`
      : `다음 선수의 시즌 스탯입니다. 시스템 지침의 5가지 유형 중 하나를 골라 23자 이내 한 줄만 만들어 주세요.\n\n응답 형식: 한 줄 카피 본문만. 다른 글자 절대 금지.\n\n<user_data>\n${userContent}\n</user_data>`;

    return client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userMsg }],
    });
  };

  try {
    const response = await callOnce(TEMPERATURE);
    const textBlock = response.content.find((b) => b.type === "text");
    const tokens = extractTokenUsage(response);

    if (!textBlock || textBlock.type !== "text") {
      await recordAiUsage({
        ...logBase, source: "rule", model: MODEL,
        ...tokens, latencyMs: Date.now() - started,
        errorReason: "no_text_block",
      });
      return { signature: ruleSig, source: "rule" };
    }

    const cleaned = sanitize(textBlock.text);
    if (!isLowQuality(cleaned)) {
      await recordAiUsage({
        ...logBase, source: "ai", model: MODEL,
        ...tokens, latencyMs: Date.now() - started,
      });
      return { signature: cleaned, source: "ai", model: MODEL };
    }

    // 저품질 → 1회 재시도 (temperature 낮추고 피드백 제공)
    console.warn(`[aiSignature] 저품질 1차 응답, 재시도. raw="${textBlock.text.slice(0, 60)}"`);
    const failureReason = detectFailureReason(cleaned);
    const retry = await callOnce(0.3, failureReason);
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
        latencyMs: Date.now() - started,
        retryCount: 1,
      });
      return { signature: retryCleaned, source: "ai", model: MODEL };
    }

    await recordAiUsage({
      ...logBase, source: "rule", model: MODEL,
      inputTokens: (tokens.inputTokens ?? 0) + (retryTokens.inputTokens ?? 0),
      outputTokens: (tokens.outputTokens ?? 0) + (retryTokens.outputTokens ?? 0),
      latencyMs: Date.now() - started, retryCount: 1,
      errorReason: "low_quality",
    });
    return { signature: ruleSig, source: "rule" };
  } catch (err) {
    console.error("[aiSignature] Claude API 호출 실패, 룰 기반으로 fallback:", err);
    await recordAiUsage({
      ...logBase, source: "error", model: MODEL,
      latencyMs: Date.now() - started,
      errorReason: "api_error",
    });
    return { signature: ruleSig, source: "rule" };
  }
}

/** 저품질 응답의 구체 원인 판별 — 재시도 시 피드백으로 사용 */
function detectFailureReason(text: string): string {
  if (!text || text.length < 4) return "너무 짧음";
  if (text.length > 25) return "너무 긺 (23자 이내)";
  if (META_PATTERNS.some((p) => text.includes(p))) return "메타 표현 포함";
  if (FORBIDDEN_WORDS.some((w) => text.includes(w))) return "금지어 포함";
  if (/\bMO(?!M)\b/.test(text)) return "MOM 약어 손상";
  if (/\bMV(?!P)\b/.test(text)) return "MVP 약어 손상";
  if (!/\d/.test(text)) return "구체적 숫자 없음";
  return "형식 위반";
}
