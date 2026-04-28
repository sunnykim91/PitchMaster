# v0 프롬프트 — PitchMaster 킬러 기능 3종 UI

> 풋살/축구 팀 관리 웹앱 **PitchMaster**의 시그니처 기능 3종 디자인 요청.
> 한국어 UI, 다크 모드 전용, 모바일 퍼스트(375px~430px), 데스크탑은 중앙 정렬 카드.
> **목표**: 보는 사람이 0.5초 안에 "와, 이거 뭐야" 가 나오는 톤.
> "이거 갖고 싶다 / 카톡으로 보내고 싶다 / 인스타에 올리고 싶다" 가 본능적으로 나오는 디자인.
> **EA FC ULTIMATE TEAM 카드 × NBA 2K MyCareer 프로필 × NIKE 시즌 리캡 × 스포티파이 Wrapped** 의 감성을 합친 것.

---

## 공통 디자인 토큰

### 브랜드 컬러 (다크 모드 전용)
- Primary(코랄): `hsl(16, 85%, 58%)` — `#e8613a`
- Background: `hsl(240, 6%, 6%)`
- Card: `hsl(240, 5%, 10%)`
- Muted text: `hsl(40, 5%, 62%)`
- Success(승/클린시트): `hsl(152, 55%, 55%)`
- Loss(패): `hsl(0, 65%, 60%)`
- Warning(무): `hsl(38, 85%, 58%)`
- Gold(레어/시상): `#ffd700`
- Silver: `#c0c0c0`, Bronze: `#cd7f32`

### OVR 레이팅 등급 색상
- **ICON (90+)** : Gold `#ffd700` — 전설
- **HERO (80–89)** : Orange `#ff7a45` — 영웅
- **RARE (70–79)** : Teal `#2bd3b5` — 레어
- **COMMON (45–69)** : White — 일반

### 기술 스택
- TypeScript + Tailwind CSS v4 + shadcn/ui
- 다크 모드 전용 (light variant 신경 쓰지 마)
- 한국어 폰트: `Pretendard`, `Noto Sans KR`
- 모바일 375px / 데스크탑 768px 양쪽에서 깨지지 않게
- mock 데이터로 즉시 미리보기 가능

---

## 🎯 3종 공통 — 반드시 지켜야 할 5원칙

### 1. 희소성·등급감 (Rarity)
**카드 자체가 "이 카드는 특별하다"고 외쳐야 함.**

- **홀로그래픽 포일 효과** — Gold(90+) 카드는 무지개 그라디언트가 카드 표면에 흐르는 느낌. CSS `conic-gradient` + `mix-blend-mode: overlay` + 노이즈 텍스처
- **빛 산란 / 광택 streak** — 카드 좌상단에서 우하단으로 흐르는 대각선 하이라이트, 살짝 blur
- **rarity별 외곽 효과**:
  - **ICON (90+)**: 두꺼운 골드 메탈릭 프레임(double border) + 외곽 골드 글로우(box-shadow `0 0 60px gold/30%`) + 카드 뒷배경에 발광하는 후광
  - **HERO (80–89)**: 오렌지/코랄 메탈릭 테두리 + 코랄 글로우
  - **RARE (70–79)**: 청록 holographic + teal 글로우
  - **COMMON (45–69)**: 깔끔한 무광 단색 (대비를 위해 일부러 심심하게)
- **rarity 라벨**을 카드 상단에 작게 — `ICON` / `HERO` / `RARE` / `COMMON` (영문 letter-spacing 넓게)
- **Sparkle/particle 점** 5~10개를 카드 면에 흩뿌림 (특히 ICON 등급)

### 2. 스토리·맥락 라벨 (Story Tags)
**숫자 옆에 반드시 한 줄 맥락을 붙여라.**
사람은 "28골"이 대단한지 모름. "팀 1위 / 역대 2위 / 13경기 연속" 이라고 적어주면 그제서야 자랑이 됨.

