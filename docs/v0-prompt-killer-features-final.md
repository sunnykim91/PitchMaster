# v0 프롬프트 — PitchMaster 킬러 기능 3종 UI (완전판)

> 풋살/축구 팀 관리 웹앱 **PitchMaster**의 시그니처 기능 3종 디자인.
> 한국어 UI, 다크 모드 전용, 모바일 퍼스트(375px), 데스크탑 중앙 정렬.
> **이전 결과물에서 발견된 문제점을 모두 반영한 최종 버전.**

---

## ⚠️ 이전 결과물에서 발견된 문제 — 반드시 회피할 것

| 문제 | 원인 | 해결 요구 |
|------|------|----------|
| OVR 숫자가 충분히 크지 않음 | text-5xl/6xl → 카드의 주인공이 아님 | **text-7xl sm:text-8xl 이상**, 압도적 글로우 |
| 카드 배경 그라디언트가 어두운 배경에 묻힘 | conic-gradient opacity 0.3~0.4 | **ICON: 0.5~0.6, HERO: 0.4~0.5** |
| sparkle dots가 부족하고 작음 | 5~10개, 단일 사이즈 | **ICON 18+개, HERO 8+개, 크기 3~4종 랜덤** |
| 시그니처 카피("15골 8어시 — 시즌 MVP")가 너무 작음 | text-xs, white/60 | **text-sm 이상, rarity별 포인트 컬러, 따옴표 감싸기** |
| 등번호 워터마크 거의 안 보임 | opacity 0.12~0.15 | **0.2~0.25 + 글로우, 카드 시각 중심 역할** |
| 카드 뒷면(flip) 하단 잘림 | 6개 stats row가 aspect-[3/4] 카드를 넘침 | **패딩 p-3~4, stats row py-1.5, space-y-0, 텍스트 축소** |
| MVP 슈퍼 카드 영역에서 PlayerCard 잘림 | overflow-hidden + 좁은 max-w | **overflow 허용, max-w-[260px]+** |
| 베스트 모먼트 카드 빈 영역 | aspect-[4/5] + justify-end → 상단 80% 빔 | **가로형 카드(flex row), 좌측 아이콘+우측 텍스트** |
| 공유 카드 미리보기 모바일 짤림 | 고정 px 사이즈 > 화면 너비 | **가로 스크롤 컨테이너 또는 반응형 scale** |
| 선수 시각 요소 부재 | 등번호 워터마크만 | **추상 선수 실루엣 SVG 5종 필수** |
| 메탈릭 노이즈 안 보임 | noise-overlay opacity 0.03 | **0.08~0.12, ICON은 0.15** |
| 카드 모서리 장식 없음 | EA FC 카드의 모서리 마름모/별 없음 | **ICON/HERO/RARE 각각 다른 모서리 장식** |
| 접근성 색상 대비 미달 | text-white/30, text-white/40 다수 | **최소 white/50, 작은 텍스트는 white/60 이상** |
| 어워드 갤러리 1순위가 안 드러남 | 모든 카드 같은 사이즈 | **1순위를 col-span-2 + featured 모드** |

---

## 공통 디자인 토큰

### 브랜드 컬러 (다크 모드 전용)
- Primary(코랄): `hsl(16, 85%, 58%)` — `#e8613a`
- Background: `hsl(240, 6%, 6%)`
- Card: `hsl(240, 5%, 10%)`
- Muted text: `hsl(40, 5%, 62%)` — **white/30 금지, 최소 white/50**
- Success: `hsl(152, 55%, 55%)`
- Loss: `hsl(0, 65%, 60%)`
- Warning: `hsl(38, 85%, 58%)`

### OVR 등급 색상
- **ICON (90+)**: Gold `#ffd700` → **text-yellow-300** (더 밝게)
- **HERO (80–89)**: Orange `hsl(16,90%,68%)` (기존보다 밝게)
- **RARE (70–79)**: Teal `text-teal-300` (기존보다 밝게)
- **COMMON (45–69)**: White/80

### 기술 스택
- TypeScript + Tailwind CSS v4 + shadcn/ui
- 다크 모드 전용 (light variant 무시)
- 한국어 폰트: `Pretendard`, `Noto Sans KR`
- 외부 라이브러리 최소화 — `cn()` (clsx+twMerge) 유틸만 사용
- mock 데이터로 즉시 미리보기 가능

