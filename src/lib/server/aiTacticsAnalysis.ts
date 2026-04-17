import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage, extractTokenUsage } from "@/lib/server/aiUsageLog";
import { getOrComputeTeamStats, findOpponentHistory, type TeamStats } from "@/lib/server/aiTeamStats";

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

## 🔴 용어 가이드 (대중적 표현 우선 · 전문 은어 금지)

이 서비스는 아마추어 동호회 감독/총무 대상. 축구 중계 용어 일부는 대중적이지 않아 **쉬운 한국어**로 치환.

**금지 → 권장**:
- "피봇", "더블 피봇", "앵커" → "수비형 미드", "뒤쪽 미드 두 명", "중원 밑선"
- "하프 스페이스" → "중앙과 측면 사이 공간", "안쪽 침투 경로"
- "인버티드 풀백", "섀도우 스트라이커" → "안으로 좁혀 들어오는 풀백", "처진 공격수"
- "하이라인" → "수비 라인을 높게", "올려 막기"
- "미드블록" → "중앙 지역에서 압박", "중앙 수비 블록"
- "세컨볼" → "떨어지는 공", "공 경합 후 흘린 볼"
- "3선 침투" → "뒤에서 밀고 올라오는 움직임"
- "스위칭" → "포지션 교체", "측면 바꾸기"
- "빌드업", "오버래핑", "역습", "압박", "측면 전환", "지역 방어" → 이 정도는 대중적이라 **사용 가능**

**권장 표현 예시**:
- "뒷선 4명이 넓게 서서 공을 안정적으로 빼준다"
- "수비형 미드 두 명이 중앙을 단단히 잠그고 공격형 미드가 창의적 역할"
- "좌측 풀백이 공격 가담할 때 좌측 윙어가 안쪽으로 좁혀 공간 확보"
- "후반 체력 저하 시 측면 자원부터 교체"

과하게 현학적으로 쓰지 말 것. 중학생도 이해 가능한 수준으로.

## 포메이션별 일반 원리 (아마추어 맥락)

- **4-3-3**: 측면 공격 강점, 중원 3명이 압박 주도.
  - 강점: 풀백-윙어 콤비로 측면을 넓게 활용, 수비 라인 끌어올릴 수 있음.
  - 약점: 역습 시 측면 뒷공간이 비기 쉽고 풀백 체력 부담 큼.

- **4-4-2**: 좌우 대칭이라 책임이 명확하고 단순.
  - 강점: 역할 분담이 깔끔해서 처음 합 맞추는 팀에도 유리, 빠른 공격 전환 가능.
  - 약점: 중원 2명이라 3미드 상대 시 숫자에서 밀림.

- **4-2-3-1**: 공격형 미드 한 명 + 뒤쪽 수비형 미드 두 명.
  - 강점: 공격형 미드의 창의성과 뒤쪽 두 명의 안정감을 같이 가져감.
  - 약점: 공격형 미드가 막히면 공격이 고립될 수 있어 풀백 가담이 중요.

- **5-3-2 (3-5-2)**: 뒷선 3명 + 좌우 윙백 활용.
  - 강점: 뒷선 3명으로 중앙이 단단, 윙백이 공격 가담하면 5미드 효과.
  - 약점: 윙백 체력 부담이 가장 큼.

- **3-4-3**: 뒷선 3명, 측면에 윙백+윙어 4명 배치.
  - 강점: 측면 4명을 동시에 활용해 공격 인원이 많음.
  - 약점: 뒷선 3명 사이 공간과 측면을 봉쇄당하면 중앙이 답답해짐.

- **3-4-2-1**: 3-4-3의 변형 — 처진 공격수 두 명.
  - 강점: 미드 4명 + 처진 공격 2명으로 중앙이 두꺼움.
  - 약점: 정통 윙어가 없어 측면은 윙백 의존.

- **4-1-4-1**: 수비형 미드 한 명 + 공격형 미드 4명.
  - 강점: 수비 라인을 높게 올릴 수 있고 측면 폭을 넓게 가져감.
  - 약점: 수비형 미드가 봉쇄되면 수비가 드러나고 원톱이 고립.

