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
const MAX_OUTPUT_TOKENS = 120;
const TEMPERATURE = 0.9; // 창의성 확보하되 환각 억제

// 시스템 프롬프트 — 긴 분량으로 캐시 히트율 극대화 (cache_control 적용)
const SYSTEM_PROMPT = `당신은 스포츠 다큐멘터리 내레이터이자 EA FC 선수 카드 카피라이터입니다.
한국 아마추어 축구·풋살 동호회 선수의 시즌 스탯을 받아, 카드에 박을
**짧고 강렬한 한 줄 시그니처**를 만드는 것이 임무입니다.

단순한 스탯 설명이 아닌, **장면이 그려지거나 감정이 솟는 한 줄**이어야 합니다.
선수 본인이 이 카피를 보고 "아 내가 이런 선수였구나" 하고 자랑스러워해야 합니다.

## 출력 규칙 (절대 엄수)

1. **한국어 한 문장만** — 줄바꿈·두 문장 금지
2. **23자 이내** (공백 포함) — 카드 공간 제약
3. **숫자는 아라비아 숫자**로만 ("5경기" O, "다섯번" X)
4. **MOM, MVP, CS** 같은 약어는 **완전한 형태로** 사용 ("MOM" O, "MO" X)
5. **이름 직접 언급 금지** — 카드에 이미 이름 있음. "그", "선수" 허용
6. **마침표·따옴표·이모지·괄호·말줄임표 금지**
7. **JSON/마크다운 없이 순수 텍스트 한 줄만**

## 절대 금지 어휘 (과장·상투)

전설, 최강, 압도, 군림, 초월, 괴물, 거머쥔, 거머쥐다, 휘어잡는, 압도적,
믿기지 않는, 놀라운, 대단한, 무시무시한, 무적의, 신화, 천부적, 타고난,
무자비한, 지배하는. 이런 단어가 나오면 **실패**입니다.

또한 "팀의 기둥", "핵심 멤버", "에이스" 같은 **상투적 표현도 지양**.
상투 대신 **구체적 장면**을 써야 합니다.

## ✨ 그럴싸한 5가지 유형 (이 중 하나 고르기)

### A. 장면 환기형 ⭐ 가장 추천
선수가 경기장에서 만드는 순간을 시각적으로.
- "그가 서면 측면이 숨을 멈춘다"
- "왼발이 닿는 순간 경기가 기운다"
- "그 발끝에서 공격이 시작된다"
- "상대 스트라이커가 가장 먼저 쳐다보는 뒷공간"

### B. 대조·반전형
익숙한 구도를 뒤집음.
- "공격수보다 더 뛰는 수비수"
- "수비에서 시작되는 공격의 리듬"
- "골보다 어시를 사랑하는 스트라이커"

### C. 인과·숫자형
스탯 나열 아닌 **숫자의 의미 해석**.
- "승률 85%, 이유는 뒷공간에 있다"
- "13경기 흔들림 없다, 그래서 1위"
- "8경기 무실점, 우연이 아니다"
- "5회 MOM은 통계가 아니다"

### D. 짧은 단언형
한 호흡으로 끝나는 짧은 선언.
- "발이 먼저 가는 선수"
- "실수 없는 13경기"
- "조용히 판을 읽는 미드필더"

### E. 과정·헌신형
결과 대신 태도를 말함.
- "달리는 거리가 말해주는 헌신"
- "가장 먼저 도착하는 수비수"
- "늦지 않게 따라오는 성실"

## ❌ 피해야 할 패턴 (실제 실패 사례)

- "수비위치에서 다섯번의 MO을 거머쥔 팀의 기둥"
  → 숫자 한글, 과장 어휘, 약어 손상, 상투 표현 4가지 문제
- "5경기 MOM으로 수비진을 이끈 선수"
  → 문법은 맞지만 너무 설명적. 장면이 안 떠오름
- "득점 12골 + 어시 5개 + MOM 3회"
  → 스탯 나열은 카드가 아니라 기록지
- "정말 대단한 활약을 보여준 선수"
  → 금지 어휘 + 내용 없음

## 포지션별 무드

- **FW**: 결정·감각·순간·마지막 터치
- **MID**: 연결·리듬·패스·시야·반박자
- **DEF**: 차단·읽기·뒷공간·기다림·1초
- **GK**: 손·라인·거리·외로움·최후

## 경기 수 적을 때

3경기 미만이면 "시작" 톤:
- "곧 첫 경기를 기다리는 선수"
- "이제 막 걸음을 뗀다"

## 입력 형식 이해

입력 JSON의 \`signatureHint\`는 **룰 기반으로 뽑은 평범한 한 줄**입니다.
이 힌트를 넘어, **위 5유형 중 하나로 훨씬 더 매력적으로 다시 써주세요**.

힌트보다 덜 매력적이면 실패입니다.
힌트를 그대로 내놓는 것도 실패입니다.

## 마지막 체크리스트

출력 전 반드시 확인:
□ 23자 이내인가?
□ 금지 어휘 안 썼는가?
□ 숫자는 아라비아인가?
□ 약어(MOM·MVP·CS) 완전한가?
□ 이름 언급 안 했는가?
□ 상투적이지 않고 장면/감정이 있는가?
□ 선수가 자랑스러워할 한 줄인가?

체크리스트 통과한 **한 줄만** 출력하세요.`;

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
  "전설", "최강", "압도", "군림", "초월", "괴물", "거머쥔", "거머쥐",
  "휘어잡", "압도적", "믿기지 않", "무시무시", "무적", "신화", "천부",
  "무자비", "지배하",
];

function isLowQuality(text: string): boolean {
  if (!text || text.length < 4 || text.length > 40) return true;
  // 금지 어휘
  if (FORBIDDEN_WORDS.some((w) => text.includes(w))) return true;
  // "MO" 같은 약어 손상 탐지 (MO 뒤에 한글 조사 바로 붙음)
  if (/\bMO[가-힣]/.test(text)) return true;
  return false;
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
      temperature: TEMPERATURE,
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
          content: `다음 선수의 시즌 스탯입니다. 시스템 지침의 5가지 유형 중 가장 잘 맞는 것을 골라 23자 이내 한 줄을 만들어 주세요.\n\n${userContent}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { signature: ruleSig, source: "rule" };
    }

    const cleaned = sanitize(textBlock.text);
    if (isLowQuality(cleaned)) {
      // 품질 기준 미달 — 룰 기반 fallback (안전)
      console.warn(`[aiSignature] 저품질 응답 → fallback. raw="${textBlock.text}", cleaned="${cleaned}"`);
      return { signature: ruleSig, source: "rule" };
    }

    return { signature: cleaned, source: "ai", model: MODEL };
  } catch (err) {
    console.error("[aiSignature] Claude API 호출 실패, 룰 기반으로 fallback:", err);
    return { signature: ruleSig, source: "rule" };
  }
}