---

## 🎯 5대 디자인 원칙

### 1. 압도적 시각 임팩트 (0.3초 법칙)
OVR 숫자가 카드의 25~30% 면적을 차지. text-7xl~8xl + 진한 글로우 + emboss.
"이 카드는 특별하다"가 한 눈에 보여야 함.

### 2. 선수 실루엣 (신규 — 가장 중요)
등번호 워터마크만으론 카드 중앙이 너무 허전함.
**추상 선수 실루엣 SVG** 5종(FW/MID/DEF/GK/DEFAULT)을 카드 중앙에 배치.
- 역동적 자세 (골 넣기/드리블/태클/세이브/기본)
- 단색 path, currentColor 사용
- opacity 0.15~0.25로 배경 레이어
- 등번호 워터마크와 함께 또는 대체

### 3. rarity별 격차 극대화
ICON 카드 옆에 COMMON을 두면 **"같은 카드 시스템이지만 격이 다르다"**가 즉시 보여야 함.
- **ICON**: 골드 conic-gradient(0.5+) + 18+ sparkle + shimmer 광택 + 모서리 마름모 + 3겹 글로우(80/140/200px) + 강한 메탈릭 노이즈
- **HERO**: 코랄 그라디언트(0.4+) + 8 sparkle + 2겹 글로우 + 모서리 사각형
- **RARE**: 청록 홀로그래픽(0.35+) + 5 sparkle + 2겹 글로우 + 모서리 별
- **COMMON**: 무광 단색, 글로우/sparkle 없음 (대비용으로 일부러 심심하게)

### 4. 스토리·맥락 라벨 (숫자 옆 한 줄 자랑)
"28골"이 대단한지 모름. "🏆 팀 1위"라고 적어주면 그제서야 자랑이 됨.
- 핵심 스탯 옆에 `rank?` / `streak?` chip
- chip 배경색 `bg-white/15`, 폰트 `text-[10px]`, `whitespace-nowrap`
- 컨텍스트가 있을 때만 표시

### 5. 접근성 (WCAG AA)
- **text-white/30 금지** — 최소 `white/50`
- 작은 텍스트(12px 이하)는 `white/60` 이상
- `text-[8px]` 금지 — 최소 `text-[9px]`, 권장 `text-[10px]+`
- rarity 라벨/시그니처는 포인트 컬러 (yellow-300, coral, teal-300 등)

---

## 1️⃣ 선수 카드 (PlayerCard) — "갖고 싶은 한 장"

### Props
```ts
type StatWithContext = {
  label: string;
  value: string;
  rank?: string;        // "🏆 팀 1위", "상위 5%"
  streak?: string;      // "🔥 13경기 연속"
  badge?: "fire" | "trophy" | "rocket" | "crown";
  isHero?: boolean;     // true면 큰 카드로 강조
};

type PlayerCardProps = {
  ovr: number;                     // 45~99
  rarity: "ICON" | "HERO" | "RARE" | "COMMON";
  positionLabel: string;           // "FW"
  positionCategory: "FW" | "MID" | "DEF" | "GK" | "DEFAULT";
  playerName: string;
  jerseyNumber: number | null;
  teamName: string;
  teamPrimaryColor: string;        // hex
  seasonName: string;
  photoUrl?: string;
  signature?: string;              // "15골 8어시 — 시즌 MVP 후보"
  stats: StatWithContext[];
};
```

### 카드 앞면 레이아웃 (종횡비 3:4)
1. **좌상단: OVR** — `text-7xl sm:text-8xl font-black` + rarity별 text-shadow 글로우 + `tracking-tighter`
2. **좌상단 OVR 아래: 포지션** — `text-sm sm:text-base font-bold`
3. **우상단: rarity 라벨** — `LEGENDARY` / `HERO` / `RARE` / `COMMON` + tracking 넓게
4. **우상단 아래: 팀 배지** — 첫 글자 + 팀 컬러 배경, rounded-xl
5. **중앙: 선수 실루엣 SVG** — `positionCategory`에 따라 자동 선택, opacity 0.15~0.25
   - 실루엣 뒤에 등번호 워터마크 함께 배치 가능 (선택)
   - `photoUrl`이 있으면 실루엣 대신 사진
