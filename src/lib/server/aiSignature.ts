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
3. **🔴 최우선 규칙 — 구체적 숫자 최소 1개 필수**
   - 경기 수, 골, 어시, MOM 횟수, 클린시트, 출석률, 승률 중
     **최소 1개 이상을 반드시 아라비아 숫자로** 포함할 것
   - "13경기", "5골", "MOM 3회", "승률 85%" 등
   - **순수 은유·추상 표현만 있는 카피는 실패** — 장면을 쓰더라도 옆에 숫자 필수
4. **숫자는 아라비아 숫자**로만 ("5경기" O, "다섯번" X)
5. **MOM, MVP, CS** 약어는 **글자 하나도 빠뜨리지 말 것**
   - MOM은 세 글자, MVP는 세 글자, CS는 두 글자
   - "MO", "MV" 등 불완전 약어 절대 금지 — 출력 전 한 글자씩 세어 확인할 것
6. **숫자와 문자 사이 공백 필수** ("5회 MOM" O, "5회MOM" X)
7. **이름 직접 언급 금지** — 카드에 이미 이름 있음. "그", "선수" 허용
8. **마침표·따옴표·이모지·괄호·말줄임표 금지**
9. **JSON/마크다운 없이 순수 텍스트 한 줄만**

## 절대 금지 어휘

### 과장 계열
전설, 최강, 압도, 군림, 초월, 괴물, 거머쥔, 거머쥐다, 휘어잡는, 압도적,
믿기지 않는, 놀라운, 대단한, 무시무시한, 무적의, 신화, 천부적, 타고난,
무자비한, 지배하는.

### 상투·추상 계열 (특히 중요)
**기둥, 핵심, 에이스, 리더, 주축** — 이 단어들이 들어간 문장은 자동으로 **실패**입니다.
"수비의 핵심", "팀의 기둥", "공격의 에이스" 같은 표현은 **장면도 감정도 없는
추상적 찬사**라 카드를 평범하게 만듭니다.

대신:
- "수비의 핵심" ❌ → "상대가 가장 먼저 쳐다보는 뒷공간" ✅
- "팀의 기둥" ❌ → "흔들림 없는 13경기가 증명한다" ✅
- "공격의 에이스" ❌ → "발끝에 실린 0.6초" ✅

**구체적 장면 > 추상적 찬사**

## ✨ 그럴싸한 5가지 유형 (이 중 하나 고르기)

### A. 장면 + 숫자형 ⭐ 가장 추천
장면을 그리되 반드시 **스탯 숫자 1개 이상** 포함.
- "승률 85%, 그가 서면 측면이 닫힌다"
- "13경기 1실점, 최후방이 흔들리지 않는다"
- "5회 MOM, 발이 가장 먼저 도착하는 수비수"
- "12골 8어시, 왼발이 경기를 연다"

### B. 대조 + 숫자형
익숙한 구도를 뒤집되 수치 근거 포함.
- "8어시 5골, 골보다 연결을 사랑하는 공격수"
- "공격수보다 많이 뛴 수비수 — 승률 82%"
- "3골 11어시, 수비에서 시작되는 공격"

### C. 인과·숫자형
숫자의 의미 해석.
- "승률 85%, 이유는 뒷공간에 있다"
- "13경기 흔들림 없다, 그래서 1위"
- "8경기 무실점, 우연이 아니다"
- "5회 MOM은 통계가 아니다"

### D. 짧은 단언 + 숫자형
한 호흡 선언 + 뒷받침 숫자.
- "실수 없는 13경기"
- "5회 MOM, 중심은 흔들리지 않는다"
- "22경기 출장, 꾸준함 그 자체"

### E. 과정·헌신 + 숫자형
결과 대신 태도 + 증거 숫자.
- "95% 출석, 달리는 거리가 말한다"
- "13경기 전부 뛴 헌신"
- "9회 풀타임, 끝까지 남는 선수"

## ❌ 피해야 할 패턴 (실제 실패 사례)

- "상대 스트라이커가 가장 먼저 쳐다보는 뒷공간"
  → **숫자가 하나도 없음** — 독자가 "뭐가 대단한 건지" 해석 불가. 순수 은유 실패
- "수비위치에서 다섯번의 MO을 거머쥔 팀의 기둥"
  → 숫자 한글, 약어 손상(MO), 금지어(거머쥔, 기둥)
- "5회MO—수비의 핵심"
  → 약어 손상(MO), 숫자 붙여쓰기(5회MO), 금지어(핵심)
- "5경기 MOM으로 수비진을 이끈 핵심 수비수"
  → 금지어(핵심) + 너무 설명적
- "득점 12골 + 어시 5개 + MOM 3회"
  → 스탯 나열 (기록지 톤)
- "정말 대단한 활약을 보여준 선수"
  → 금지어(대단) + 내용 없음

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

## 출력 방식

당신의 응답에는 **오직 한 줄의 카피만** 포함됩니다.

- "체크리스트", "확인", "검토", "여기 있습니다", "카피:" 같은 메타 텍스트 절대 금지
- 사고 과정, 설명, 이유 금지
- 빈 줄, 번호, 마커 금지
- 응답 첫 글자부터 바로 카피 본문 시작

## 좋은 응답 예시
한 줄만. 이렇게.

## 나쁜 응답 예시
"여기 카피입니다: 한 줄만"
"체크리스트 완료: 한 줄만"
"다음과 같이 작성했습니다. 한 줄만"`;

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
  // 과장
  "전설", "최강", "압도", "군림", "초월", "괴물", "거머쥔", "거머쥐",
  "휘어잡", "압도적", "믿기지 않", "무시무시", "무적", "신화", "천부",
  "무자비", "지배하",
  // 상투적 표현 (장면·감정 대신 일반화)
  "기둥", "핵심", "에이스", "리더", "주축",
];

/** 메타 텍스트 — 모델이 답 대신 "여기 카피입니다" 같은 응답을 흘린 경우 */
const META_PATTERNS = [
  "체크리스트", "확인 완료", "다음과 같", "여기 있", "여기 카피",
  "카피:", "한 줄:", "출력:", "응답:", "답변:", "결과:",
];

function isLowQuality(text: string): boolean {
  if (!text || text.length < 4 || text.length > 40) return true;
  // 메타 텍스트
  if (META_PATTERNS.some((p) => text.includes(p))) return true;
  // 금지 어휘
  if (FORBIDDEN_WORDS.some((w) => text.includes(w))) return true;
  // 약어 손상 — MOM의 M 하나만 쓴 "MO"(뒤에 M이 이어지지 않음), MVP의 "MV"
  if (/\bMO(?!M)\b/.test(text)) return true;
  if (/\bMV(?!P)\b/.test(text)) return true;
  // 숫자와 한글/영문 사이 공백 없음 ("5회MOM" 같은 붙어쓰기)
  if (/\d(회|경기|골|어시|번)[A-Z가-힣]/.test(text)) return true;
  // 🔴 숫자가 하나도 없음 — 추상·은유 단독 (독자 해석 필요 → 정보 전달 실패)
  if (!/\d/.test(text)) return true;
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
          content: `다음 선수의 시즌 스탯입니다. 시스템 지침의 5가지 유형 중 하나를 골라 23자 이내 한 줄만 만들어 주세요.

응답 형식: 한 줄 카피 본문만. 다른 글자 절대 금지.

${userContent}`,
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