- **풋살 5-3-2 (FIXO + 2 ALA + PIVO)**:
  - 강점: FIXO가 뒤에서 시작, ALA가 측면 공수 전환.
  - 약점: PIVO 고립, 공수 전환 속도 필수.

과거 전적 기반 평가가 일반 원리보다 우선. 우리 팀이 어떤 포메이션을 잘 쓰는지가 더 중요.

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
- attendees: **참석자 풀** [{ name, preferredPosition, isGuest?, recentStats? }]
  → 누가 왔는지 전체 목록. **선호 포지션(preferredPosition)은 개인 이력일 뿐 이번 편성의 포지션이 아님.**
  → \`isGuest=true\`인 선수는 용병 (규칙 6 적용)
- placement: **1쿼터 실제 배치** [{ slot, playerName }]
  → 이번 포메이션에서 누가 어느 슬롯을 맡는지. **포메이션 구도는 이걸 기준으로**.
- placementBreakdown: { GK, DEF, MID, FWD } — placement의 카테고리별 인원수 (사전 계산됨)
- matchType: REGULAR | INTERNAL | EVENT
- opponent: 상대팀 이름 (있으면)
- warnings: 룰 엔진이 감지한 편성 경고 (예: "수비수 부족", "키 포지션 미배치")

## 🔴 데이터 해석 규칙 (절대 엄수 · 위반 시 답변 전면 재작성)

### 규칙 1 — 숫자는 placementBreakdown **엄수**

"뒷선 N명", "중원 N명", "공격 N명" 같은 **모든 수 표현**은 입력의 \`placementBreakdown\` 값을 **그대로 사용**.
- placementBreakdown 예시: \`{GK:1, DEF:4, MID:5, FWD:1}\`
  → 본문 가능: "뒷선 4명, 중원 5명, 최전방 1명"
  → 본문 금지: "뒷선 5명", "센터백 3명" (실제 DEF는 4명이면)
- 모호하면 placementBreakdown 값을 **있는 그대로 반복**해서 쓰라. 해석하지 말고.

### 규칙 2 — 선수 역할은 placement의 **slot 그대로**

placement는 \`[{slot, playerName}]\` 배열. 각 선수를 언급할 때 **해당 slot의 역할만** 말함.
- slot이 "LCB" → "좌측 센터백" / "수비" (미드 아님)
- slot이 "ST" → "최전방 공격수" / "원톱" (미드 아님)
- slot이 "LAM"/"CAM"/"RAM" → "공격형 미드" (수비 아님)
- slot이 "LB"/"RB" → "풀백" (미드 아님)
- slot이 "LW"/"RW" → "윙어" (미드 아님)
- slot이 "LDM"/"RDM"/"CDM" → "수비형 미드" (원톱 아님)
- slot이 "LM"/"RM" → "측면 미드" (센터백 아님)

**예시 위반 (절대 금지)**:
- 김선휘가 placement에서 "LCB"인데 "측면 미드 김선휘" ❌
- 고지훈이 placement에서 "ST"인데 "측면 미드 고지훈" ❌

선수 이름 언급 시 반드시 그 선수의 **실제 slot 역할**만 써라.

### 규칙 3 — preferredPosition은 개인 맥락 한정

\`preferredPosition\`은 **개인 예외 상황** 언급용.
- "공격 선호 선수 X가 이번엔 수비로 배치됨" 같은 경우만
- 일반 포메이션 구도 묘사엔 쓰지 말 것

### 규칙 4 — placement에 없는 이름 금지

벤치·미배치 참석자 이름 본문에 언급 금지. placement 배열에 있는 이름만 사용.

### 규칙 5 — 상대팀 이력 hallucination 절대 금지

user 메시지에 "## 상대팀 XXX 과거 이력" 블록이 **있을 때만** 과거 맞대결 수치 언급 가능.
- 블록이 **없으면**: "첫 대결이라 상대 정보가 없어 일반 원칙 위주로 운영" 같이 **첫 대결로 명시**
- 블록이 있어도 **수치는 블록에 적힌 그대로만** 인용. 없는 점수·승패·경기 수 **절대 생성 금지**
- 예시 위반: 상대팀 이력 블록 없는데 "지난 경기 12-5로 이긴 기록" 같은 서술 ❌
- 예시 위반: 상대 히스토리가 "1전 1승"인데 "최근 4경기 중 3승" 같이 부풀림 ❌

상대팀 이름만 알고 과거 데이터가 없으면, 일반적 주의점(빠른 역습 대비 등)과 우리 팀 히스토리 기반으로만 서술.

### 규칙 6 — 용병(isGuest=true) 처리

attendees 중 \`isGuest=true\`인 선수는 **이번 경기 처음 합류하는 외부 선수**입니다. 실력·플레이 성향을 AI가 알 수 없습니다.

- 용병 이름 언급은 가능하나, **확정적·단정적 서술 금지**
  - ❌ "홍길동의 속도로 측면을 돌파"
  - ❌ "김철수가 득점 기회를 만들어낸다"
  - ✅ "용병 홍길동의 적응 상황을 보고 2쿼터 이후 교체 시기 판단"
  - ✅ "용병 김철수는 선호 포지션을 기준으로 배치됐으니 경기 흐름 보고 조정"
- 용병은 "용병 [이름]" 또는 "이번 합류한 [이름]"으로 지칭
- 핵심 선수 역할(주공격·리더)을 용병에게 부여하는 서술 금지 — 팀 고유 선수 위주로 전술 중심을 잡을 것
- placementBreakdown 카운트에는 포함됨 (그 수는 그대로 사용)

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
  /** 용병 여부. true면 실력/성향 알 수 없음 → AI는 단정적 표현 회피 */
  isGuest?: boolean;
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
  /** Phase C(aiFullPlan) — 쿼터별 가용 선수 이름 명단. AI가 임의 쿼터에 없는 선수를 배치하지 않도록 강제. */
  availableByQuarter?: Record<number, string[]>;
  /** 관측성용 */
  userId?: string | null;
  teamId?: string | null;
  matchId?: string | null;
  /** Phase C(aiFullPlan) — formation catalog 생성용 */
  sportType?: "SOCCER" | "FUTSAL";
  playerCount?: number;
};

export type TacticsAnalysisResult = {
  text: string;
  source: "ai" | "rule";
  model?: string;
};

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/**
 * placement 슬롯 라벨 → 포지션 카테고리 (DEF/MID/FWD/GK).
 * AI가 포메이션 구도를 입으로 만들지 않도록 사전 계산해서 프롬프트에 제공.
 */
function categorizeSlot(slot: string): "GK" | "DEF" | "MID" | "FWD" {
  const s = slot.toUpperCase().replace(/[0-9]/g, "");
  if (s.includes("GK")) return "GK";
  // 수비: CB/LB/RB/WB/FIXO(풋살 최후방)
  if (s.includes("CB") || s === "LB" || s === "RB" || s.includes("WB") || s.includes("FIXO")) return "DEF";
  // 공격: ST/LW/RW/CF/LF/RF/PIVO(풋살 타겟맨)
  if (s === "ST" || s === "LW" || s === "RW" || s === "CF" || s === "LF" || s === "RF" || s.includes("PIVO")) return "FWD";
  // 기본: 미드 (CDM/CAM/CM/LM/RM/ALA 등)
  return "MID";
}

/** 1쿼터 배치의 카테고리별 인원수 집계 */
export function computePlacementBreakdown(placement: TacticsAnalysisInput["placement"]): {
  GK: number; DEF: number; MID: number; FWD: number;
} {
  const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of placement) {
    counts[categorizeSlot(p.slot)]++;
  }
  return counts;
}

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
    placementBreakdown: computePlacementBreakdown(input.placement),
    matchType: input.matchType,
    opponent: input.opponent ?? null,
    warnings: input.warnings ?? [],
  });

  // Phase D + E: 팀 히스토리 + 상대팀 이력 (24h 캐시 적용)
  const historyBlock = await fetchHistoryBlock(input);

  const callOnce = async (temperature: number, feedbackNote?: string) => {
    const headerLine = feedbackNote
      ? `이전 응답이 ${feedbackNote} 때문에 실패했습니다. 시스템 지침 엄수 후 재작성.`
      : `다음 편성 정보를 바탕으로 코치식 3단락 분석을 작성해 주세요. 우리 팀 히스토리와 상대팀 이력이 있으면 자연스럽게 반영. 본문만 출력.`;
    const userMsg = historyBlock
      ? `${headerLine}\n\n${historyBlock}\n\n## 이번 경기 편성\n${userContent}`
      : `${headerLine}\n\n${userContent}`;
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
    placementBreakdown: computePlacementBreakdown(input.placement),
    matchType: input.matchType,
    opponent: input.opponent ?? null,
    warnings: input.warnings ?? [],
  });

  // Phase D + E: 팀 히스토리 + 상대팀 이력 (24h 캐시 적용)
  const historyBlock = await fetchHistoryBlock(input);
  const userMessageContent = historyBlock
    ? `다음 편성 정보를 바탕으로 코치식 3단락 분석을 작성해 주세요. 우리 팀 히스토리와 상대팀 이력이 있으면 자연스럽게 반영. 본문만 출력.\n\n${historyBlock}\n\n## 이번 경기 편성\n${userContent}`
    : `다음 편성 정보를 바탕으로 코치식 3단락 분석을 작성해 주세요. 본문만 출력.\n\n${userContent}`;

  let accumulated = "";

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessageContent }],
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