6. **중앙 하단: 이름** — `text-2xl sm:text-3xl font-black` + `drop-shadow-lg`
   - 3글자 이하면 `tracking-[0.2em]`
7. **이름 아래: 시그니처** — `text-sm sm:text-[15px] italic font-medium` + rarity별 포인트 컬러 + `"따옴표"`
8. **구분선** — `bg-gradient-to-r from-transparent via-white/30 to-transparent`
9. **Hero stat 1개** — `isHero: true` 인 스탯을 `text-4xl sm:text-5xl` 큰 카드로, 우측에 context chip
10. **나머지 5개** — `grid-cols-5 gap-1.5`, 각 셀 `text-base sm:text-lg` 값 + `text-[9px]` 라벨
11. **푸터** — 시즌명 + PITCHMASTER 워터마크

### 카드 뒷면 (flip) — **잘림 방지 핵심**
- `p-3 sm:p-4` (좁은 패딩)
- 헤더: rarity 라벨 `text-[9px]` + 이름 `text-xl sm:text-2xl` + 팀·시즌 `text-[11px]`
- stats: 6개 행, 각 `py-1.5`, `space-y-0`, border-b
- 값: `text-base sm:text-lg`, 라벨: `text-xs`
- 푸터: `pt-2` + `text-[9px]`
- **aspect-[3/4] 안에 6개 stats + header + footer가 반드시 다 들어가야 함. 잘리면 실패.**

### 메탈릭/이펙트 CSS 클래스 (globals.css에 정의)
```css
/* 필요한 커스텀 클래스들 — 컴포넌트에서 className으로 사용 */
@keyframes holographic { ... }
@keyframes card-shimmer-slide { ... }  /* 기존 shimmer와 이름 충돌 방지 */
@keyframes sparkle { ... }
@keyframes glow-pulse { ... }
@keyframes float { ... }

.holographic-bg { ... }
.card-shimmer::before { ... }  /* 대각선 광택 streak */
.sparkle { animation: sparkle 2s ease-in-out infinite; }
.glow-gold / .glow-coral / .glow-teal { box-shadow 3겹 }
.text-glow-gold / .text-glow-coral / .text-glow-teal { text-shadow 3겹 }
.noise-overlay::after { ... }  /* 노이즈 텍스처, opacity 0.03 — 카드용은 더 강하게 */
.metallic-noise::after { ... } /* 카드 전용 강한 노이즈, opacity 0.08~0.15 */
.perspective-1000 / .preserve-3d / .backface-hidden / .rotate-y-180  /* 3D flip */
.vignette::before { ... }      /* 외곽 어두움 */
.stadium-pattern { ... }       /* 축구장 라인 그리드 */
.scrollbar-hide { ... }
```

### 모서리 장식 (EA FC 카드 시그니처)
카드 4 모서리에 작은 도형 (absolute, top/bottom + left/right, 2/2):
- ICON: 골드 마름모 `◇` (8×8px, yellow-400)
- HERO: 코랄 사각형 (6×6px, primary)
- RARE: 청록 별 `✦` (6×6px, teal-400)
- COMMON: 없음

### 4종 데모 레이아웃
- **모바일**: 세로 stack, ICON을 가장 위에 크게(max-w-[320px]), 아래 HERO/RARE/COMMON
- **데스크탑**: ICON을 hero로 큰(450×600) 상단 배치, 아래 3장 thumbnail(220×290)

### 포지션별 mock 데이터 (4종 전부 채워야 함)
```ts
// ICON (FW)
{ ovr: 92, rarity: "ICON", positionLabel: "FW", positionCategory: "FW",
  playerName: "김민수", jerseyNumber: 10, teamName: "FC 피치마스터",
  teamPrimaryColor: "#e8613a", seasonName: "2026 시즌",
  signature: "15골 8어시 — 시즌 MVP 후보",
  stats: [
    { label: "골", value: "15", rank: "🏆 팀 1위", isHero: true },
    { label: "어시", value: "8", rank: "상위 10%" },
    { label: "공격P", value: "23", streak: "🔥 5경기 연속" },
    { label: "MOM", value: "5" },
    { label: "출석률", value: "95%", streak: "13경기 연속" },
    { label: "경기", value: "19" },
  ] }
// HERO (MID), RARE (DEF/CDM), COMMON (GK) — 모두 비슷한 구조로 채워야 함
```

---

## 2️⃣ 선수 실루엣 SVG (별도 파일)

