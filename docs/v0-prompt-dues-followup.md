# v0 추가 프롬프트 — 회비 페이지 보완

현재 결과물을 기반으로 아래 항목들을 보완해주세요. 기존 구조와 레이아웃은 유지하되, 빠진 기능과 디자인 디테일을 추가합니다.

---

## 1. 상단 잔고 카드 — featured card 스타일 적용

잔고 카드에 코랄 gradient overlay가 빠져있습니다. 아래처럼 수정해주세요:

- 카드 배경: `bg-gradient-to-br from-[hsl(16,85%,58%)]/12 to-transparent` (코랄 15% 오버레이)
- 잔고 금액: font-family `Bebas Neue` (또는 tabular-nums + font-black), 크기 clamp(2rem, 6vw, 3rem)
- "최종 업데이트" 텍스트: `text-xs text-muted-foreground` → `text-sm text-muted-foreground/80`으로 살짝 키우기
- 카드 border: `border border-white/6` (현재 border가 너무 안 보임)

---

## 2. 평회원 전용 — 내 납부 상태 카드 (완전 누락)

잔고 카드 아래, 탭 바 위에 평회원일 때만 보이는 카드를 추가해주세요:

```
┌─────────────────────────────────────┐
│ 2026.04 내 납부 상태       < 04 >   │
│                                     │
│ ┌─ 납부 완료일 때 ────────────────┐ │
│ │ ✅ 납부 완료            30,000원 │ │
│ │    (success 색상 텍스트)         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ 미납일 때 ─────────────────────┐ │
│ │ 미납                    30,000원 │ │
│ │ (loss 색상)      [입금했어요 💬] │ │
│ │    → 버튼 클릭 시 운영진에게     │ │
│ │      알림 전송 (API: POST       │ │
│ │      /api/dues/notify-paid)     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ 면제일 때 ─────────────────────┐ │
│ │ 면제                             │ │
│ │ (warning 색상, italic)           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- 월 좌우 이동: `< >` 화살표, **min-h: 44px** 터치 타겟
- "입금했어요" 버튼: `variant="outline"`, loss 색상 border, 미납일 때만 표시
- 카드 스타일: 기본 card와 동일 (rounded-xl, bg-card, border border-white/4)

---

## 3. 입출금 탭 — 수기 입력 폼 펼친 상태

수기 입력 폼을 펼쳤을 때의 전체 UI를 보여주세요:

```
┌─ 수기 입력 (펼침) ─────────────────┐
│                                     │
│ [유형]          [금액]              │
│  입금/지출 ▼     숫자 Input         │
│                  (₩ prefix)         │
│                                     │
│ [내용]                              │
│  예: "4월 회비", "구장 대여비"       │
│                                     │
│ [회원 선택]         [날짜]          │
│  Select ▼           date picker    │
│  (지출이면 숨김)                    │
│                                     │
│        [저장] (primary button)      │
└─────────────────────────────────────┘
```

- 유형 Select: 입금(success), 지출(loss) — 선택 시 색상 변경
- 금액 Input: `type="number"`, 앞에 "₩" 접두사, `text-right`
- 회원 선택: 유형이 "지출"이면 숨기기 (지출은 회원 매칭 불필요)
- 날짜: 기본값 오늘, date input
- 저장 버튼: `w-full`, primary color
- 모든 Input/Select: `h-12 rounded-xl bg-secondary border-0`

---

## 4. 입출금 탭 — 거래 카드 디테일

거래 카드의 텍스트 스타일을 보완해주세요:

- 1줄 (설명): `text-sm font-semibold text-foreground`
- 2줄 (날짜 · 멤버): `text-xs text-muted-foreground` 중 **멤버 이름만** `font-semibold text-foreground/80`
- 3줄 (금액 + 뱃지): 우측 정렬
  - 입금: `text-[hsl(var(--success))] font-bold` + Badge(`bg-success/15 text-success`)  "입금"
  - 지출: `text-[hsl(var(--loss))] font-bold` + Badge(`bg-loss/15 text-loss`) "지출"
- 금액 포맷: `+30,000원` / `-150,000원` (부호 포함, 콤마 구분)

---

## 5. 납부현황 탭 — 디테일 보완

### 프로그레스 바
- 현재 파랑→초록 그라데이션 → **단색 success** 색상으로 변경
- 바 배경: `bg-muted/30`, 바 fill: `bg-[hsl(var(--success))]`
- 바 높이: `h-3 rounded-full`

### 장기 미납자 카드
- 현재 너무 약함 → 배경을 `bg-[hsl(var(--loss))]/10 border border-[hsl(var(--loss))]/20`으로 강화
- ⚠️ 아이콘: `text-[hsl(var(--loss))]`
- 이름 사이 콤마 구분, 연속 미납 개월 수 표시: "홍길동 **(3개월)**, 김철수 **(2개월)**"

### 회원별 카드
- 미납 회원에도 **미납 금액** 표시: "미납 30,000원" (loss 색상)
- 면제 회원: "면제" 뱃지 + 면제 사유 텍스트 (있을 경우)
- 납부 완료 회원의 금액은 `text-muted-foreground` (강조 불필요)

---

## 6. 내역 올리기 탭 — OCR 결과 테이블 + 중복 감지

### OCR 인식 결과 테이블 (사진 업로드 후 표시)

```
┌─────────────────────────────────────┐
│ 인식 결과 (3건)            [전체 저장]│
│                                     │
│ ┌─ row 1 ─────────────────────────┐ │
│ │ 날짜: [2026-04-05]              │ │
│ │ 유형: [입금 ▼]    금액: [30,000]│ │
│ │ 내용: [4월 회비]                │ │
│ │ 회원: [김데모 ▼]     [삭제 🗑️]  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ row 2 (중복 의심) ────────────┐  │
│ │ ⚠️ 기존 내역과 중복 의심        │  │
│ │ (날짜/금액 일치: 2026-04-05     │  │
│ │  30,000원 김데모)               │  │
│ │ 날짜: [2026-04-05]             │  │
│ │ ...                            │  │
│ │ [건너뛰기]  [그래도 저장]       │  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