- 핵심 스탯 옆에 작은 컨텍스트 chip:
  - `골 28` ← `🏆 팀 1위` 또는 `📈 시즌 최다`
  - `MOM 15` ← `⭐ 역대 1위`
  - `출석률 95%` ← `🔥 17경기 연속`
  - `승률 67%` ← `상위 10%`
- mock 데이터에 이런 라벨 필드 추가:
  ```ts
  type StatWithContext = {
    label: string;
    value: string;
    rank?: string;        // "팀 1위", "상위 5%"
    streak?: string;      // "13경기 연속"
    badge?: "fire" | "trophy" | "rocket" | "crown";
  };
  ```
- 컨텍스트가 있을 때만 chip 표시

### 3. 한 장 안의 위계 (Visual Hierarchy)
- 주연 1개(OVR/주인공 이름) — 압도적 크기, 글로우, 가장 밝게
- 조연 2~3개(핵심 스탯 1~2개 + 포지션) — 중간 크기, 강조 색
- 엑스트라(기타 정보) — 작게, opacity 60% 이하
- **한 화면을 캡쳐했을 때 0.3초 안에 주인공이 누구인지 보이게**

### 4. 모션 없이도 살아있게 (Implied Motion)
v0는 정적 이미지지만, "움직이고 있다"는 인상을 줘야 함.

- 카드 뒤에 흐릿한 motion blur 그라디언트(주인공이 달려나간 자국처럼)
- 빛이 한쪽에서 들어오는 dramatic lighting
- 약간의 vignette (외곽이 어두워짐) — 시선을 중앙으로 모음
- 배경에 매우 흐릿한 축구장/스타디움 라인 패턴 (5% opacity)

### 5. 공유 가능한 "한 장 모드" (Share-Ready)
화면에서 보는 것과 별개로, **공유 버튼 누르면 1080×1920 인스타 스토리 비율 / 1080×1080 정사각형으로 정확히 들어가는 별도 레이아웃**을 같이 디자인.

- **인스타 스토리 모드**: 위 1/3은 카드, 가운데는 핵심 스탯 3개 + 스토리 라벨, 아래 1/3은 팀명·시즌·`pitch-master.app` CTA
- **카톡 OG 모드**: 1200×630 — 좌측에 카드, 우측에 이름·팀·핵심 수치 3개
- "공유하기" 버튼 누르면 이 share-ready 레이아웃이 모달로 등장

---

## 1️⃣ 선수 카드 (Player Card) — "갖고 싶은 한 장"

### 목적
선수 한 명의 시즌 종합 능력치를 한 장의 카드로 보여주고, 인스타·카톡으로 공유할 수 있는 FIFA 스타일 카드. **EA FC ICON 카드의 프리미엄 감성**이 핵심.

### Props
```ts
type PlayerCardProps = {
  ovr: number;                     // 45~99
  rarity: "ICON" | "HERO" | "RARE" | "COMMON";
  positionLabel: string;           // "FW"
  positionCategory: "FW" | "MID" | "DEF" | "GK" | "DEFAULT";
  playerName: string;              // 한글 이름
  jerseyNumber: number | null;
  teamName: string;
  teamPrimaryColor: string;        // hex, 팀 유니폼 컬러
  seasonName: string;              // "2026 시즌"
  photoUrl?: string;               // 선수 사진 (없으면 거대 등번호로 대체)
  signature?: string;              // "15골 8어시 — 시즌 MVP 후보" 자동 생성 캐치프레이즈
  stats: Array<{
    label: string;                 // "골", "어시", "MOM", "출석률", "승률", "경기"
    value: string;                 // "28", "85%", "0.7"
    rank?: string;                 // "팀 1위"
    streak?: string;               // "13경기 연속"
    isHero?: boolean;              // true면 큰 카드로 강조
  }>;
};
```

### 레이아웃 요구사항
- **종횡비 3:4** (예: 360×480 또는 450×600)
- **좌상단**: 거대한 OVR 숫자(72px+, rarity 등급 색, 글로우 + emboss) + 그 아래 포지션 라벨
- **우상단**: 팀 로고 자리(placeholder) + 팀명 작게 + `ICON` / `HERO` rarity 라벨
- **중앙**:
  - 사진이 있으면 선수 사진
  - **사진이 없으면 거대한 등번호 `#7` 을 반투명(300px+, opacity 15%)으로 배치**, 그 위에 이름을 얹음