**파일**: `components/pitchmaster/PlayerSilhouettes.tsx`

5개 포지션별 추상 실루엣 SVG 컴포넌트:
- `<FwSilhouette />` — 공격수: 슈팅 자세 (찬 발이 펴진 순간)
- `<MidSilhouette />` — 미드필더: 드리블/패스 모션
- `<DefSilhouette />` — 수비수: 태클·차단 자세
- `<GkSilhouette />` — 골키퍼: 다이빙 세이브
- `<DefaultSilhouette />` — 기본: 서 있는 모습

요구사항:
- `viewBox="0 0 200 280"` (3:4 비율)
- **단색 path만** (`currentColor`), fill 또는 stroke
- 디테일 최소화 — 윤곽선 + 자세만 (얼굴/옷 디테일 X)
- 추상적이지만 **역동적·강렬** — NBA 2K MyCareer 메뉴 실루엣 참고
- props: `{ className?: string; style?: React.CSSProperties }`

헬퍼:
```ts
export function getSilhouetteByPosition(
  cat: "FW" | "MID" | "DEF" | "GK" | "DEFAULT"
): React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
```

**이 파일이 전체 작업의 핵심입니다.** 실루엣이 빈약하면 나머지 모든 작업이 무의미.

---

## 3️⃣ 시즌 어워드 (SeasonAwardsPage)

### Props
```ts
type Award = {
  label: string;
  name?: string;          // bestMatch는 name 대신 opponent 사용
  value?: number | string;
  context?: string;
  cleanSheets?: number;
  winRate?: number;
  date?: string;
  opponent?: string;
  score?: string;
};

type SeasonAwardsResponse = {
  seasonName: string;
  teamName: string;
  totalMatches: number;
  record: { wins: number; draws: number; losses: number };
  mvp?: {
    name: string;
    playerCardProps: PlayerCardProps;
    signature: string;
    keyStats: Array<{ label: string; value: string }>;
  };
  awards: {
    topScorer?: Award;
    topAssist?: Award;
    topMvp?: Award;
    topAttendance?: Award;
    ironWall?: Award;
    luckyCharm?: Award;
    bestMatch?: Award;
  };
  seasonSummary?: string;
};
```

### 레이아웃
1. **인트로 시퀀스** — 영화 타이틀처럼 거대한 타이포 (`THE SEASON AWARDS`)
2. **MVP 슈퍼 카드** — **overflow-hidden 사용 금지**, PlayerCard `max-w-[260px]+`
3. **시즌 성과 리캡** — W/D/L 큰 숫자 + seasonSummary 한 줄
4. **어워드 갤러리** — grid-cols-2, **1순위(첫 항목)를 col-span-2 featured 모드**: 좌측 큰 트로피 SVG(w-20~24) + 우측 큰 이름·수치
5. **공유 CTA** — "이 시즌을 하나의 이미지로" + 스토리 공유 / 이미지 저장

### 트로피 SVG 일러스트 (7종)
각 어워드별 고유 SVG 아이콘 (기존 lucide-react 아이콘 X, 커스텀):
- 득점왕: 골드 트로피
- 도움왕: 실버 메달
- MOM: 코랄 별
- 출석왕: 청록 원형 체크
- 철벽수비: 네이비 방패
- 승리요정: 핑크 날개
- 베스트매치: 오렌지 스코어 카드

---

## 4️⃣ 커리어 프로필 (PlayerProfilePage) — "나의 시즌 리캡"

### Props
```ts
type PlayerProfile = {
  name: string;
  teamName: string;
  teamPrimaryColor: string;
  positions: string[];
  jerseyNumber: number | null;
  teamRole: "CAPTAIN" | "VICE_CAPTAIN" | null;
  seasonName: string;
  signature: string;
  playerCardProps: PlayerCardProps;
  stats: { goals, assists, mvp, attended, totalMatches, attendanceRate, winRate, cleanSheets, attackPoints, goalsRank?, assistsRank?, attendanceStreak?, goalStreak? } | null;
  bestMoments: Array<{ kind: "bestMatch"|"firstGoal"|"streak", headline, detail, date }>;
  recentMatches: Array<{ date, opponent, score, result: "W"|"D"|"L", goals, assists, mvp, isHighlight }>;
};
```

