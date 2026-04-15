import Anthropic from "@anthropic-ai/sdk";
import type { SignatureInput } from "@/lib/playerCardUtils";
import { generateSignature as generateRuleBasedSignature } from "@/lib/playerCardUtils";

/**
 * Claude Haiku로 선수 시그니처 카피 생성.
 * 실패 시 룰 기반 generateSignature로 fallback.
 *
 * 시스템 프롬프트는 2,500+ 토큰으로 캐시 히트율 극대화.
 * 캐시 적용 후 호출당 약 1원 (입력 400 토큰 + 출력 50 토큰).
 */

const MODEL = "claude-haiku-4-5";
const MAX_OUTPUT_TOKENS = 100;

// 시스템 프롬프트 — 긴 분량으로 캐시 히트율 극대화 (cache_control 적용)
const SYSTEM_PROMPT = `당신은 한국 아마추어 축구·풋살 동호회의 선수 프로필 카피라이터입니다.
EA FC 스타일 선수 카드에 들어갈 **한 줄 시그니처 문구**를 만드는 것이 임무입니다.

## 출력 규칙 (매우 중요)

- 반드시 **한국어 한 문장**만 출력
- 최대 25자 이내, 여유 있으면 30자까지 허용
- 따옴표, 이모지, 괄호, 말줄임표 사용 금지
- 문장 끝 마침표 사용 금지 (카드에 박아 넣는 용도라 불필요)
- 선수 이름 직접 언급 금지 (이미 카드에 이름 있음)
- "그", "이 선수", "그녀" 같은 3인칭 주어 허용
- JSON이나 마크다운 없이 **순수 텍스트 한 줄만**

## 톤 가이드

- **담백하고 문학적으로**. 과장된 극찬("최강", "전설적인")은 피함
- 숫자를 자연스럽게 녹이되 스탯 나열이 아닌 **스토리**로
- "승률 100%, 그가 뛰면 팀은 이긴다" 같은 호소력 있는 문장
- 감탄사("대단한!", "놀라운!") 금지
- 한국어 구어체보다 **간결한 서술체**
- 팀/동호회 맥락이라 프로 급 찬양은 어색함

## 좋은 예시

- "15골 8어시 — 시즌 MVP 후보"
- "승률 100%, 그가 뛰면 팀은 이긴다"
- "5경기 무실점 — 팀의 최후방"
- "꾸준함으로 시즌을 채운 선수"
- "22경기 출장 · 클린시트 7회"
- "5경기 연속 MOM, 미드필더의 교과서"
- "득점 감각 깨어난 후반기의 에이스"
- "실점 위기 때 가장 먼저 달리는 수비수"
- "곧 첫 경기를 기다리는 선수"

## 나쁜 예시 (피해야 함)

- "김민수는 정말 대단한 선수입니다!" (이름 언급 + 감탄사)
- "⚽ 10골 기록! 🔥" (이모지)
- "득점왕입니다." (마침표 + 너무 단조)
- "모두가 인정하는 전설의 공격수" (과장)
- "골, 어시, MOM 모두 갖춘 만능 플레이어" (스탯 나열 느낌)

## 포지션별 톤 차이

- **GK/DEF (수비)**: 안정감·끈기·무실점·수비의 기둥
- **MID (미드)**: 연결·리듬·어시스트·플레이메이커
- **FW (공격)**: 결정력·감각·득점 본능·결정적 한 방

## 경기 수 적을 때

- 3경기 미만: "곧 첫 경기를 기다리는 선수" 같은 expectation 톤
- 숫자를 강조하기보다 "시작" 느낌

## 시그니처 힌트 활용

입력 JSON의 \`signatureHint\` 필드는 **룰 기반으로 이미 뽑은 한 줄**입니다.
이걸 그대로 쓰지 말고 **더 매력적인 표현으로 개선**해 주세요.
힌트가 "5경기 무실점 — 팀의 최후방"이면 같은 사실을 더 담백하게 풀어낸 문장으로.

힌트보다 확실히 나아질 수 없다면 힌트를 약간만 다듬어 출력해도 괜찮습니다.`;

export type AiSignatureInput = SignatureInput & {
  /** 추가 스탯 — 프롬프트 생성 품질 향상용 */
  playerName?: string;
};

export type AiSignatureResult = {
  signature: string;
  source: "ai" | "rule";
  model?: string;
};

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/** 출력 정제 — 모델이 따옴표/이모지 섞어도 안전하게 */
function sanitize(raw: string): string {
  return raw
    .trim()
    .replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "") // 앞뒤 따옴표 제거
    .replace(/\s*[.。]\s*$/g, "") // 끝 마침표 제거
    .split(/\n/)[0] // 첫 줄만 사용
    .trim();
}

export async function generateAiSignature(input: AiSignatureInput): Promise<AiSignatureResult> {
  const ruleSig = generateRuleBasedSignature(input);

  if (!client) {
    return { signature: ruleSig, source: "rule" };
  }

  try {
    const userContent = JSON.stringify({
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
      signatureHint: ruleSig,
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }, // prompt caching 적용
        },
      ],
      messages: [
        {
          role: "user",
          content: `다음 선수 스탯을 바탕으로 한 줄 시그니처 카피를 만들어 주세요.\n\n${userContent}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { signature: ruleSig, source: "rule" };
    }

    const cleaned = sanitize(textBlock.text);
    if (!cleaned || cleaned.length < 4 || cleaned.length > 50) {
      // 이상한 응답이면 fallback
      return { signature: ruleSig, source: "rule" };
    }

    return { signature: cleaned, source: "ai", model: MODEL };
  } catch (err) {
    console.error("[aiSignature] Claude API 호출 실패, 룰 기반으로 fallback:", err);
    return { signature: ruleSig, source: "rule" };
  }
}
