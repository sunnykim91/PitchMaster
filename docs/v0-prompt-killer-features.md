# v0 프롬프트 — 킬러 기능 3종 UI 리뉴얼

> 풋살/축구 팀 관리 앱 **PitchMaster**의 시그니처 기능 3종 디자인 리뉴얼 요청.
> 백엔드 API와 데이터 산출 로직은 이미 구현 완료. v0는 **UI/시각 디자인만** 새로 만들면 됨.
> 전체적으로 "EA FC(피파) 카드"의 프리미엄·레어템 감성과 PitchMaster의 코랄 액센트를 결합한 무드.

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
- Bronze: `#cd7f32`, Silver: `#c0c0c0`

### OVR 레이팅 색상 등급 (선수 카드)
- 90+ : Gold `#ffd700` (Icon)
- 80–89 : Orange `#ff7a45` (Hero)
- 70–79 : Teal `#2bd3b5` (Rare)
- 45–69 : White (Common)

### 모바일 우선
- 기준 폭 375px–430px, 최대 640px(데스크탑은 중앙 정렬 카드)
- 한국어 폰트: `Pretendard`, `Noto Sans KR`
- Tailwind 기준 컴포넌트로 작성, shadcn/ui 사용 OK

---

## 1️⃣ 선수 카드 (Player Card) — FIFA 스타일 SVG 카드

### 목적
선수 한 명의 시즌 종합 능력치를 한 장의 카드로 보여주고, 인스타·카톡으로 공유 가능한 이미지로 만든다. 현재는 `/api/player-card?memberId=...&seasonId=...` 가 SVG를 600×800으로 직접 생성하지만 디자인이 단조롭다. **v0에서는 React 컴포넌트로 같은 데이터를 받아 렌더링하는 카드 UI**를 만들어줘.

### Props (API 응답과 동일한 구조)
```ts
type PlayerCardProps = {
  ovr: number;               // 45~99
  positionLabel: string;     // "FW" | "MID" | "DEF" | "GK"
  positionCategory: "FW" | "MID" | "DEF" | "GK" | "DEFAULT";
  playerName: string;        // 한글 이름
  jerseyNumber: number | null;
  teamName: string;
  teamPrimaryColor: string;  // hex, 팀 유니폼 컬러
  seasonName: string;        // "2026 시즌"
  // 6개 스탯 (포지션에 따라 라벨/키 다름)
  stats: Array<{
    label: string;           // "골", "어시", "MOM", "출석률", "승률", "경기" 등
    value: string;           // 이미 포맷된 문자열 ("12", "85%", "0.7" 등)
  }>;
};
```

### 레이아웃 요구사항
- **종횡비 3:4** (예: 360×480 또는 450×600), 하나의 카드 컨테이너 안에 모두 표시
- 좌상단: **OVR 큼지막한 숫자**(72px+, OVR 등급 색상) + 그 아래 포지션 라벨
- 우상단: 팀 로고 자리 + 팀명(작게)
- 중앙 상단: 선수 일러스트 자리(빈 placeholder div, 추후 photo 삽입 가능하게)
- 중앙 하단: **선수 이름** (큰 글씨, 한글 4글자 이하면 글자 사이 띄어쓰기)
- 그 아래 등번호(`#7` 형태)
- 구분선 아래: **6개 스탯을 3×2 그리드**로 배치 — 각 셀은 라벨(작게, opacity 60%) + 값(굵게, 32px)
- 카드 배경: `teamPrimaryColor` 기반 그라디언트(좌상단 밝게 → 우하단 어둡게)
- 상단 50% 영역에 살짝 광택(흰색 8% opacity → 0%) 오버레이
- 카드 모서리 둥글게(rx 24), 외곽 미세한 골드/실버 테두리(OVR 등급에 따라)
- 하단 푸터: 시즌명 + `PITCHMASTER` 워터마크(letter-spacing 넓게)

### 변형(variant)
- **OVR 90+ 골드 카드** : 배경에 미세한 sparkle/노이즈, 골드 테두리 2px
- **OVR 80–89 히어로 카드** : 오렌지 글로우
- **OVR 70–79 레어 카드** : 청록 글로우
- **OVR 45–69 일반 카드** : 깔끔한 단색

### 추가 요구
- 카드 아래 액션 버튼 영역: `[ 이미지로 저장 ] [ 공유하기 ]` (outline + filled)
- 모바일에서 카드 전체가 한 화면에 들어오게 (vh 안 넘게)
- 로딩 상태 / 데이터 없음("아직 출전 기록이 없어요") 상태도 같이 디자인

