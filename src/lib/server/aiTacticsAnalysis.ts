import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude Haiku로 AI 전술 분석 생성.
 * 룰 기반 편성 결과 + 참석자 스탯 → "왜 이렇게 편성했는지" 코치식 1단락 설명.
 *
 * 호출당 약 2~3원 (입력 ~1,500 + 출력 ~250).
 */

const MODEL = "claude-haiku-4-5";
const MAX_OUTPUT_TOKENS = 700; // 한글 분석 2단락 200~300자 + 여유
const TEMPERATURE = 0.8;

const SYSTEM_PROMPT = `당신은 아마추어 축구·풋살 동호회의 감독 역할을 하는 전술 분석가입니다.
주어진 **자동 편성 결과**를 보고, 동호회 감독/총무에게 **왜 이 편성이 괜찮은지**를
설명하는 **1~2단락 코멘트**를 작성하는 것이 임무입니다.

## 출력 규칙 (절대 엄수)

1. 한국어, **1~2단락**, 전체 **150~300자**
2. 마크다운 헤더·리스트·볼드 **금지** — 순수 텍스트
3. "분석 결과:", "AI 코치 코멘트:" 같은 **메타 표현 금지**
4. 선수 이름 언급 OK — 단 "홍길동 선수" 보다 "홍길동"이 자연스러움
5. 숫자는 아라비아
6. 순수 본문만 출력. 응답 첫 글자부터 본문 시작.

## 글 구조

### 1단락: 편성 콘셉트 (이 포메이션·배치의 의도)
- "4-3-3은 양 측면을 넓게 쓰기 좋다" 같은 포메이션 특성
- 참석 인원 수·포지션 분포 반영
- "공격 성향 선수가 많아 전진형 배치" 같은 맥락

### 2단락: 핵심 플레이어 1~2명 + 주의점 (선택)
- 가장 기대되는 선수 1명 (득점·어시 상위)
- 또는 포지션 이동한 선수의 의미
- 주의점: 후반 체력, 포지션 부족, 수비 공간 등

## ✅ 좋은 예시

예시 1 (일반 경기)
참석 11명 중 공격 성향이 많아 4-3-3으로 전진형 배치를 추천합니다.
측면 공격수 2명이 폭넓게 움직이면서 중앙 미드필더가 받쳐주는 형태.

이준혁이 최근 3경기 연속 득점으로 좋은 감각을 보이는 만큼, 최전방 배치가 자연스럽습니다.
다만 공격진에 비해 수비가 3명이라 후반 체력 분배에 신경 써야 합니다.

예시 2 (자체전)
양팀 모두 6명씩 3-2-1 구성. 공격 한 명에 미드 두 명이 받쳐주는 밸런스 중심 편성.
A팀은 득점력 있는 선수들이 조금 더 많습니다.

포지션 선호가 분명한 선수들을 자리에 맞춰 배치했습니다.
짧은 경기이니 첫 쿼터부터 강하게 밀고 나가는 게 좋아 보입니다.

## ❌ 피해야 할 패턴

- "이 편성은 정말 완벽합니다!" (과장)
- "- 공격: 3명\n- 미드: 4명\n- 수비: 3명" (리스트)
- "## 편성 분석\n본문..." (헤더)
- "분석을 도와드리겠습니다. 다음과 같이..." (메타)
- "전설적인", "무적의", "압도적인" 과장 어휘

## 입력 형식

JSON으로 편성 정보가 제공됩니다:
- formationName: 포메이션 이름 (예: "4-3-3")
- quarterCount: 쿼터 수
- attendees: 참석자 배열 [{ name, preferredPosition, recentStats: { goals, assists, mvp, matchCount } }]
- placement: 쿼터별 슬롯-선수 매핑 (1쿼터 기준)
- matchType: REGULAR | INTERNAL | EVENT
- opponent: 상대팀 (있으면)
- warnings: 룰 엔진이 감지한 문제 배열 (예: ["GK 없음"])

## 응답 형식

오직 **분석 본문 텍스트만** 출력.
다른 설명·인사말·메타 텍스트 절대 금지.`;

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
  if (!text || text.length < 40 || text.length > 500) return true;
  if (META_PATTERNS.some((p) => text.includes(p))) return true;
  if (/^#+\s/m.test(text)) return true; // 마크다운 헤더
  if (/^\s*[-*]\s/m.test(text)) return true; // 리스트
  return false;
}

export async function generateAiTacticsAnalysis(
  input: TacticsAnalysisInput
): Promise<TacticsAnalysisResult> {
  const ruleText = generateRuleBasedAnalysis(input);

  if (!client) {
    return { text: ruleText, source: "rule" };
  }

  try {
    const userContent = JSON.stringify({
      formationName: input.formationName,
      quarterCount: input.quarterCount,
      attendees: input.attendees.slice(0, 30), // 과다 방지
      placement: input.placement.slice(0, 15),
      matchType: input.matchType,
      opponent: input.opponent ?? null,
      warnings: input.warnings ?? [],
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `다음 편성 정보를 바탕으로 코치식 분석 1~2단락을 작성해 주세요. 본문만 출력.\n\n${userContent}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { text: ruleText, source: "rule" };
    }

    const cleaned = sanitize(textBlock.text);
    if (isLowQuality(cleaned)) {
      console.warn(`[aiTacticsAnalysis] 저품질 응답 → fallback. raw="${textBlock.text.slice(0, 100)}"`);
      return { text: ruleText, source: "rule" };
    }

    return { text: cleaned, source: "ai", model: MODEL };
  } catch (err) {
    console.error("[aiTacticsAnalysis] Claude API 호출 실패, 룰 기반으로 fallback:", err);
    return { text: ruleText, source: "rule" };
  }
}