- **중앙 하단**: 선수 이름(큰 글씨, 한글 4글자 이하면 자간 넓게)
- 이름 아래: **시그니처 한 줄 캐치프레이즈** (예: `"15골 8어시 — 시즌 MVP 후보"`)
- **구분선 아래**: 스탯 영역 — 균등 그리드 금지
  - **핵심 스탯 1개**(`isHero: true`)를 큰 카드로 — 숫자 48px+, primary 색, 옆에 컨텍스트 chip
  - 나머지 5개는 작은 그리드(3×2)로
- **카드 배경**: `teamPrimaryColor` + rarity별 그라디언트 (ICON은 골드 conic-gradient + 노이즈)
- **상단 50% 영역**: 흰색 8% opacity → 0% 광택 오버레이
- **카드 모서리**: 둥글게(rx 24), 외곽 등급별 테두리
- **하단 푸터**: 시즌명 + `PITCHMASTER` 워터마크(letter-spacing 넓게)

### ICON 카드(90+) 전용 강화
- 배경: 골드 ↔ 다크 ↔ 골드 conic-gradient + 노이즈
- 외곽: 두꺼운 골드 메탈릭 프레임(double border, 안쪽 어두움 + 바깥 빛남)
- OVR 숫자: 거대 골드 + text-shadow 글로우 + 미세 emboss
- 카드 뒤 후광: radial-gradient 골드 글로우
- 상단: `★ ICON ★` 또는 `LEGENDARY` 라벨 (작게, letter-spacing 넓게)
- sparkle dot 5~10개 흩뿌림

### 카드 뒷면 (Flip)
- 카드 클릭 시 3D flip (CSS `transform: rotateY(180deg)`)
- 뒷면 내용: 시즌 모든 스탯 표 + 최근 5경기 결과 + "이 카드 공유하기" 버튼
- 모바일에서도 동작

### 4종 등급을 한 페이지에 나란히
**데모 페이지에는 ICON/HERO/RARE/COMMON 4장을 한 페이지에 나란히 배치**. 셀렉터로 1장만 바꾸는 건 금지. 4장이 동시에 보여야 등급 시스템의 매력이 전달됨.

### 액션 버튼 (카드 아래)
- `[ 이미지로 저장 ] [ 공유하기 ]` (outline + filled 코랄)
- 로딩 상태 / 데이터 없음("아직 출전 기록이 없어요") 상태도 같이 디자인

### 포지션별 표시 스탯 (참고 — 백엔드가 넘겨줌)
- **FW**: 골 / 어시 / 공격P / MOM / 출석률 / 경기
- **MID**: 어시 / 골 / MOM / 승률 / 출석률 / 경기
- **DEF**: 클린시트 / 승률 / 출석률 / MOM / 경기당실점 / 경기
- **GK**: 클린시트 / 경기당실점 / 승률 / 출석률 / MOM / 경기

---

## 2️⃣ 시즌 어워드 (Season Awards) — "트로피 시상식"

### 목적
시즌 종료(또는 진행 중) 시점에 팀의 7대 시상 결과를 한 페이지로 보여주는 **어워드 쇼**. 리스트가 아니라 시상식. 인스타 스토리/카톡 공유용.