### 레이아웃
1. **히어로 (min-h-screen min-h-[100svh])** — 영화 인트로
   - 배경: 팀 컬러 그라디언트 + 스타디움 라이트(blur-[100px]) + 축구장 라인 5% + 노이즈 + vignette
   - 거대한 이름: `clamp(48px, 14vw, 96px)`, 한글 자간 넓게, font-weight 900
   - 시그니처 한 줄: primary color, italic, text-lg+
   - 하단: scroll cue (↓ + SCROLL)

2. **시즌 다이제스트** — PlayerCard 실제 사이즈 + 핵심 4지표 큰 숫자 + context chip
3. **시즌 통계** — 출석률/승률 원형 progress, 가로 stat bar
4. **베스트 모먼트** — **가로형 카드**(flex row): 좌측 이모지(w-16~20, bg-gradient 박스) + 우측 텍스트 + sparkle dots 6개
5. **최근 경기 타임라인** — 세로 라인 + dot, 활약 경기(isHighlight) 크게 + 코랄 dot
6. **Sticky 공유 버튼** — 모바일 하단 fixed 코랄
7. **빈 상태** — stats === null: "아직 시즌이 시작되지 않았어요"

---

## 5️⃣ 공유 카드 (ShareCard) — 3종 포맷

### Props
```ts
type ShareCardData = {
  variant: "story" | "square" | "og";
  playerName: string; teamName: string; seasonName: string;
  teamPrimaryColor: string;
  ovr?: number; rarity?: "ICON"|"HERO"|"RARE"|"COMMON";
  positionLabel?: string; jerseyNumber?: number | null;
  signature?: string;
  stats?: Array<{ label: string; value: string; rank?: string }>;
  record?: { wins: number; draws: number; losses: number };
};
```

### 3종 카드 사이즈
- **Story**: 1080×1920 (미리보기 320×568)
- **Square**: 1080×1080 (미리보기 360×360)
- **OG**: 1200×630 (미리보기 480×252)

모든 미리보기에 `rounded-2xl` + MiniPlayerCard width 충분히 (Story: w-40, Square: w-36, OG: w-32).
OG 카드는 모바일 화면보다 넓을 수 있음 → **데모 페이지에서 가로 스크롤 컨테이너** 필수.

### ShareModal
탭으로 story/square/og 전환 + "이미지 다운로드" / "링크 복사" / "카톡 공유" 버튼 3개.

---

## 산출물 — 6개 파일

1. **`PlayerSilhouettes.tsx`** — 5개 SVG + 헬퍼 함수 (가장 중요)
2. **`PlayerCard.tsx`** — 모든 이전 문제 해결 + 실루엣 통합 + 메탈릭 노이즈 + 모서리 장식
3. **`SeasonAwardsPage.tsx`** — MVP 잘림 해결 + 1순위 featured + 트로피 SVG 7종
4. **`PlayerProfilePage.tsx`** — 히어로 100vh + 가로형 베스트 모먼트 + sparkle + 접근성
5. **`ShareCard.tsx`** — 3종 사이즈 + 가로 스크롤 + ShareModal
6. **`globals.css` 추가분** — keyframes + utility 클래스 (기존 shimmer와 이름 충돌 피해 `card-shimmer-slide` 사용)

---

## 톤 키워드

**꼭 살릴 단어**: EA FC ICON · NBA 2K MyCareer · 골드 포일 · 홀로그래픽 · 한정판 · 트로피 · 시상식 · 스타디움 라이트 · 프리미엄 · 소장 · 자랑

**피해야 할 단어**: 깔끔한 / 모던 / 미니멀 / 세련된 / 대시보드 / 카드 UI → "잘 만든 대시보드"가 나오면 실패

---

## ⚠️ 최종 확인 — 이것만 기억하세요

1. **선수 실루엣 SVG 5종이 이 작업의 핵심**. 카드 중앙에 강렬한 시각 요소가 없으면 공유 욕구가 안 생깁니다.
2. **카드 뒷면이 잘리면 안 됩니다.** aspect-[3/4] 안에 6개 stats가 반드시 다 보여야 합니다.
3. **ICON 카드를 보는 사람이 0.3초 안에 "와 이거 뭐야"를 떠올려야 합니다.** 차라리 과해도 됩니다.
4. **모든 텍스트는 white/50 이상.** white/30, white/40은 접근성 미달입니다.
