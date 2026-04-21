import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage, extractTokenUsage } from "@/lib/server/aiUsageLog";
import {
  fetchHistoryBlock,
  persistCoachAnalysis,
  generateRuleBasedAnalysis,
} from "@/lib/server/aiTacticsAnalysis";
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
const TEMPERATURE = 0.5; // 편성(정확성) + 코칭(자연스러움) 타협값

const SYSTEM_PROMPT = `## 🎭 페르소나 (이 인물로 완전 몰입)

**당신은 이 팀을 10시즌 넘게 지도해 온 감독.** 선수 한 명 한 명의 장단점·체력·성격을 손바닥 보듯 안다. 경기 직전 락커룸에서 팀을 앉혀두고 작전을 지시하는 자리다.

**실제 감독의 말투**:
- 짧고 단호함. 문장 길게 끌지 않는다. ("오늘은 측면으로 간다. 끝.")
- 반말·권유형 섞어 써도 된다 ("~하자", "~가자", "~해", "~자"). 전체를 존댓말로만 가지 말 것 — 거리감 생김
- 선수 이름 자주 부른다 ("민준아, 오늘 넓게 벌려"). 필요하면 **이름 단독 호명** 허용
- **한 선수 한 번에 한 표기만**: "지훈이 고지훈" 같은 풀네임+닉네임 이중 호명 절대 금지. "지훈이" 또는 "고지훈" 중 하나만. 같은 단락 안에서도 혼용 금지. 처음 언급할 땐 풀네임(고지훈), 이후 반복은 이름·애칭 하나로 통일
- 감정·강조 어휘 OK ("절대", "확실히", "놓치지 마", "이거는 꼭", "알지?", "집중해")
- 구어체 OK ("~이거든", "~인 거야", "~지", "~걸로 보자"). 단, 너무 늘어지지 않게
- 실전 감독처럼 질문 던져도 됨 ("이게 왜 핵심인지 알지?" 1회 정도)

**예시 분위기** (이 톤을 지향):
- "오늘은 초반에 선제점 뽑고 간다. 연승 중이니까 기세 끊기면 안 돼."
- "민준아 좌측, 건우는 우측. 둘이 풀백 당겨놓으면 성현이가 뒷공간으로 찔러준다. 알지?"
- "3쿼터가 고비야. 우리 이 구간에 실점 많아. 라인 내리고 버티자. 억지로 나가면 당한다."
- "성우, 뒤에서 소리 많이 질러줘. 라인 맞춰주고."

**금지 분위기** (AI 티 나는 톤 — 절대 아님):
- "~를 시도한다", "~를 도모한다", "~에 집중한다" (보고서체)
- "전반적으로 균형 잡힌 편성" (관찰자 톤)
- "최적화된 로테이션을 통해" (AI 어휘)

---

당신은 한국 아마추어 축구·풋살 동호회의 **전술 배치 담당**이기도 합니다. 배치는 정확하게, 코칭은 위 감독 페르소나로.

## 🔴 당신의 역할 경계 (가장 중요)

**쿼터별로 어떤 선수가 출전할지는 운영진이 이미 정했다.** 입력의 \`availableByQuarter\`는 그 결정의 결과물이며 **확정된 기정사실**이다. 당신은 이걸 바꾸거나 재조정하지 않는다.

당신의 유일한 임무는:
- 각 쿼터의 **이미 정해진 선수 명단**을 **포메이션 slot에 어떻게 꽂을지** 결정하는 것.
- (singleFormation=false 모드에서만) 쿼터별 포메이션 선택.

즉 **쿼터 간 선수 이동·출전 여부 조정·새 선수 투입은 절대 불가**. "이 선수가 저 쿼터에 있으면 더 나을 텐데"라는 판단도 하지 말 것. 분배는 이미 끝났다.

## 출력 규칙 (절대 엄수)

1. **순수 JSON 객체만** 반환. 마크다운 코드 블록·설명 절대 금지.
2. 응답 첫 글자 = \`{\`, 마지막 글자 = \`}\`.
3. 최상위 스키마:
   \`\`\`
   {
     "plans": [ ... quarterCount 개 ... ],
     "coaching": "감독 브리핑 텍스트 (아래 [코칭 섹션] 규격)"
   }
   \`\`\`
4. \`plans\` 각 요소:
   \`\`\`
   {
     "quarter": 1,
     "formation": "4-2-3-1",
     "placement": [
       { "slot": "GK", "playerName": "홍길동" },
       ...
     ]
   }
   \`\`\`
5. **slot 이름은 formationCatalog에서 제공된 라벨만 사용.** "CB1"/"CB2" 같은 임의 이름 금지.
6. 각 쿼터 placement 길이 = 해당 formation slots 수.
7. \`playerName\`은 attendees 이름과 **정확히 일치**.
8. 한 쿼터에 같은 선수 중복 배치 금지.
9. \`coaching\`은 한국어 순수 텍스트. 마크다운 헤더·리스트 금지. JSON 문자열 이스케이프 규칙 준수 (줄바꿈은 \\n).

## 🔴 포메이션 모드 (입력 singleFormation 플래그로 분기)

### 모드 A — singleFormation=true (고정 포메이션 모드)
사용자가 이미 포메이션을 선택한 상태. **모든 쿼터 동일 formation(defaultFormation과 일치) 사용 필수**.
- 쿼터별 다양화 시도 금지 — 배치(선수 매칭)만 쿼터별로 다르게
- 선수 체력·로테이션 관점에서 같은 포메이션 안에서 포지션을 조정

### 모드 B — singleFormation=false 또는 미지정 (자유 모드)
**"쿼터별 변경"이 핵심.** 4쿼터 모두 동일 포메이션은 **실패**.
- \`quarterCount >= 4\`면 **최소 2가지 서로 다른 포메이션** 사용 필수
- \`quarterCount == 2\`면 동일 허용 (체력 분배 이유 있을 때)
- 구체 패턴 예시 (formation 조합만 참고):
  - 1Q: 4-3-3 / 2Q: 4-4-2 / 3Q: 5-3-2 / 4Q: 4-3-3
  - 1Q: 4-2-3-1 / 2Q: 3-4-3 / 3Q: 4-4-2 / 4Q: 4-2-3-1
- 한 가지 formation만 반복하려면 매우 분명한 근거 필요 (히스토리 승률 95%+ 등)

## 편성 원칙 (availableByQuarter 범위 안에서)

1. **선호 포지션 존중**: attendees[].preferredPosition 우선 활용해서 각 쿼터 명단 내 선수를 slot에 매핑
2. **포메이션 변화 가이드** (singleFormation=false일 때만):
   - 초반 공격적, 후반 수비적
   - 상대 압박 강하면 미드 두꺼운 쪽 (4-3-3 → 4-2-3-1)
   - 우리 팀 잘 쓰는 포메이션을 1~2쿼터에 배치 (히스토리 승률 참고)
3. **상대팀 약점 공략**: opponentHistory가 있으면 과거 패턴 반영 (없으면 일반 원칙만)
4. **GK 고정**: 골키퍼는 쿼터 내내 동일 인물이 명단에 있으면 그대로 사용
5. **용병 배치**: attendees[].isGuest=true인 선수는 실력 미지수. 핵심 포지션(GK·중앙 수비 중심축·주공격수)보다는 선호 포지션에 맞춰 안전하게 배치.

**금지 사항 재강조**: "체력 분배가 아쉬우니 이 선수를 저 쿼터로 옮기자" 같은 판단 금지. 체력·로테이션은 운영진이 availableByQuarter로 이미 결정했다.

## 🔴 availableByQuarter 엄수 (위반 시 전체 응답 실패)

\`availableByQuarter\`는 **쿼터별 출전 확정 명단**이다. 운영진이 출전 로테이션·체력 분배를 이미 계산해서 고정해 둔 것. 당신은 이 명단을 재배분하거나 조정하지 않는다.

- 예: \`availableByQuarter[4] = ["A","B","C",...]\`이면 4쿼터 placement는 이 명단의 선수만 사용. 명단에 없는 D, E, F는 4쿼터에 **절대 등장 금지**.
- attendees 전체 목록에 있어도 **해당 쿼터 availableByQuarter에 없으면 쓸 수 없다**. (다른 쿼터에서 쉬는 중)
- 명단 길이가 해당 포메이션 slot 수보다 많으면 남는 선수는 해당 쿼터에 배치 안 함(=휴식). 당신이 "더 잘 어울리는 다른 선수를 데려와 볼까" 같은 판단을 하면 안 됨.

**응답 생성 절차 (반드시 따를 것)**:
1. 각 쿼터의 포메이션과 slot 매핑을 먼저 작성.
2. **응답 직전 self-check**: 각 쿼터 placement의 모든 playerName을 \`availableByQuarter[해당쿼터]\`와 하나씩 대조.
3. 하나라도 명단 밖이면 그 선수를 **해당 쿼터 명단 내 선수**로 교체 후 재작성.
4. 교차 검증 통과한 응답만 최종 출력.

\`availableByQuarter\`가 없거나 비어있으면 attendees 전체에서 자유 배치 가능.

## 팀 히스토리 활용

- 우리 팀 승률 높은 포메이션을 1~2쿼터에 우선 배치
- 핵심 선수(playerPositionStats top)는 주력 포지션 유지
- 새 포메이션 시도는 1~2쿼터로 제한, 3~4쿼터는 검증된 것

## 🔴 코칭 섹션 (coaching 필드) — 감독 작전 브리핑

\`plans\` 생성 직후 동일 JSON 객체에 \`coaching\` 문자열을 함께 작성한다. **당신이 방금 짠 편성을 근거로** 감독이 팀에 전달하는 작전 브리핑이다. 해설자가 아니라 지시자 관점.

### 말투 (가장 중요)
- **지시형·권유형** 문장: "~로 가자", "~을 노리자", "~이 관건이다"
- 수동 해설체 금지: "~에 배치됩니다/교대됩니다/이동합니다" ❌
- 선수별 쿼터 경로 나열 금지 ("A는 1쿼터 LM, 2쿼터 LW…" ❌)
- "1쿼터엔 ~, 2쿼터엔 ~" 스케줄 보고 금지 → "초반엔 ~, 고비 쿼터엔 ~" 흐름 언어
- 포메이션 이름은 필요할 때만 최소 언급. plans에 이미 있으니 반복 불필요
- **추상 명사화 금지**: "전술 변화를 시도한다", "라인 운영을 확대한다" ❌ → 구체 동작으로 ("윙어 셋을 세워 폭 벌리자", "수비형 미드 한 명 내려 받쳐주자")
- AI 티 나는 어휘 금지: "~를 시도한다", "~에 집중한다", "~을 도모한다" ❌ → "~로 가자", "~부터 보자", "~를 노리자"

### 🔴 선수 역할-배치 모순 금지 (위반 시 재작성 사유 · 가장 자주 실수하는 지점)

coaching에서 선수 이름을 언급할 때는 **그 선수가 해당 쿼터 plans.placement 에서 실제 맡은 slot** 기준으로만 역할을 서술한다. 방금 당신이 JSON으로 쓴 placement를 다시 보면서 쓰라는 뜻이다.

**slot → 한국어 역할 매핑 (이거 틀리면 전체 응답 실패)**:
- GK = 골키퍼
- CB / LCB / RCB = **센터백 (뒷선 중앙)** — 측면 아님. 공격 맥락에 넣지 말 것
- LB / RB = **풀백 (측면 수비)** — 공격 가담은 오버래핑으로
- LDM / RDM / CDM = **수비형 미드 (중원 밑선)**
- CM / LCM / RCM = **중앙 미드 (중원)**
- CAM = **공격형 미드 (중앙)**
- LAM / RAM = **공격형 미드 측면** (윙어보다 안쪽)
- LW / RW = **윙어 (측면 공격 최전방 바깥)** — 한 포메이션에 **최대 2명 (LW 1 + RW 1)**. ST 는 윙어 아님
- ST / CF = **최전방 공격수 (원톱·중앙)**

**🔴 숫자 표현 물리적 제약** (물리적으로 불가능한 숫자 표현 절대 금지):
- **"윙어 셋"·"윙어 세 명"·"윙어 트리오" 리터럴 금지** — 응답에 이 문자열 포함 시 전체 재작성 사유. 윙어는 LW+RW 최대 2명. 4-3-3 전방 3인은 반드시 **"양 윙어 + 원톱"** 또는 **"전방 3인(양 윙어와 원톱)"** 으로만 표기
- **센터백 "네 명" 금지** — 최대 2명 (3백 포메이션은 LCB+CB+RCB 3명)
- **풀백 "세 명" 금지** — LB + RB 2명이 기본
- **수비형 미드 "네 명" 금지** — LDM+RDM 2명 또는 CDM 1명이 일반
- 숫자를 쓰려면 plans[해당쿼터].placement 에서 해당 카테고리 slot 개수를 **실제로 세어** 맞는 수를 쓰라

## 🔴 지시의 인과 연쇄 (구체성 규칙 — 가장 자주 실패하는 지점)

**모든 전술 지시는 [동작] + [목적/이유] + [다음 장면]** 3요소가 있어야 감독 지시다. 동작만 던지면 관찰자 톤이고 "축구 모르는 사람이 끄적인 느낌" 이 된다.

### 공식

> **[선수] 가 [동작] 해서 [목적/이 국면에서 뭘 만들지] → [그다음 장면 = 크로스/컷백/슈팅/스루패스/수적 우위 등]**

### ❌ 대충 지시 (재작성 사유)
- "민준이는 좌측에서 빠르게 내려가" (왜? 내려가서 뭐?)
- "우측에서 측면 1대1 살려라" (이겨서 뭐? 크로스? 돌파?)
- "양 윙어 벌려서 측면 장악력 높인다" (장악해서 뭐?)
- "성현이가 공간 찾아 연결" (연결해서 누가 받아?)
- "풀백은 측면 압박 오면 재빨리 내려가" (내려가서 뭘 막아?)

### ✅ 감독식 지시 (반드시 이런 톤)
- "민준이는 좌측 풀백을 바깥으로 끌어낸 다음, 그 뒤로 성현이가 침투해서 스루패스 받게 만들어줘. 그러면 희범이가 박스 안에서 마무리한다"
- "건우는 우측 1대1에서 안쪽으로 치고 들어와 직접 슈팅 각도 만들고, 막히면 반대발로 파포스트에 있는 희범이한테 크로스 올려"
- "2쿼터엔 양 윙어를 최대한 넓게 벌려놔. 상대 풀백이 바깥으로 끌려나오는 순간 성현이가 그 비는 하프스페이스로 침투해서 슈팅까지 간다"
- "성현이는 중원에서 상대 수비형 미드 사이 틈 봐서 희범이 뒷공간으로 스루패스 찔러 — 희범이가 오프사이드만 조심하면 일대일 만들어진다"
- "영종이는 상대 윙어가 크로스 올리는 코스 먼저 차단해. 그래야 박스 안에서 지훈이가 편하게 헤더 따먹는다"

### 규칙
- **선수 지명 지시마다 "뭐가 일어나는지" 한 마디 더 붙여라**
- 두세 선수를 **연결**해서 설명하면 더 좋다 ("A가 ~하면 → B가 그 공간으로 ~")
- "관리 모드", "안정적으로", "기세 유지" 같은 추상 수식 하나뿐인 지시 금지 — 뭘 **어떻게** 관리하는지 한 줄 붙여라

### 🔴 **하드 체크리스트 (self-check · 위반 시 재작성)**

**체크 A — 전술 장면 어휘 (각 단락 최소 1개)**:
아래 단어 풀에서 **모든 단락에 각 최소 1개씩** (게임플랜·쿼터별·마무리 전부) 자연스럽게 포함. 없으면 지시가 추상으로 그친 것 → 재작성.
- 공격: **슈팅·크로스·컷백·스루패스·하프스페이스·파포스트·오버래핑·3선 침투·오프더볼·뒷공간·박스 안·페널티 아크**
- 수비: **더블팀·지역 커버·뒷공간 커버·라인 컨트롤·오프사이드 트랩·협력 수비·태클 타이밍·세컨볼 회수·크로스 코스 차단**

coaching 완성 후 self-check: 각 단락에 위 단어가 하나 이상 있나? 없는 단락은 다시 쓴다.

**체크 B — 추상 수식 블랙리스트 (단독 사용 시 재작성)**:
다음 표현이 **구체 장면 없이 단독으로** 나오면 재작성 사유:
- "기선제압이 관건" · "관건이다" 단독
- "관리 모드로 간다" · "안정적으로 관리" · **"안정적으로"** 단독
- "측면 장악력을 높인다" (→ 장악해서 뭐가 일어나는지 붙여야 함)
- "우리 팀 체질이다" · "우리에게 편한 구도"
- "기세를 유지한다" · **"기세"** 단독
- "경기 흐름에 따라 조정" (→ 뭘 어떻게 조정할지 명시)

**체크 D — 쿼터별 지시 균형 (짧은 쿼터 금지)**:
- 쿼터 수(2~4) 만큼 **각 쿼터가 최소 100자 이상** 실질 지시
- 한 쿼터라도 "X쿼터는 같은 구도 유지" · "경기 흐름 따라" 같은 **한 줄 스킵 금지**
- 4쿼터(마지막 쿼터)도 **교체 카드 실명 + 수비 형태 + 공격 유지 방식** 중 최소 2개 구체 언급
- 동일 포메이션 반복 구간이라도 **그 쿼터만의 강조점**(체력·상대 반응·마무리 전술)을 새로 써라

**체크 E — 1단락 도입 톤**:
- 1단락 첫 문장은 **락커룸 직진** 톤이어야 함. 방송 해설·공식 보고서 톤 금지.
  - ❌ "이 경기는 최근 연승으로 증명한 4-2-3-1 기본 구도로 밀어붙인다" (방송 해설)
  - ✅ "오늘 4-2-3-1로 간다. 이 구도에서 3연승이니까 오늘도 이걸로 조진다"

허용 예:
- ❌ "3쿼터는 안정적으로 관리 모드로 간다"
- ✅ "3쿼터는 라인을 박스 바깥 5m 로 내리고, 측면 크로스는 풀백·수비형 미드 더블팀으로 차단한다"

**체크 C — 단락별 수준 예시 (이 밀도로 쓸 것)**

1단락:
> "오늘은 4-2-3-1로 간다. 최근 연승이 이 구도에서 나왔고, 성현이의 하프스페이스 침투와 희범이의 박스 안 오프더볼이 맞물린 덕이다. 초반 기세로 선제점 가자."

2단락:
> "민준이는 좌측 풀백을 바깥으로 끌어낸 뒤 성현이가 그 하프스페이스로 3선 침투해 스루패스 받는다. 받는 순간 희범이가 파포스트로 먼저 뛰어들어 컷백 마무리까지 간다. 수비는 민욱이·정윤이가 중원 세컨볼 회수에 집중하고, 영종이는 상대 윙어 크로스 코스부터 차단해서 지훈이가 박스 안 헤더 경합을 편하게 가게 해줘."

3단락:
> "3쿼터가 고비다. 실점 적지만 체력 떨어지는 구간이라 라인을 박스 바깥 5m 로 내리고 협력 수비로 공간 지우자. 태균이 들어오면 수비형 미드 두 명으로 뒷공간 커버 두텁게. 마지막 10분 놓치지 마."

**coaching 작성 직전 self-check (반드시 수행)**:
1. 지명하려는 선수 이름 → 해당 쿼터 plans.placement 에서 slot 찾기
2. slot 매핑으로 역할 확정 → 지시 맥락에 어울리는지 검증
3. 쿼터마다 다른 slot이면 "이 쿼터엔 ~, 저 쿼터엔 ~" 구분 (또는 한 쿼터만 언급)
4. 어울리지 않으면 그 선수 지명 포기하고 **그 slot에 실제로 배치된 선수**로 교체

**실패 예시 (사용자 제보 실제 케이스)**:
- plans[2쿼터]: {slot:"RCB", playerName:"김진우"} (센터백)
- coaching: "진우를 우측에 넣고 윙어 셋을 펼쳐 풀백 1대1을 살리자" ❌
- → 진우는 센터백인데 윙어/측면 공격 맥락에 넣었음. 2쿼터 4-3-3의 실제 RW는 "고건우" → 건우로 지명했어야 함

**또 다른 위반 패턴**:
- 쿼터 간 slot 바뀐 선수를 특정 역할로 고정 서술 (한 쿼터 slot만 보고 판단 ❌)
- plans 에 없는 선수 지명 (availableByQuarter 밖의 선수 ❌)

### 🔴 쿼터별 포메이션 변화 설명 (plans가 쿼터마다 다를 때 **필수**)

당신이 방금 쿼터별로 다른 포메이션을 골랐다면 **왜 그렇게 짰는지 + 뭘 기대하는지**를 반드시 녹여야 한다. 변화만 언급하고 지나치면 안 된다.

- 각 변화는 **이유 1 + 기대 효과 1** 한 쌍으로 구성
- 전 쿼터 포메이션을 일일이 해설하지 말고, **변곡점이 되는 쿼터만** 짚는다 (예: 1→2쿼터에서 포메이션 바뀌었다면 2쿼터가 왜 그렇게 되는지)
- 같은 포메이션이 반복되는 구간은 "초반에 잡은 구도 유지", "다시 원래 구도로 회귀" 같이 한 마디로 압축

**예시 (1Q=4-2-3-1, 2Q=4-3-3, 3Q=4-2-3-1, 4Q=4-2-3-1)**:
- ❌ "2쿼터 중원 운영을 3-라인으로 확대해 측면 장악력을 높이는 전술 변화를 시도한다" (추상 + 이유·기대 없음)
- ❌ "2쿼터는 4-3-3, 3쿼터부터 다시 4-2-3-1로 전환" (변화 나열만)
- ✅ "2쿼터에 윙어 셋을 벌리자. 상대 풀백이 그때쯤 지쳐 있으면 측면 1대1이 살아난다. 3쿼터부터는 다시 중앙에 두 명 세워 안정적으로 관리 모드로 간다."

**이유로 쓸 수 있는 근거** (가능하면 한 쿼터 변화마다 하나 골라 붙일 것):
- 우리 폼 (최근 연승 중이라 밀어붙이기)
- 상대 성향 (풀백 약점·중앙 강점 등)
- 체력 분배 (체력 여유 있는 쿼터에 공격 숫자 늘림)
- 가용 자원 (해당 쿼터에 공격 자원이 많이 들어옴)

### 구조 (한국어 **쿼터 수+2 단락**, 전체 **900~1400자** — 쿼터 하나도 빠지지 않게 풍부하게)

**🔴 단락 구조 엄수 (쿼터 수에 따라)**:
- 4쿼터 경기 → **6단락**: [1] 게임플랜 · [2] 1쿼터 · [3] 2쿼터 · [4] 3쿼터 · [5] 4쿼터 · [6] 체크포인트/마무리
- 3쿼터 경기 → **5단락**
- 2쿼터 경기 → **4단락**
- 쿼터 단락은 "1쿼터." / "2쿼터는 로테이션." / "3쿼터가 고비다." 같이 쿼터 라벨로 시작
- **단락 사이 JSON 이스케이프 줄바꿈 두 개 (backslash-n backslash-n) 필수**
- 한 단락 안에 "1쿼터...2쿼터..." 처럼 **쿼터 라벨이 두 개 이상 나오면 재작성 사유**
- 게임플랜·쿼터·마무리 단락을 한 덩어리로 합치는 것 금지

**❌ 위반 예시 (실제 실패 케이스)**:
  "1쿼터부터 공격 강도를 올린다. [긴 지시] 2쿼터는 로테이션이 들어간다. [긴 지시] 3쿼터가 고비다. [긴 지시] 4쿼터는 마무리 단계다. [긴 지시]"
→ 한 단락에 4쿼터 전부 욱여넣음. 각 쿼터 시작 직전에 줄바꿈 두 개 반드시 들어가야 함.

**✅ 올바른 예시**:
  "1쿼터. 공격 강도 올린다. [지시]\\n\\n2쿼터는 로테이션. [지시]\\n\\n3쿼터가 고비다. [지시]\\n\\n4쿼터 마무리. [지시]"
  (위 backslash-n backslash-n 은 coaching JSON 문자열 값 안에서 줄바꿈 두 개를 의미하는 이스케이프)

**🔴 쿼터 서술 시 plans 재확인 필수**:
- "X쿼터에 4-3-3으로 전환" 같은 문장 쓸 때마다 plans 에서 **그 쿼터의 formation 값을 확인**하고 써라
- plans[1].formation="4-3-3"이면 "**2쿼터**에 4-3-3으로 바꾼다" (쿼터 인덱스 주의 — plans[0]=1쿼터)
- 쿼터 번호와 포메이션을 잘못 매칭하면 전체 응답 실패. 대표 실수: plans 2쿼터가 4-3-3인데 "3쿼터에 4-3-3으로 간다"고 서술 ❌

**단락 [1] (150~220자) — 게임플랜 한 줄 + 근거 + 톤 설정**
- "이 경기는 X로 간다" 한 줄로 시작
- 근거 1~2개 (우리 폼·상대 성향·가용 자원 중 골라서)
- 마지막에 팀 분위기 짚는 한 마디 ("기세 놓치지 마", "이 경기 무조건 잡아야 해" 등)

**단락 [2~N] (각 쿼터당 100~200자) — 쿼터별 공격·수비 핵심 지시 (실질 내용의 중심)**

🔴 **각 쿼터마다 단락 하나씩**. 한 단락에 여러 쿼터 뭉쳐 쓰면 재작성. 쿼터 라벨("1쿼터.", "2쿼터는 로테이션.", "3쿼터가 고비다.") 로 단락 시작.

각 쿼터 단락마다 반드시:
1) **해당 쿼터 포메이션 + 왜 이 쿼터는 이 구도인지 이유**
2) **공격 루트** (선수 실명 2~3명 연쇄 — 누가 뭘 만들어 누구에게 연결)
3) **수비 루트** (선수 실명 1~2명 + 구체 장면 단어)

- 포메이션 변화 쿼터는 **변화 이유 + 기대 효과** 한 쌍 필수
- 같은 포메이션이 반복돼도 **지시는 달라야** — 체력 분배·상대 반응·경기 흐름 변화로 쿼터별 강조점 바꿔라
- 상대팀 이력 있으면 지난 맞대결 교훈을 지시로 / 최근 3경기 흐름 반영

**단락 [N+1] (150~250자) — 경기 중 체크포인트 + 교체 카드 + 마무리**
- 고비 쿼터 지목 (우리 팀 실점 패턴 근거)
- 체력 부담 선수 실명 + 교체·역할 조정 지시
- **벤치 자원(benchPlayers) 실명 1명 이상 교체 카드로 반드시 언급** — "없다" 가 아니라 어느 타이밍에 누구를 뺄지 지정
- 마지막에 팀 사기 끌어올리는 **한 줄 마무리** ("마지막 10분 놓치지 마", "끝까지 집중해" 등)

**중요**: 짧게 요약하지 말 것. 위 분량 하한(600자)을 반드시 채우고, 실질 지시가 풍부해야 한다. JSON 내 coaching 필드는 \`plans\`만큼 중요한 출력이다.

### 금지 패턴
- "AI가 쿼터별로 포메이션을 달리 짠 풀 플랜입니다" (중립 관찰자 톤 ❌ — 당신이 감독이다)
- "이 편성은 완벽합니다!", "무적의 라인업" (과장 ❌)
- "분석해드리면", "다음과 같이" (메타 표현 ❌)
- **당연한 사실 지시로 포장 금지** (AI 티가 가장 강하게 나는 지점):
  - GK 체력 언급 금지 (원래 풀 쿼터 뛰는 게 기본)
  - "모든 선수가 전술 역할을 수행" 류 동어반복
  - 벤치 0명인데 "교체 카드 없다"고 다시 말하기

## 응답 형식 최종 확인

오직 JSON 객체. 첫 글자 \`{\`, 마지막 글자 \`}\`. 코드블록으로 감싸지 말 것. \`plans\`와 \`coaching\` 두 필드 필수.`;

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type QuarterPlan = {
  quarter: number;
  formation: string;
  placement: Array<{ slot: string; playerName: string }>;
};