### API 응답 구조
```ts
type SeasonAwardsResponse = {
  seasonName: string;              // "2026 시즌"
  teamName: string;
  totalMatches: number;
  record: { wins: number; draws: number; losses: number };
  mvp?: {                          // 시즌 MVP — 7개 중 가장 임팩트 있는 1명 자동 선정
    name: string;
    playerCardProps: PlayerCardProps;  // 1️⃣ 컴포넌트 재사용
    signature: string;             // "15골 + 8 MOM — 이 시즌의 주인공"
    keyStats: Array<{ label: string; value: string }>;
  };
  awards: {
    topScorer?:    { label: "득점왕";   name: string; value: number; context?: string };
    topAssist?:    { label: "도움왕";   name: string; value: number; context?: string };
    topMvp?:       { label: "MOM";      name: string; value: number; context?: string };
    topAttendance?:{ label: "출석왕";   name: string; value: string; context?: string };
    ironWall?:     { label: "철벽수비"; name: string; value: number; cleanSheets: number };
    luckyCharm?:   { label: "승리요정"; name: string; value: string; winRate: number };
    bestMatch?:    { label: "베스트매치"; date: string; opponent: string; score: string };
  };
  seasonSummary?: string;          // "우승 후보다운 시즌이었다" 자동 생성 한 줄
};
```
각 award는 **nullable** (데이터 부족 시 빠짐).

### 레이아웃 요구사항

**A. 페이지 최상단 "시즌 인트로" 시퀀스**
영화 타이틀처럼:
```
PITCHMASTER PRESENTS

2026 시즌
FC 피치마스터

THE SEASON
AWARDS
```
- 거대한 타이포그래피, letter-spacing 넓게, 어두운 배경 + 코랄 액센트
- 작은 텍스트로 "총 20경기 · 12승 3무 5패 · 승률 60%"
- vignette + 골드 particle

**B. "시즌 MVP" 슈퍼 카드 (가장 위에 1개)**
- 전체 폭, 높이 320px+
- 좌측: 선수 카드 1️⃣ ICON 등급의 컴팩트 버전
- 우측: `2026 시즌 MVP` 라벨 + 이름(48px+) + 시그니처 스탯 3개 + 한 줄 캐치프레이즈
- 배경: 골드 글로우 + 후광
- 이 카드가 "시즌의 주인공" 역할

**C. 시즌 전적 "성과 리캡" 카드**
단순 W/D/L bar ❌ — 성과 리캡으로 재구성:
- `12W` `3D` `5L` 를 큰 숫자로
- 가장 큰 승리: `vs 강남 FC 7:1` (베스트매치를 여기에 흡수)
- 가장 많은 득점: `김민수 15골`
- 한 줄 요약: `"우승 후보다운 시즌이었다"` (seasonSummary)

**D. 나머지 6개 어워드 갤러리** (2×3 모바일 / 3×2 데스크탑)
각 카드:
- 상단: **거대한 트로피/메달 SVG 일러스트** (아이콘 ❌ 일러스트 ✅, 50px+, 시상별 다른 디자인·색)
  - 득점왕 = 골드 트로피
  - 도움왕 = 실버 메달
  - MOM = 코랄 별
  - 출석왕 = 청록 원형 체크
  - 철벽수비 = 네이비 방패
  - 승리요정 = 핑크 날개
  - 베스트매치 = 오렌지 스코어 카드
- 라벨: `득점왕` (작게, 해당 컬러)
- 수상자: 이름(20px, bold)
- 수치: 큰 숫자 + 단위(`골`, `어시`, `표`, `%`)
- 컨텍스트 chip: "전 시즌 대비 +5골"
- 호버: 살짝 lift + 트로피 살짝 회전(transform)
- 카드 배경: `bg-card`, rarity 글로우

**E. 시즌 셀렉터**
페이지 최상단에 드롭다운 — 활성 시즌 기본값

**F. 페이지 하단 "이 시즌을 하나의 이미지로"**
- 7개 시상 + 전적 + MVP 를 담은 1080×1920 인스타 스토리 카드 **미리보기 모달**
- `[ 스토리로 공유 ]` (Web Share API) / `[ 이미지 저장 ]` (PNG)
- 카톡 공유 시 OG 카드도 같은 무드

**G. 빈 시즌 상태**
"아직 집계된 경기가 없어요" + 일러스트

---

## 3️⃣ 커리어 프로필 (`/player/[memberId]`) — "나의 시즌 리캡"

### 목적
로그인 없이 누구나 볼 수 있는 **선수의 공개 프로필**. 자기를 자랑하고 친구에게 카톡으로 공유하기 좋은 페이지. **링크드인 + EA FC 선수 정보 + 스포티파이 Wrapped** 믹스.