### 참고할 데이터 (포지션별 표시 스탯)
- **FW**: 골 / 어시 / 공격P / MOM / 출석률 / 경기
- **MID**: 어시 / 골 / MOM / 승률 / 출석률 / 경기
- **DEF**: 클린시트 / 승률 / 출석률 / MOM / 경기당실점 / 경기
- **GK**: 클린시트 / 경기당실점 / 승률 / 출석률 / MOM / 경기

---

## 2️⃣ 시즌 어워드 (Season Awards) — 7종 시상 페이지

### 목적
시즌 종료(또는 진행 중) 시점에 팀의 7대 시상 결과를 한 페이지로 보여주는 어워드 쇼 느낌. `/api/season-awards?seasonId=...` 가 데이터를 내려준다. 인스타 스토리/카톡 공유용 카드 SVG도 별도 엔드포인트(`/api/season-award-card`)가 있지만, **여기서는 앱 내 어워드 페이지 UI**가 핵심.

### API 응답 구조
```ts
type SeasonAwardsResponse = {
  seasonName: string;          // "2026 시즌"
  teamName: string;
  totalMatches: number;        // 시즌 내 완료 경기 수
  record: { wins: number; draws: number; losses: number };
  awards: {
    topScorer?:    { label: "득점왕";   name: string; value: number };       // 골 수
    topAssist?:    { label: "도움왕";   name: string; value: number };       // 어시 수
    topMvp?:       { label: "MOM";      name: string; value: number };       // MVP 표
    topAttendance?:{ label: "출석왕";   name: string; value: string };       // "92%"
    ironWall?:     { label: "철벽수비"; name: string; value: number; cleanSheets: number };
    luckyCharm?:   { label: "승리요정"; name: string; value: string; winRate: number };  // "78%"
    bestMatch?:    { label: "베스트매치"; date: string; opponent: string; score: string }; // 최다 골차 승리
  };
};
```

각 award는 **null 가능**(시즌 데이터 부족 시 빠짐). 비어 있는 어워드는 표시하지 않거나 placeholder.

### 레이아웃 요구사항
- 상단 히어로: **시즌명** + **팀명** + **시즌 전적 카드**
  - `12승 3무 5패` 형태, 승률 % 함께
  - 작은 막대 그래프(승/무/패 비율)
- 그 아래 **7개 어워드 카드**를 세로로 나열 (모바일은 1열, 태블릿+ 2열)
- 각 어워드 카드:
  - 좌측: 큼지막한 **트로피/메달 아이콘** (시상별 다른 컬러 — 득점왕=골드, 도움왕=실버, MOM=코랄, 출석왕=청록, 철벽수비=네이비, 승리요정=핑크, 베스트매치=오렌지)
  - 중앙: **시상 라벨**(작게) + **수상자 이름**(크게, bold)
  - 우측: **수치**(36px+, primary 컬러) + 단위(작게, 예: "골", "어시", "표", "%")
  - 베스트매치는 이름 대신 `vs OPPONENT 5:1` + `2026.04.05` 표시
- 카드 배경: `bg-card`, hover 시 살짝 lift + 코랄 글로우
- 7개 카드 아래에 **공유 액션**: `[ 어워드 카드 이미지로 저장 ] [ 인스타 스토리로 공유 ]`
- 페이지 최상단에 시즌 셀렉터(드롭다운 — 활성 시즌이 기본값)

### 필요한 추가 컴포넌트
- **어워드 카드 컴포넌트** (단독 재사용)
- **빈 시즌** 상태 — "아직 집계된 경기가 없어요" + 일러스트
- **공유 카드 미리보기 모달** — 7개 시상을 1080×1920 인스타 스토리 비율로 묶은 1장의 카드 미리보기

---

## 3️⃣ 개인 커리어 프로필 (`/player/[memberId]`)

### 목적
로그인 없이 누구나 볼 수 있는 **선수의 공개 프로필 페이지** — 자기 자신을 자랑하고, 친구에게 카톡으로 공유하기 좋은 페이지. 현재 디자인은 너무 plain. **링크드인 + EA FC 선수 정보 페이지**를 섞은 느낌으로 리뉴얼.