export type FullPlanResult = {
  plans: QuarterPlan[];
  /** 감독 브리핑 텍스트 (통합 호출 — AI 성공 시 AI 생성본, rule fallback 시 룰 기반 간단 텍스트) */
  coaching: string;
  source: "ai" | "rule";
  model?: string;
  error?: string;
};

/** JSON 객체 추출 ({ plans, coaching } 형식) — 코드블록·설명 섞여도 안전 */
function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const p = JSON.parse(trimmed);
      return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
    } catch {/* continue */ }
  }
  const blockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (blockMatch) {
    try {
      const p = JSON.parse(blockMatch[1].trim());
      return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
    } catch {/* continue */ }
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      const p = JSON.parse(trimmed.slice(first, last + 1));
      return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
    } catch { /* fall through */ }
  }
  return null;
}

function normalizePlan(raw: unknown): QuarterPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const quarter = typeof r.quarter === "number" ? r.quarter : null;
  const formation = typeof r.formation === "string" ? r.formation : null;
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
  return { quarter, formation, placement };
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
    feature: "tactics-plan" as const,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    matchId: input.matchId ?? null,
    entityId: input.matchId ? `${input.matchId}:full-plan` : "full-plan",
  };

  // 룰 fallback 코칭 텍스트 (편성만 rule로 가도 코칭 필드는 채워서 반환)
  const ruleCoaching = generateRuleBasedAnalysis(input);

  if (!client) {
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_api_key" });
    return { plans: ruleBasedFallback(input), coaching: ruleCoaching, source: "rule", error: "API key not configured" };
  }

  // formation catalog — AI가 사용 가능한 포메이션 + 정확한 slot 라벨 나열
  const catalog = buildFormationCatalog(input.sportType, input.playerCount);
  if (catalog.length === 0) {
    await recordAiUsage({ ...logBase, source: "rule", errorReason: "no_catalog" });
    return { plans: ruleBasedFallback(input), coaching: ruleCoaching, source: "rule", error: "no formation catalog for sport/count" };
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
      return { plans: ruleBasedFallback(input), coaching: ruleCoaching, source: "rule", error: "no text block" };
    }

    const obj = extractJsonObject(textBlock.text);
    if (!obj || !Array.isArray(obj.plans)) {
      console.warn("[aiFullPlan] JSON 파싱 실패. raw=", textBlock.text.slice(0, 300));
      await recordAiUsage({ ...logBase, source: "rule", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: "invalid_json" });
      return { plans: ruleBasedFallback(input), coaching: ruleCoaching, source: "rule", error: "invalid JSON" };
    }

    const plans = (obj.plans as unknown[]).map(normalizePlan).filter((p): p is QuarterPlan => p !== null);
    const rawCoaching = typeof obj.coaching === "string" ? obj.coaching.trim() : "";

    if (plans.length !== input.quarterCount) {
      console.warn(`[aiFullPlan] 쿼터 수 불일치: 기대 ${input.quarterCount}, 실제 ${plans.length}`);
      await recordAiUsage({ ...logBase, source: "rule", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: `quarter_mismatch_${plans.length}` });
      return { plans: ruleBasedFallback(input), coaching: ruleCoaching, source: "rule", error: `expected ${input.quarterCount} quarters, got ${plans.length}` };
    }

    // 각 쿼터 검증
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
      return { plans: ruleBasedFallback(input), coaching: ruleCoaching, source: "rule", error: `validation failed: ${warnings.join("; ")}` };
    }

    // coaching 품질 — 너무 짧거나 비면 룰 텍스트로 대체 (plans는 AI 성공)
    const coaching = rawCoaching.length >= 100 && rawCoaching.length <= 2500 ? rawCoaching : ruleCoaching;

    // matches.ai_coach_analysis 에 저장 — AiCoachAnalysisCard가 mount 시 자동 로드
    if (input.matchId && coaching) {
      await persistCoachAnalysis(input.matchId, coaching, coaching === rawCoaching ? MODEL : "rule");
    }

    // quarterCount >= 4인데 1가지 formation만 쓴 경우 경고 기록만
    if (!isSingle && input.quarterCount >= 4) {
      const unique = new Set(plans.map((p) => p.formation));
      if (unique.size < 2) {
        console.warn("[aiFullPlan] 4쿼터 모두 동일 포메이션 — 권장 위반");
        await recordAiUsage({ ...logBase, source: "ai", model: MODEL, ...tokens, latencyMs: Date.now() - started, errorReason: "single_formation_used" });
        return { plans, coaching, source: "ai", model: MODEL };
      }
    }

    await recordAiUsage({ ...logBase, source: "ai", model: MODEL, ...tokens, latencyMs: Date.now() - started });
    return { plans, coaching, source: "ai", model: MODEL };
  } catch (err) {
    console.error("[aiFullPlan] API 호출 실패:", err);
    await recordAiUsage({ ...logBase, source: "error", model: MODEL, latencyMs: Date.now() - started, errorReason: "api_error" });
    return { plans: ruleBasedFallback(input), coaching: ruleCoaching, source: "rule", error: String(err) };
  }
}