### Props
```ts
type PlayerProfile = {
  name: string;
  teamName: string;
  teamPrimaryColor: string;
  positions: string[];             // ["FW", "ST"]
  jerseyNumber: number | null;
  teamRole: "CAPTAIN" | "VICE_CAPTAIN" | null;
  seasonName: string;              // "2026 시즌"
  signature: string;               // "15골 8어시 — 팀 득점왕" 자동 생성
  playerCardProps: PlayerCardProps;  // 1️⃣ 컴포넌트 재사용
  stats: {
    goals: number;
    assists: number;
    mvp: number;
    attended: number;
    totalMatches: number;
    attendanceRate: number;        // 0~1
    winRate: number;               // 0~1
    cleanSheets: number;
    attackPoints: number;
    // 컨텍스트
    goalsRank?: string;            // "팀 1위"
    assistsRank?: string;
    attendanceStreak?: number;     // 13
    goalStreak?: number;           // 5
  } | null;
  bestMoments: Array<{             // 신규 — 시즌 베스트 모먼트
    kind: "bestMatch" | "firstGoal" | "streak";
    headline: string;              // "vs 강남 FC, 5:2 승"
    detail: string;                // "본인 2골 1어시"
    date: string;
  }>;
  recentMatches: Array<{
    date: string;
    opponent: string;              // "FC 상대팀" 또는 "자체전"
    score: string;                 // "5:2"
    result: "W" | "D" | "L";
    goals: number;
    assists: number;
    mvp: boolean;
    isHighlight: boolean;          // 2골+ 또는 MOM이면 true
  }>;
};
```

### 레이아웃 요구사항

**A. 히어로 섹션 — "영화 인트로" (100vh)**
- 배경: 팀 컬러 그라디언트 + 흐릿한 스타디움 라이트 + 노이즈 + 축구장 라인 5% opacity
- 상단 작은 overline: `2026 시즌`
- 중앙: **거대한 선수 이름** `clamp(48px, 12vw, 96px)`, 한글 자간 넓게
- 그 아래 한 줄: `FC 피치마스터 · FW · #10 · 18경기 출장`
- 역할 뱃지: 주장/부주장 (있을 때만)
- 그 아래 **시그니처 한 문장**:
  - `"15골 8어시 — 팀 득점왕"`
  - `"5경기 연속 MOM에 빛난 스트라이커"`
  - `"승률 82%, 그가 뛰면 팀은 이긴다"`
- 우상단: 작은 `PITCHMASTER` 워터마크
- 하단: 아래로 향한 화살표(scroll cue)

**B. 시즌 다이제스트 — "소유감 있는 카드 영역"**
- **선수 카드(1️⃣)를 실제 사이즈로 박아넣기** (compact 버전 ❌)
- 카드 옆/아래에 **핵심 4지표를 거대 숫자로**:
  - `15` 골 — chip `🏆 팀 1위`
  - `8` 어시 — chip `상위 10%`
  - `82%` 출석률 — chip `🔥 13경기 연속`
  - `67%` 승률
- 이 영역이 페이지의 두 번째 핵심 hit

**C. 시즌 통계 상세**
- 가로형 stat bar: `골 15 · 어시 8 · MOM 3`
- 출석률/승률은 **원형 progress**(라디언트 코랄/청록)
- 출전: `18 / 22 경기` 분수 표기
- 보조 chip: `클린시트 3` `공격P 23`

**D. "시즌 베스트 모먼트" 섹션 (신규)**
3개 카드 (가로 슬라이드 또는 세로):
- **베스트 경기**: "vs 강남 FC, 5:2 승" / "본인 2골 1어시" / 날짜
- **시즌 첫 골**: 경기명 / 상대 / 날짜
- **연속 기록**: "13경기 연속 출장" 또는 "5경기 연속 득점"
- 각 카드: 큰 숫자 + 짧은 문구 + 날짜
- **인스타 reels 썸네일 느낌** (16:9 또는 4:5), 각자 다른 그라디언트