- 각 행: 편집 가능한 Input/Select (bg-secondary, rounded-xl)
- 회원 매칭: 이름 유사도로 자동 매칭, Select로 수정 가능
- 중복 의심: `border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5` 카드
- 삭제 버튼: 해당 행만 제거
- "전체 저장" 버튼: primary, 상단 우측

### 엑셀 업로드 후 미리보기

엑셀 파일 선택 후 동일한 테이블 형태로 미리보기 표시. OCR과 같은 UI 재사용.

---

## 7. 설정 탭 — 면제 설정 + 회원 검색

### 회비 유형 카드
- 각 유형의 금액을 **직접 수정 가능한 Input**으로 표시 (현재 텍스트처럼 보임)
- Input 스타일: `bg-transparent border-0 text-right font-semibold` + 포커스 시 `border-b border-primary`
- 삭제(×) 버튼: `h-8 w-8` 최소 터치 타겟

### 면제 설정 추가

회원별 회비 유형 Select에 **"면제"** 옵션 추가:
- "면제" 선택 시 아래에 사유 입력 Input 표시: `placeholder="면제 사유 (선택)"`
- 면제 회원은 Select가 warning 색상 border

### 회원 검색
- 회원 수가 많을 때를 위해 **검색 Input** 추가 (회원별 회비 유형 섹션 상단)
- `placeholder="회원 검색"`, `rounded-xl bg-secondary`, Search 아이콘

---

## 8. 공통 디자인 보완

### 탭 바
- `position: sticky; top: 0; z-index: 10`
- `backdrop-blur-md bg-background/80`
- 현재 활성 탭: `border-b-2 border-primary font-semibold text-primary`
- 비활성 탭: `text-muted-foreground`

### 빈 상태 (Empty State)
각 탭에 데이터가 없을 때 표시할 빈 상태 디자인을 추가해주세요:

- **입출금 탭**: 아이콘 📋, "아직 거래 내역이 없습니다", "내역 올리기 탭에서 추가하세요" + [내역 올리기] CTA 버튼
- **납부현황 탭**: 아이콘 👥, "회비 설정을 먼저 완료해주세요", [설정으로 이동] CTA 버튼
- **내역 올리기 탭**: (이미 업로드 영역이 빈 상태 역할)

### 스켈레톤 로딩
데이터 로딩 중 표시할 스켈레톤을 각 탭별로 추가해주세요:
- 잔고 카드: 금액 자리 `Skeleton h-10 w-48`, 수지결산 3줄 `Skeleton h-4 w-full`
- 거래 리스트: 카드 3개 반복 (`Skeleton h-20 w-full rounded-xl`)
- 납부현황: 프로그레스 바 + 회원 카드 5개 스켈레톤

### 카드 border 통일
모든 카드: `border border-white/[0.04]` (현재 일부 카드에 border가 없거나 너무 약함)

---

## 9. 인터랙션 디테일

- 월 이동 `< >` 화살표: `min-h-[44px] min-w-[44px]` 터치 타겟, hover 시 `bg-secondary` 피드백
- Select 드롭다운: `bg-card border border-white/[0.06]` (배경과 구분)
- 버튼 press 피드백: `active:scale-[0.97] transition-transform`
- 수기 입력 토글: 펼칠 때 `animate-in slide-in-from-top-2`, 접을 때 `animate-out`
- 거래 카드: `hover:bg-secondary/50 transition-colors` (터치 피드백)