### 데이터 (서버 컴포넌트에서 props로 내려옴)
```ts
type PlayerProfile = {
  name: string;
  teamName: string;
  positions: string[];           // ["FW", "ST"]
  jerseyNumber: number | null;
  teamRole: "CAPTAIN" | "VICE_CAPTAIN" | null;
  seasonName: string;            // "2026 시즌"
  stats: {
    goals: number;
    assists: number;
    mvp: number;
    attended: number;            // 출전 경기 수
    totalMatches: number;        // 시즌 총 경기 수
    attendanceRate: number;      // 0~1
    winRate: number;             // 0~1
    cleanSheets: number;
    attackPoints: number;        // goals + assists
  } | null;
  recentMatches: Array<{
    date: string;                // "2026-04-05"
    opponent: string;            // "FC 상대팀" or "자체전"
    score: string;               // "5:2"
    result: "W" | "D" | "L";
    goals: number;
    assists: number;
    mvp: boolean;
  }>;
};
```

### 레이아웃 요구사항

**1) 히어로 섹션 (상단 1뷰)**
- 큰 배경: 팀 컬러 그라디언트 + 살짝 축구장 라인 패턴(0.05 opacity)
- 가운데: **선수 이름**(거대한 글씨, 한글 자간 넓게), 팀명·포지션·등번호·완장(주장/부주장 뱃지)
- 우상단 모서리: 작은 PitchMaster 워터마크
- 시즌 이름은 상단 overline 라벨로

**2) 시즌 다이제스트 카드**
- "2026 시즌" 라벨
- **OVR 미니 카드** 자리(선수 카드 1️⃣ 의 컴팩트 버전 — 가로형 200×120 정도)
- 그 옆 또는 아래에 **핵심 4지표 큰 숫자 그리드**:
  - 골 / 어시 / 출석률 / 승률
- 작은 보조 지표(승률, MOM, 클린시트, 공격P)는 그 아래 chip 형태로

**3) 시즌 통계 상세 (collapsible 아님, 그냥 보이게)**
- 가로형 stat bar: `골 12 · 어시 8 · MOM 3` 식
- 출석률, 승률은 **원형 progress** (라디언트 코랄)
- 출전: `18 / 22 경기` (분수 표기)

**4) 최근 경기 타임라인 (최대 10경기)**
- 카드/리스트 형태, 각 경기마다:
  - 좌측: 결과 뱃지(승=success, 무=warning, 패=loss)
  - 중앙: 상대팀 + 스코어 + 날짜
  - 우측: 본인 활약(⚽ × N, 🅰️ × N, ⭐ MOM 표시)
- 시즌 내내 활약을 한눈에 — 마치 EA FC 매치 히스토리

**5) 푸터 CTA**
- "이 선수의 카드가 마음에 드시나요?" + `[ 우리 팀에도 PitchMaster 도입하기 ]` 코랄 버튼
- 작은 텍스트로 `pitch-master.app` 링크

### 빈 상태
- `stats === null` (시즌 경기 0개): "아직 시즌이 시작되지 않았어요" 일러스트 + 팀명·포지션만 표시
- `recentMatches.length === 0`: 최근 경기 섹션 자체를 숨김

### SEO/공유
- 카톡/인스타로 링크 공유 시 OG 카드가 잘 보이도록 큰 히어로 이미지 + 이름·팀·"12골 8어시" 요약이 보이는 구조
- 페이지는 30분 ISR (이미 적용됨)

---

## 산출물 형식

각 기능별로 아래 파일을 만들어줘:

1. **`PlayerCard.tsx`** — 1️⃣ 선수 카드 컴포넌트 (props 받아서 렌더)
2. **`SeasonAwardsPage.tsx`** — 2️⃣ 시즌 어워드 페이지 (mock data 포함 데모)
3. **`PlayerProfilePage.tsx`** — 3️⃣ 커리어 프로필 페이지 (mock data 포함 데모)
4. **`PlayerCardCompact.tsx`** — 3️⃣ 안에 들어갈 가로형 미니 OVR 카드

각 컴포넌트는:
- TypeScript + Tailwind CSS v4 + shadcn/ui
- 다크 모드 전용 (light variant 신경쓰지 마)
- props 타입은 위 명세 그대로
- mock 데이터로 즉시 미리보기 가능
- 모바일 375px / 데스크탑 768px 양쪽에서 깨지지 않게

## 디자인 톤 키워드
**프리미엄 · 트로피 · 광택 · 코랄 액센트 · 한국 팀 스포츠 감성 · EA FC × 링크드인 × 인스타 스토리**

가능하면 3종이 한 톤으로 묶이는 통일된 디자인 시스템(같은 그라디언트·같은 카드 모서리·같은 폰트 위계)을 보여줘.
