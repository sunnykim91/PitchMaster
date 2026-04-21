import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage, extractTokenUsage } from "@/lib/server/aiUsageLog";
import { getOrComputeTeamStats, findOpponentHistory, type TeamStats } from "@/lib/server/aiTeamStats";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * AI 코치 분석 결과 영속화 — matches 테이블 업데이트.
 * 스트림 완료 후(AI 성공 + 저품질 폴백 + 에러 폴백) 모두 저장해
 * 이후 GET /api/ai/tactics?matchId=X 로 재조회 가능.
 * 저장 실패해도 사용자에겐 영향 없음 (로그만).
 */
export async function persistCoachAnalysis(
  matchId: string | null | undefined,
  text: string,
  model: string,
): Promise<void> {
  if (!matchId || !text) return;
  try {
    const db = getSupabaseAdmin();
    if (!db) return;
    await db
      .from("matches")
      .update({
        ai_coach_analysis: text,
        ai_coach_generated_at: new Date().toISOString(),
        ai_coach_model: model,
      })
      .eq("id", matchId);
  } catch (err) {
    console.error("[aiTacticsAnalysis] coach analysis 저장 실패:", err);
  }
}

/**
 * Claude Haiku로 AI 전술 분석 생성.
 * 룰 기반 편성 결과 + 참석자 스탯 → "왜 이렇게 편성했는지" 코치식 3단락 설명.
 *
 * 호출당 약 2~3원 (입력 ~1,500 + 출력 ~250). 저품질 시 1회 재시도.
 */

const MODEL = "claude-haiku-4-5";
const MAX_OUTPUT_TOKENS = 1800; // 한글 3단락 500~700자 + 안전 여유 (토큰 상한으로 잘림 방지)
const TEMPERATURE = 0.75; // 전문성 위해 약간 낮춤