**E. 최근 경기 타임라인**
- 단순 리스트 ❌ → **세로 타임라인**
- 좌측에 세로 라인, 각 경기마다 dot
- 활약 경기(`isHighlight: true`)는 dot이 코랄 + 옆에 ⭐, 카드 높이 크게
- 평범한 경기는 작게 (압축)
- 각 경기 카드:
  - 결과 뱃지 (승/무/패, 색 구분)
  - 상대팀 + 스코어 (큰 글씨)
  - 날짜 (작게)
  - 본인 활약을 큰 이모지로: ⚽⚽ 🅰️ ⭐
- 자체전이면 "자체전"으로 표시 (opponent 대신)

**F. 푸터 "내 카드 가져가세요" CTA**
큰 코랄 카드:
- "이 시즌의 내 카드를 다운로드"
- `[ 친구에게 공유 ]` `[ 우리 팀에도 PitchMaster ]`
- 작은 부제: "회원 가입 없이도 누구나 자기 시즌 카드를 만들 수 있습니다"

**G. Sticky 공유 버튼 (모바일)**
- 하단 fixed `[ 내 카드 공유하기 ]` 코랄
- 누르면 share modal: 인스타 스토리 / 카톡 / URL 복사

**H. 빈 상태**
- `stats === null`: "아직 시즌이 시작되지 않았어요" 일러스트 + 팀명·포지션만
- `recentMatches.length === 0`: 최근 경기 섹션 숨김

### SEO/공유
- 카톡/인스타로 링크 공유 시 OG 카드가 잘 보이게 큰 히어로 이미지 + 이름·팀·핵심 수치 요약

---

## 톤 키워드

**꼭 살릴 단어**:
시상식 · 트로피 · 골드 포일 · 홀로그래픽 · 스타디움 라이트 · 영화 타이틀 · 프리미엄 · 한정판 · 자랑 · 소장 · EA FC ICON · NBA 2K MyCareer · NIKE 시즌 리캡 · 스포티파이 Wrapped

**피해야 할 단어**:
깔끔한 / 모던 / 미니멀 / 세련된 / 대시보드 / 카드 UI
→ "잘 만든 대시보드"가 되면 실패. 트로피·포스터·기념품이 되어야 함.

---

## 산출물 형식

4개 파일:

1. **`PlayerCard.tsx`** — rarity 4종(ICON/HERO/RARE/COMMON)을 한 페이지에 나란히 보여주는 demo, flip 지원
2. **`SeasonAwardsPage.tsx`** — 영화 인트로 + MVP 슈퍼 카드 + 성과 리캡 + 6개 어워드 갤러리
3. **`PlayerProfilePage.tsx`** — 히어로 100vh + 시즌 다이제스트 + 베스트 모먼트 + 타임라인 + sticky 공유
4. **`ShareCard.tsx`** — 1080×1920 인스타 스토리 비율 공유 카드 (3종 모두에서 재사용)

각 컴포넌트 요구사항:
- TypeScript + Tailwind CSS v4 + shadcn/ui
- 다크 모드 전용
- props 타입은 위 명세 그대로
- mock 데이터로 즉시 미리보기 가능
- 모바일 375px / 데스크탑 768px 양쪽에서 깨지지 않게
- 3개 컴포넌트가 한 톤으로 묶이는 통일된 디자인 시스템

---

## ⚠️ 가장 중요한 제약

**보는 사람이 0.5초 안에 "와, 이거 뭐야"가 나오는 톤이어야 함.**

"잘 만든 깔끔한 카드"가 나오면 실패. 차라리 과해도 됨. EA FC ICON 카드를 떠올려보고, 그 프리미엄·레어템 감성을 흡수한 뒤 작업해줘. 한국 팀 스포츠 감성 + 코랄 액센트 + 골드 포일. 사용자는 이 페이지를 인스타 스토리에 올리고 싶어해야 하고, 친구에게 카톡으로 "나 이거 봐봐"라고 보내고 싶어해야 함.