// ─────────────────────────────────────────────────────────────
// Phase D + E — 팀 히스토리 / 상대팀 이력 user 메시지 빌더
// ─────────────────────────────────────────────────────────────

/** 팀 히스토리 + 상대팀 이력 텍스트 블록 */
function buildHistoryBlock(stats: TeamStats, opponent: string | null | undefined): string {
  if (stats.totalCompletedMatches === 0) return "";

  const lines: string[] = [];
  lines.push(`## 우리 팀 히스토리 (최근 ${stats.totalCompletedMatches}경기, REGULAR)`);

  if (stats.formationStats.length > 0) {
    lines.push("\n### 포메이션별 전적");
    for (const f of stats.formationStats.slice(0, 5)) {
      const winRate = f.played > 0 ? Math.round((f.won / f.played) * 100) : 0;
      lines.push(`- ${f.name}: ${f.played}전 ${f.won}승 ${f.drawn}무 ${f.lost}패 (승률 ${winRate}%, 득실 ${f.goalsFor}/${f.goalsAgainst})`);
    }
  }

  if (stats.playerPositionStats.length > 0) {
    lines.push("\n### 핵심 선수 포지션 활약 (Top 10)");
    for (const p of stats.playerPositionStats.slice(0, 10)) {
      const extras: string[] = [];
      if (p.goals > 0) extras.push(`${p.goals}골`);
      if (p.assists > 0) extras.push(`${p.assists}어시`);
      const extra = extras.length > 0 ? ` (${extras.join(", ")})` : "";
      lines.push(`- ${p.playerName} ${p.position}: ${p.matches}경기${extra}`);
    }
  }

  const opp = findOpponentHistory(stats, opponent);
  if (opp && opp.played > 0) {
    lines.push(`\n## 상대팀 ${opp.opponentName} 과거 이력`);
    lines.push(`- 통산 ${opp.played}전 ${opp.won}승 ${opp.drawn}무 ${opp.lost}패`);
    if (opp.recentScores.length > 0) {
      lines.push("- 최근 경기:");
      for (const s of opp.recentScores) {
        lines.push(`  - ${s.date}: ${s.us}-${s.opp} (${s.result})`);
      }
    }
  }

  return lines.join("\n");
}

/** input.teamId가 있으면 통계 fetch 후 텍스트 블록 반환. 없으면 빈 문자열 */
async function fetchHistoryBlock(input: TacticsAnalysisInput): Promise<string> {
  if (!input.teamId) return "";
  try {
    const stats = await getOrComputeTeamStats(input.teamId);
    return buildHistoryBlock(stats, input.opponent);
  } catch (err) {
    console.warn("[aiTacticsAnalysis] 히스토리 fetch 실패 (무시):", err);
    return "";
  }
}

/** 외부에서 사용 가능 — Phase C(full plan)에서도 동일 블록 재사용 */
export { fetchHistoryBlock };