const SYSTEM_PROMPT = `당신은 이 팀을 오래 지도해온 **우리 팀 감독**입니다.
경기 직전 감독·주장에게 "이 경기 이렇게 가자"라고 **작전 브리핑**하는 자리입니다.
해설자가 아니라 지시하는 사람입니다. 팀이 이 말을 듣고 움직일 수 있어야 합니다.

## 🔴 말투 (가장 중요)

- **지시형·권유형** 문장: "~로 가자", "~을 노리자", "~이 관건이다", "~을 우선 쓴다"
- 데이터는 **지시의 근거**로만 등장: "지난 12경기 8골이니 최전방 쐐기로 쓴다"
- 수동 해설체 금지: "~에 배치됩니다/교대됩니다/이동합니다" ❌ → "~에 세운다/바꾼다/올린다" ✅
- 선수별 쿼터 경로 나열 금지 (아래 피해야 할 패턴 참조)
- "1쿼터엔 ~, 2쿼터엔 ~" 식 스케줄 보고 금지. 대신 "초반엔 ~, 고비 쿼터엔 ~" 같은 **전술 흐름** 언어

## 출력 규칙 (절대 엄수)

1. 한국어, **3단락**, 전체 **350~550자**
2. 마크다운 헤더·리스트·볼드 금지 — 순수 텍스트
3. "분석 결과:", "코칭 노트:", "이번 편성은" 같은 메타·보고체 시작 금지
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

## 3단락 구조 — 감독의 작전 브리핑

### 1단락 — 게임플랜 한 줄 + 그렇게 가는 이유 (80~130자)
- 이 경기의 **전략 방향**을 한 문장으로 선언. "이 경기는 X로 간다" 톤
- 근거는 우리 폼·상대 성향·가용 자원 중 1~2개만 짧게 연결
- 포메이션 이름은 **필요할 때 1회만** 언급. 숫자 나열 금지
- 예: "이 경기는 빠른 초반 선제점으로 주도권을 쥐고 가자. 최근 3경기 연승 중이고 상대 골키퍼가 약점이라 측면 크로스가 답이다."

### 2단락 — 어떻게 풀 것인가 (공격·수비 핵심 지시, 170~260자)
- **공격 루트 지시**: 누구를 중심으로 어디를 뚫을지. 커리어 스탯(골·어시·MOM)은 선수 지명 근거로만
  - 예: "좌측은 A(지난 시즌 8골)를 쐐기로 세우고, B가 그 뒤에서 받쳐주자"
- **수비 원칙 지시**: 어느 라인에서 끊을지, 뒷공간 어떻게 지킬지
  - 예: "중앙 블록을 만들어 상대 빌드업을 차단하고, 끊는 즉시 측면으로 빠르게 전환한다"
- **상대·폼 반영**: 상대팀 이력이 있으면 지난 맞대결 교훈을 지시로. 최근 3경기 흐름도 활용
  - 예: "지난 맞대결은 3쿼터 실점으로 내줬다. 이번엔 그 구간 라인을 내리고 역습으로 전환"
- 로테이션 정보(positionChangers/slotSharing)는 **지시 근거**로만 자연스럽게 녹인다. 선수별 쿼터 경로를 줄줄이 나열하는 건 금지 (피해야 할 패턴 참조)

### 3단락 — 경기 중 체크포인트 (체력·변곡점, 100~160자)
- 고비 쿼터 지목: quarterStats의 실점 패턴을 근거로 **어느 쿼터가 고비인지** 콕 집는다
  - 예: "3쿼터가 고비다. 우리 팀 실점이 이 구간에 몰려있으니 수비 라인 내리고 버티자"
- 체력 부담 선수 지명 + 교체 지시: playerWorkload에서 풀 쿼터 출전 선수를 **실명으로** 집어 교체·역할 조정 지시
  - 예: "A는 4쿼터 내내 뛴다. 후반 교체 카드 아낄 필요 없다"
- 벤치 자원(benchPlayers)이 있으면 교체 카드로 언급 OK

## ✅ 좋은 예시 (감독 브리핑 톤)

예시 1 (4-3-3, 상대 우측 풀백이 약점)
이 경기는 우측 측면을 공략해 선제점을 뽑고 가자. 참석 10명에 공격 자원이 4명 붙었고, 상대 우측 풀백이 느린 편이라 4-3-3으로 폭을 넓게 쓰는 게 답이다.

공격은 고건우를 우측 윙어 쐐기로 세우고, 이준혁이 안쪽으로 좁혀 들어와 침투 경로를 만든다. 이준혁은 지난 12경기 8골 3어시 — 이번 경기 주 득점 카드다. 빌드업은 뒷선 3명이 받쳐주고, 수비는 중앙 블록으로 끊어 즉시 측면으로 빠져나가자. 지난 맞대결에서 중원에 밀렸으니 이번엔 수비형 미드 두 명이 절대 전진하지 말고 라인을 잡아야 한다.

고비는 3쿼터다. 우리 팀 실점이 평균 1.4골로 이 구간에 몰려있다. 3쿼터부턴 수비 라인 내리고 역습 중심으로 전환. 이준혁이 4쿼터까지 풀로 뛰는 배치라 후반엔 교체 카드 고민 없이 쓰자.

## ❌ 피해야 할 패턴 (방금 생성된 나쁜 출력 기준)

- **선수별 쿼터 경로 나열**: "A는 1쿼터 LM, 2쿼터 LW, 3쿼터 LAM에 배치됩니다" ❌
- **포메이션 스케줄 보고**: "1쿼터는 4-4-2, 2쿼터는 4-3-3, 3쿼터는 4-2-3-1로 전환됩니다" ❌
- **수동 해설체**: "~에 배치됩니다", "~에 교대됩니다", "~로 이동합니다" ❌
- **중립 관찰자 톤**: "AI가 쿼터별로 포메이션을 달리 짠 풀 플랜입니다" ❌ (당신이 감독이다)
- **보고서식 서문**: "전반적으로 ~하는 구조입니다" ❌
- 과장: "이 편성은 완벽합니다!", "무적의 라인업"
- 스탯 나열: "골 12, 어시 5, MOM 3"
- 리스트·헤더 마크다운
- 메타 표현: "분석해드리면", "다음과 같이"
- 너무 짧은 요약 — 반드시 3단락
- 근거 없는 일반론 — 데이터와 지시가 연결돼야 함

## 입력 형식

JSON:
- formationName: "4-3-3" 등 — **1쿼터(또는 기본) 포메이션만**. 쿼터별로 바뀌면 quarterFormations 참조
- quarterFormations: **쿼터별 포메이션 이름** [{ quarter, formation }] (제공 시)
  → 쿼터마다 다른 포메이션을 쓰면 여기 명시됨. 예: [{quarter:1, formation:"4-2-3-1"}, {quarter:2, formation:"4-3-3"}, ...]
- generationMode: **편성이 만들어진 방식** (제공 시)
  → "rule"  = 팀 기본 포메이션 + 규칙 기반 배치. **AI 가 포메이션을 고른 것이 아님**
  → "ai-fixed" = 팀 포메이션 고정, 배치만 AI 가 최적화
  → "ai-free"  = AI 가 쿼터별로 포메이션 자체를 설계
  → "manual"   = 수동 편집 / 이전 편성 복원
  (규칙 0 에 서술 어투 분기 있음)
- quarterCount: 쿼터 수 (2~4)
- attendees: **참석자 풀** [{ name, preferredPosition, isGuest?, recentStats? }]
  → 누가 왔는지 전체 목록. **선호 포지션(preferredPosition)은 개인 이력일 뿐 이번 편성의 포지션이 아님.**
  → \`isGuest=true\`인 선수는 용병 (규칙 6 적용)
- placement: **1쿼터 실제 배치** [{ slot, playerName }]
  → 이번 포메이션에서 누가 어느 슬롯을 맡는지. **포메이션 구도는 이걸 기준으로**.
- placementBreakdown: { GK, DEF, MID, FWD } — placement의 카테고리별 인원수 (사전 계산됨)
- quarterPlacements: **쿼터별 실제 배치** [{ quarter, assignments: [{slot, playerName}] }] (제공 시)
  → 각 쿼터의 선수 배치. 쿼터 간 로테이션·교체 파악에 활용. placement(1쿼터)와 같은 형식.
- quarterBreakdown: **쿼터별 카테고리 인원수** { [quarter]: {GK,DEF,MID,FWD} } (제공 시)
  → 쿼터마다 포메이션 숫자가 달라질 수 있음. 변화 있으면 서술에 반영.
- playerRotation: **선수별 쿼터 로테이션** [{ playerName, slots:[{quarter,slot}] }] (제공 시)
  → 선수 이름 언급 시 이 구조로 "그 선수가 어느 쿼터에 어느 slot인지" 확인. 1쿼터 slot만 보고 단정 금지.
- positionChangers: **쿼터 간 포지션이 바뀐 선수** [{ playerName, history:[{quarter,slot}] }] (제공 시)
  → **참고용 데이터**. 배치 변화를 일일이 나열하지 말 것. 꼭 언급해야 한다면 지시형으로 녹인다 — "김정윤은 초반엔 중원에서 받쳐주다 후반엔 최전방으로 올려 승부 보자" (O). "김정윤은 1쿼터 CDM, 2쿼터 ST로 배치됩니다" (X)
- slotSharing: **여러 선수가 쿼터별로 나눠 맡은 slot** { [slot]: [{quarter, playerName}] } (제공 시)
  → **주축이 누군지 판단할 때만** 활용. 해당 slot 맡은 선수를 전부 나열하지 말 것. "원톱은 A를 중심으로, 후반에 B가 받친다" 정도로 압축.
- benchPlayers: **미출전(벤치) 참석자** [playerName] (제공 시)
  → 주력에서 빠지는 자원. 3단락 교체 대상 자원 언급 시 활용 가능.
- playerWorkload: **이번 경기 선수별 쿼터 부하** [{ playerName, quarters }] (제공 시)
  → 선수가 몇 쿼터를 소화하는지. quarterCount와 동일하면 전 쿼터 출전 = 체력 부담 대상.
- matchType: REGULAR | INTERNAL | EVENT
- opponent: 상대팀 이름 (있으면)
- warnings: 룰 엔진이 감지한 편성 경고 (예: "수비수 부족", "키 포지션 미배치")

## 🔴 데이터 해석 규칙 (절대 엄수 · 위반 시 답변 전면 재작성)

### 규칙 0 — 포메이션 이름 **엄수** (임의 변형 금지)

포메이션 이름을 언급할 때는 **반드시 입력의 값을 그대로** 사용:
- 단일 포메이션 경기: \`formationName\` 값 그대로 (예: "4-2-3-1", "4-3-3")
- 쿼터별 다른 포메이션: \`quarterFormations[n].formation\` 값 그대로

**절대 금지**:
- 존재하지 않는 포메이션 창작: "4-6-0", "4-3-3-0", "1-1-1", "4-5-0" 등
- 입력에 없는 포메이션 번호 조합을 임의로 생성
- placement 숫자를 보고 "수비-미드-공격" 자체 집계로 포메이션 이름 추론 (예: DEF:4, MID:6, FWD:0을 "4-6-0"으로 표현) — 이건 "뒷선 4명, 중원 6명, 최전방 0명" 식으로 placementBreakdown 표현으로 써라.

**가능한 표현 방식**:
- ✅ "1쿼터는 4-2-3-1, 2쿼터엔 4-3-3으로 전환" (quarterFormations 기반)
- ✅ "3쿼터의 4-4-2는 미드가 두터워지는 구조" (입력값 그대로 + 해석)
- ❌ "3쿼터는 최전방을 비우고 4-6-0으로 전환" (4-6-0 창작)
- ❌ "4쿼터에 1-1-1 포메이션으로 돌아와" (1-1-1은 풋살 3인제. 축구 11인제에 존재 안 함)

quarterFormations 가 없고 여러 쿼터에 placement 구조가 확연히 다르면 "포메이션 변화가 있습니다" 정도로만 언급하고 구체 이름은 추측 금지.

### 규칙 0.5 — 편성 방식(generationMode)별 어투 분기 (편성 경위 언급 시에만 적용)

아래는 **편성 경위를 언급해야 할 때의** 표현 가이드. 1단락을 "이 경기는 X로 가자" 같은 게임플랜 지시형으로 바로 시작하면 경위 언급은 생략 가능하며 그게 더 좋다. 경위를 언급한다면 아래 매핑을 지킨다 — **AI 가 포메이션을 고른 것처럼 서술하는 것은 "ai-free" 일 때만 허용**.

- **generationMode = "rule"**: 팀 기본 포메이션에 규칙 기반으로 배치. 도입부 예시:
  - ✅ "팀 기본 포메이션 {formationName} 에 참석 {N}명을 규칙 기반으로 배치한 편성입니다."
  - ✅ "{formationName} 구도에 선수 선호 포지션을 반영한 배치예요."
  - ❌ "공격 성향 선수가 충분해서 {formationName} 로 편성했습니다" (AI 가 고른 것처럼 읽힘)
  - ❌ "AI 가 {formationName} 을 선택했습니다" (AI 관여 없음)

- **generationMode = "ai-fixed"**: 팀 포메이션 고정, 배치만 AI 가 최적화. 도입부 예시:
  - ✅ "{formationName} 팀 포메이션 안에서 선수 배치를 AI 가 최적화했습니다."
  - ✅ "{formationName} 구도를 유지하며 선호 포지션·체력을 고려한 AI 배치예요."
  - ❌ "AI 가 {formationName} 을 선택" (포메이션은 사용자가 이미 골라놓은 상태)

- **generationMode = "ai-free"**: AI 가 쿼터별 포메이션을 직접 설계. 도입부 가능:
  - ✅ "AI 가 쿼터별로 포메이션을 달리 짠 풀 플랜입니다. 1쿼터 …, 2쿼터 …"
  - ✅ "쿼터별 포메이션 변화를 통해 체력 분산과 상대 대응을 노린 편성이에요."
  - 이 모드에선 "AI 가 골랐다" 톤 허용.

- **generationMode = "manual" (또는 필드 없음)**: 편성 경위 언급하지 말고 **편성 자체만 해석**.
  - ✅ "{formationName} 편성의 구도는 뒷선 N명, 중원 N명…"
  - ❌ "AI 가 …" / "규칙 기반으로 …" 경위 추측 금지

### 규칙 1 — 숫자는 placementBreakdown **엄수**

"뒷선 N명", "중원 N명", "공격 N명" 같은 **모든 수 표현**은 입력의 \`placementBreakdown\` 값을 **그대로 사용**.
- placementBreakdown 예시: \`{GK:1, DEF:4, MID:5, FWD:1}\`
  → 본문 가능: "뒷선 4명, 중원 5명, 최전방 1명"
  → 본문 금지: "뒷선 5명", "센터백 3명" (실제 DEF는 4명이면)
- 모호하면 placementBreakdown 값을 **있는 그대로 반복**해서 쓰라. 해석하지 말고.

### 규칙 2 — 선수 역할은 실제 slot **그대로**, 쿼터별 변화 반영

선수를 언급할 때 **그 선수가 실제 맡은 slot의 역할만** 말함. slot 라벨 → 한국어 매핑:
- "LCB"/"RCB"/"CB" → "센터백" / "수비" (미드 아님)
- "ST"/"CF" → "최전방 공격수" / "원톱" (미드 아님)
- "LAM"/"CAM"/"RAM" → "공격형 미드" (수비 아님)
- "LB"/"RB" → "풀백" (미드 아님)
- "LW"/"RW" → "윙어" (미드 아님)
- "LDM"/"RDM"/"CDM" → "수비형 미드" (원톱 아님)
- "LM"/"RM" → "측면 미드" (센터백 아님)

**쿼터별 규칙 (절대 엄수)**:
- \`playerRotation\`이 제공되면 선수 역할은 **1쿼터 slot만으로 고정 서술 금지**.
  → 그 선수의 전체 쿼터 slot을 보고 서술해야 함.
- \`positionChangers\`에 있는 선수를 언급해야 할 땐 **지시형으로 통합**하되 변화 자체를 줄줄이 나열하진 말 것
  - ✅ "김정윤은 초반 중원에서 받쳐주다 후반엔 최전방으로 올려 승부 보자"
  - ❌ "김정윤: 1쿼터 수비형 미드, 2쿼터 최전방, 3쿼터 …"
- \`slotSharing\`이 있는 slot을 언급할 땐 **주축 1명 + 서브** 구도로 압축. 전원 나열 금지
  - ✅ "원톱은 김희범 중심, 김정윤이 후반 받쳐준다"
  - ❌ "원톱은 1쿼터 김희범, 2쿼터 김정윤, 3쿼터 김희범, 4쿼터 김정윤이 맡는다"
- slot 고정 서술 금지 (positionChangers에 이동 있는 선수를 1쿼터 slot으로만 고정 언급 ❌)

선수 이름 언급은 그 선수의 **실제 slot 역할** 기준으로. 로테이션 정보는 **지시의 근거**로만 쓰고, 나열은 금지.

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

## 🔵 placement / quarterPlacements 해석 (감독 관점)

\`placement\`는 1쿼터 기준, \`quarterPlacements\`는 전 쿼터 배치. **데이터 나열이 아니라 지시 근거**로만 활용.

- 쿼터별 배치를 하나하나 보고하지 말 것. 전체 경기의 **의도**만 말한다
- **positionChangers**: 선수가 쿼터 간 다른 역할을 맡는다면, "A는 초반 수비/후반 공격으로 승부" 같이 **의도만** 전달. 경로 나열 금지
- **slotSharing**: 주축 1명을 지명하고 나머지는 "받쳐준다" 톤으로. 쿼터별 번갈아 매칭 금지
- **quarterBreakdown**: 쿼터마다 구조가 바뀐다면 "초반엔 중원을 두텁게, 후반엔 공격을 강화" 같이 흐름만
- 모든 쿼터 배치 동일하면 쿼터 언급 아예 안 해도 된다
- 2단락 주축 선수 지명 시, 한 포지션을 여러 선수가 나눠 맡으면 **주축을 고르는 것**이 감독의 역할

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
  /** 전체 쿼터별 배치 (AI 코치가 쿼터 간 로테이션 파악 가능) */
  quarterPlacements?: Array<{
    quarter: number;
    assignments: Array<{ slot: string; playerName: string }>;
  }>;
  /** 쿼터별 포메이션 이름 — AI 가 "4-6-0", "1-1-1" 같은 가짜 포메이션 창작 방지 */
  quarterFormations?: Array<{ quarter: number; formation: string }>;
  /**
   * 편성이 어떻게 만들어졌는지 — 서술 어투 분기에 사용.
   * - "rule":      팀 기본 포메이션 + 규칙 기반 배치 (AI 가 포메이션 선택한 게 아님)
   * - "ai-fixed":  팀 포메이션 고정, 배치만 AI 가 최적화
   * - "ai-free":   AI 가 쿼터별로 포메이션 자체를 설계
   * - "manual":    수동 편집·복원 (과정 불명)
   */
  generationMode?: "rule" | "ai-fixed" | "ai-free" | "manual";
  /** 이번 경기 선수별 쿼터 부하 (몇 쿼터 뛰는지) — AI 체력 분석용 */
  playerWorkload?: Array<{ playerName: string; quarters: number }>;
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  opponent?: string | null;
  warnings?: string[];
  /** Phase C(aiFullPlan) — 쿼터별 가용 선수 이름 명단. AI가 임의 쿼터에 없는 선수를 배치하지 않도록 강제. */
  availableByQuarter?: Record<number, string[]>;
  /** Phase C — true면 모든 쿼터 동일 formation 고정 (사용자가 포메이션 미리 선택). 배치만 AI가 설계. */
  singleFormation?: boolean;
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

type QuarterPlacements = NonNullable<TacticsAnalysisInput["quarterPlacements"]>;

/** 쿼터별 DEF/MID/FWD 카테고리 인원수 — 쿼터마다 포메이션 숫자가 달라지는 걸 AI가 파악할 수 있게 */
export function computeQuarterBreakdown(qps: QuarterPlacements): Record<number, { GK: number; DEF: number; MID: number; FWD: number }> {
  const result: Record<number, { GK: number; DEF: number; MID: number; FWD: number }> = {};
  for (const qp of qps) {
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const a of qp.assignments) counts[categorizeSlot(a.slot)]++;
    result[qp.quarter] = counts;
  }
  return result;
}

/** 선수별 쿼터 로테이션 — 선수 이름 → [{quarter, slot}] */
export function computePlayerRotation(qps: QuarterPlacements): Array<{ playerName: string; slots: Array<{ quarter: number; slot: string }> }> {
  const map = new Map<string, Array<{ quarter: number; slot: string }>>();
  for (const qp of qps) {
    for (const a of qp.assignments) {
      if (!map.has(a.playerName)) map.set(a.playerName, []);
      map.get(a.playerName)!.push({ quarter: qp.quarter, slot: a.slot });
    }
  }
  return [...map.entries()].map(([playerName, slots]) => ({
    playerName,
    slots: slots.sort((a, b) => a.quarter - b.quarter),
  }));
}

/** 포지션 공유자 — 동일 slot을 쿼터별로 다른 선수가 맡은 경우만 반환 */
export function computeSlotSharing(qps: QuarterPlacements): Record<string, Array<{ quarter: number; playerName: string }>> {
  const map = new Map<string, Array<{ quarter: number; playerName: string }>>();
  for (const qp of qps) {
    for (const a of qp.assignments) {
      if (!map.has(a.slot)) map.set(a.slot, []);
      map.get(a.slot)!.push({ quarter: qp.quarter, playerName: a.playerName });
    }
  }
  const result: Record<string, Array<{ quarter: number; playerName: string }>> = {};
  for (const [slot, entries] of map.entries()) {
    const uniquePlayers = new Set(entries.map((e) => e.playerName));
    if (uniquePlayers.size >= 2) {
      result[slot] = entries.sort((a, b) => a.quarter - b.quarter);
    }
  }
  return result;
}

/** 쿼터 간 포지션이 바뀐 선수만 — 3단락 서술 의무 대상 */
export function computePositionChangers(rotation: ReturnType<typeof computePlayerRotation>): Array<{ playerName: string; history: Array<{ quarter: number; slot: string }> }> {
  return rotation
    .filter((r) => {
      const uniqueSlots = new Set(r.slots.map((s) => s.slot));
      return uniqueSlots.size >= 2;
    })
    .map((r) => ({ playerName: r.playerName, history: r.slots }));
}

/** 미출전(벤치) 선수 — attendees 중 어느 쿼터에도 배치되지 않은 이름 */
export function computeBenchPlayers(
  attendees: AttendeeForAnalysis[],
  qps: QuarterPlacements
): string[] {
  const placed = new Set<string>();
  for (const qp of qps) for (const a of qp.assignments) placed.add(a.playerName);
  return attendees.map((a) => a.name).filter((n) => !placed.has(n));
}

/** 룰 기반 fallback — 매우 단순 */
export function generateRuleBasedAnalysis(input: TacticsAnalysisInput): string {
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
  // 길이 상한은 안전장치 수준으로만 — 사용자가 스트림으로 이미 본 내용을 길다는 이유로 덮어쓰지 않음
  if (!text || text.length < 100 || text.length > 2500) return true;
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
    feature: "tactics-coach" as const,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    matchId: input.matchId ?? null,
    entityId: input.matchId ?? null,
  };

  if (!client) {
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_api_key" });
    return { text: ruleText, source: "rule" };
  }

  const qps = input.quarterPlacements && input.quarterPlacements.length > 0 ? input.quarterPlacements : null;
  const rotation = qps ? computePlayerRotation(qps) : null;
  const positionChangers = rotation ? computePositionChangers(rotation) : null;
  const slotSharing = qps ? computeSlotSharing(qps) : null;
  const quarterBreakdown = qps ? computeQuarterBreakdown(qps) : null;
  const benchPlayers = qps ? computeBenchPlayers(input.attendees, qps) : [];

  const userContent = JSON.stringify({
    formationName: input.formationName,
    quarterCount: input.quarterCount,
    attendees: input.attendees.slice(0, 30),
    placement: input.placement.slice(0, 15),
    placementBreakdown: computePlacementBreakdown(input.placement),
    ...(input.quarterFormations && input.quarterFormations.length > 0
      ? { quarterFormations: input.quarterFormations }
      : {}),
    ...(input.generationMode ? { generationMode: input.generationMode } : {}),
    ...(qps
      ? { quarterPlacements: qps.map((qp) => ({
          quarter: qp.quarter,
          assignments: qp.assignments.slice(0, 15),
        })) }
      : {}),
    ...(quarterBreakdown ? { quarterBreakdown } : {}),
    ...(rotation && rotation.length > 0 ? { playerRotation: rotation } : {}),
    ...(positionChangers && positionChangers.length > 0 ? { positionChangers } : {}),
    ...(slotSharing && Object.keys(slotSharing).length > 0 ? { slotSharing } : {}),
    ...(benchPlayers.length > 0 ? { benchPlayers } : {}),
    ...(input.playerWorkload && input.playerWorkload.length > 0
      ? { playerWorkload: input.playerWorkload }
      : {}),
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

    const failReason = cleaned.length < 100 ? "너무 짧음 (3단락 필요)" : cleaned.length > 2500 ? "너무 긺" : "메타 표현 또는 마크다운 포함";
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
    feature: "tactics-coach" as const,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    matchId: input.matchId ?? null,
    entityId: input.matchId ?? null,
  };

  if (!client) {
    yield { type: "replace", text: ruleText, source: "rule", reason: "no_api_key" };
    yield { type: "done", source: "rule" };
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_api_key" });
    return;
  }

  const qps = input.quarterPlacements && input.quarterPlacements.length > 0 ? input.quarterPlacements : null;
  const rotation = qps ? computePlayerRotation(qps) : null;
  const positionChangers = rotation ? computePositionChangers(rotation) : null;
  const slotSharing = qps ? computeSlotSharing(qps) : null;
  const quarterBreakdown = qps ? computeQuarterBreakdown(qps) : null;
  const benchPlayers = qps ? computeBenchPlayers(input.attendees, qps) : [];

  const userContent = JSON.stringify({
    formationName: input.formationName,
    quarterCount: input.quarterCount,
    attendees: input.attendees.slice(0, 30),
    placement: input.placement.slice(0, 15),
    placementBreakdown: computePlacementBreakdown(input.placement),
    ...(input.quarterFormations && input.quarterFormations.length > 0
      ? { quarterFormations: input.quarterFormations }
      : {}),
    ...(input.generationMode ? { generationMode: input.generationMode } : {}),
    ...(qps
      ? { quarterPlacements: qps.map((qp) => ({
          quarter: qp.quarter,
          assignments: qp.assignments.slice(0, 15),
        })) }
      : {}),
    ...(quarterBreakdown ? { quarterBreakdown } : {}),
    ...(rotation && rotation.length > 0 ? { playerRotation: rotation } : {}),
    ...(positionChangers && positionChangers.length > 0 ? { positionChangers } : {}),
    ...(slotSharing && Object.keys(slotSharing).length > 0 ? { slotSharing } : {}),
    ...(benchPlayers.length > 0 ? { benchPlayers } : {}),
    ...(input.playerWorkload && input.playerWorkload.length > 0
      ? { playerWorkload: input.playerWorkload }
      : {}),
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
      await persistCoachAnalysis(input.matchId, ruleText, "rule");
      return;
    }

    yield { type: "done", source: "ai", model: MODEL };
    await recordAiUsage({ ...logBase, source: "ai", model: MODEL, ...tokens, latencyMs: Date.now() - started });
    await persistCoachAnalysis(input.matchId, cleaned, MODEL);
  } catch (err) {
    console.error("[aiTacticsAnalysis stream] 호출 실패:", err);
    // 에러 세부 분류 — 사용자/운영자가 원인 파악 가능하게
    const errName = err instanceof Error ? err.name : "unknown";
    const errMsg = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
    const errorReason = errName === "AbortError" ? "aborted"
      : errMsg.includes("rate_limit") || errMsg.includes("429") ? "upstream_rate_limit"
      : errMsg.includes("overloaded") ? "upstream_overloaded"
      : errMsg.includes("timeout") || errMsg.includes("ETIMEDOUT") ? "timeout"
      : "api_error";
    yield { type: "replace", text: ruleText, source: "rule", reason: errorReason };
    yield { type: "done", source: "rule" };
    // source: "error" 로 로그 — checkRateLimit은 source='ai'만 집계하니 차감 안 됨 ✅
    await recordAiUsage({
      ...logBase,
      source: "error",
      model: MODEL,
      latencyMs: Date.now() - started,
      errorReason: `${errorReason}: ${errMsg}`,
    });
    // 에러 폴백도 rule text 로 저장해 재조회 가능하게 (사용자는 어쨌든 본 텍스트이므로)
    await persistCoachAnalysis(input.matchId, ruleText, "rule");
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

  if (stats.playerCareerStats.length > 0) {
    lines.push("\n### 선수별 커리어 (Top 20, 출전 수 기준)");
    for (const p of stats.playerCareerStats.slice(0, 20)) {
      const parts: string[] = [`${p.totalMatches}경기`];
      if (p.totalGoals > 0) parts.push(`${p.totalGoals}골`);
      if (p.totalAssists > 0) parts.push(`${p.totalAssists}어시`);
      if (p.mvpCount > 0) parts.push(`MOM ${p.mvpCount}회`);
      if (p.mostPlayedPosition) parts.push(`주포지션:${p.mostPlayedPosition}`);
      lines.push(`- ${p.playerName}: ${parts.join(", ")}`);
    }
  }

  if (stats.playerPositionStats.length > 0) {
    lines.push("\n### 포지션별 활약 (Top 10)");
    for (const p of stats.playerPositionStats.slice(0, 10)) {
      const extras: string[] = [];
      if (p.goals > 0) extras.push(`${p.goals}골`);
      if (p.assists > 0) extras.push(`${p.assists}어시`);
      const extra = extras.length > 0 ? ` (${extras.join(", ")})` : "";
      lines.push(`- ${p.playerName} ${p.position}: ${p.matches}경기${extra}`);
    }
  }

  if (stats.quarterStats.length > 0) {
    lines.push("\n### 쿼터별 득실 (누적)");
    for (const q of stats.quarterStats) {
      const avgFor = q.matches > 0 ? (q.goalsFor / q.matches).toFixed(1) : "0.0";
      const avgAgainst = q.matches > 0 ? (q.goalsAgainst / q.matches).toFixed(1) : "0.0";
      lines.push(`- ${q.quarter}쿼터: 득 ${q.goalsFor}(평균 ${avgFor}) / 실 ${q.goalsAgainst}(평균 ${avgAgainst}) — ${q.matches}경기`);
    }
  }

  if (stats.recentMatchSummaries.length > 0) {
    lines.push("\n### 최근 3경기 요약 (우리팀 최근 폼)");
    for (const r of stats.recentMatchSummaries) {
      const oppName = r.opponent ?? "미상";
      const formation = r.formation ? ` / ${r.formation}` : "";
      const scorer = r.topScorer && r.topScorerGoals > 0
        ? ` — 최다득점: ${r.topScorer} ${r.topScorerGoals}골`
        : "";
      lines.push(`- ${r.date} vs ${oppName}: ${r.us}-${r.opp} (${r.result})${formation}${scorer}`);
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
