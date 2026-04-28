# 0명에서 700명으로 — 광고비 거의 안 쓰고 89팀 만든 이야기

> PitchMaster 개발기 시리즈 3편 — 사용자를 어떻게 모았나

[1편](https://velog.io/@sunnykim91/pitchmaster-1)에서 왜 만들었는지, [2편](https://velog.io/@sunnykim91/pitchmaster-2)에서 기술 삽질을 풀었어요. 이번엔 **마케팅 거의 안 한 1인 개발자가 어떻게 89팀 700+ 명까지 키웠는지** 정리합니다.

> **저는 개발자고 마케터가 아닙니다. 광고 돌릴 돈도 거의 없었어요.**

---

## 시작점: 우리 팀 1개

처음엔 우리 팀 1개였어요. 매주 카톡 공지방 참석 투표·엑셀 회비 정리가 지긋지긋해서 직접 만든 웹앱.

기능이 어느 정도 굴러가자 다른 팀도 쓸 수 있게 열기로 했습니다. 문제는 **"어떻게 알릴까"**.

---

## 첫 외부 팀 — 지인 루트 1마디

처음 외부 팀이 가입한 건 지인 루트였어요.

> "너희 팀 총무 힘들어하던데 이거 한번 써봐"

그 팀이 한 주 써보고 **"괜찮네"** 했을 때, 시스템이 한 명만의 도구가 아니라는 걸 확인한 순간이었습니다.

그때까지 막연했던 가설:

> "조기축구 총무는 다 비슷한 일로 고생한다."

우리 팀과 완전히 다른 팀도 "회비 정리 너무 귀찮다" 똑같이 말하는 걸 듣고 확신했어요.

---

## 메인 채널 1: 네이버 조기축구 카페

본격 외부 유입은 **네이버 조기축구 카페** 였어요. 몇 개 카페에 **경험담 형식 글**을 올렸습니다.

### 광고 티 내면 즉시 차단

조기축구 카페는 스팸에 매우 민감해요. 글 형식을 이렇게 짰습니다:

```
제목: "총무 4년차입니다. 참석확인 어떻게 하세요?"

본문 흐름:
1) 우리 팀에서 매주 겪는 문제 공감
2) 이것저것 시도했는데 안 됨
3) 그래서 직접 만들어 써봄
4) 팀원들 반응
5) 본문 마지막에 한 줄 링크
```

핵심은 **"광고 티 내지 말 것"**:
- 본문 중간에 링크 X
- 제품 자랑 X
- "여러분도 쓰세요" X
- 그냥 4년차 총무가 자기 경험 공유하듯이

### 결과는 극과 극

- 어떤 카페: 댓글 50개+, 가입 문의 다수
- 어떤 카페: 광고 신고 → 글 삭제 → 블랙

신고당한 카페는 다시 안 올렸어요. **반응 좋은 카페만 남기고 거기에 집중.**

---

## 메인 채널 2: 입소문 루프

이게 진짜 동력이었어요.

```
팀 총무 1명 가입
  ↓
그 팀 회원 20~30명 자동으로 링크 받음
  ↓
참석 투표 / 회비 확인 위해 링크 클릭
  ↓
다른 팀도 운영하는 사람 일부가 발견
  ↓
"우리 팀도 써볼래"
```

특히 **카카오톡 공유 기능**이 컸습니다. 참석 투표 링크를 카톡방에 공유하면 그 방의 다른 사람들이 PitchMaster를 처음 보게 됩니다. **의도 없는 광고 채널**이 하나 생긴 셈.

게다가 같은 카페 안에서 추천 한 번 돌면 가입 수가 톡 튀어요. 1명이 들어오면 보통 1~2주 후에 그 사람이 다른 팀 총무 1명을 데려오는 패턴이 보였습니다.

---

## 총무한테 먹히는 메시지: "30분 → 30초"

여러 카피를 돌려본 끝에 **시간 절감 숫자**가 가장 잘 꽂혔어요.

```
참석 확인:  30분 → 30초
회비 정산:  30분 → 1분
라인업 짜기:  20분 → 3초
```

> **"효율적이에요"** 보다 **"30분이 1분 된다"** 가 훨씬 먹힙니다.

이걸 랜딩 Hero 섹션에 배지로 박제했고, 카페 글에도 이 숫자 3개를 앞세웠어요. **추상적 장점은 스킵되지만 구체 숫자는 기억에 박힙니다.**

---

## 데모 모드가 전환률을 두 배로 올렸다

초기엔 가입 흐름이 이랬어요:

```
랜딩 → 카카오 로그인 → 팀 생성 → 메뉴 확인
```

전환률이 낮았어요. **로그인 단계에서 이탈**하는 사람이 많았습니다. "뭐 하는 건지도 모르고 로그인부터 하라고?" 의심.

### 해결: "둘러보기" 버튼

로그인 없이도 샘플 팀 데이터로 앱 전체 체험 가능하게 했어요. 데모엔 **FC DEMO**라는 가상 팀이 있고, 경기 기록·회비 이력·라인업·AI 기능 전부 작동합니다.

```
데모 도입 전:
  랜딩 100 → 로그인 시도 12 → 팀 생성 7

데모 도입 후:
  랜딩 100 → 둘러보기 34 → 로그인 시도 18 → 팀 생성 11
```

데모를 본 사람이 로그인까지 가는 비율이 훨씬 높아요. **"일단 뭐가 되는지 보자"** 의 힘입니다.

---

## 소셜프루프: 팀 수 카운터 1개의 효과

랜딩 Hero 바로 밑에 이 한 줄 박았어요:

```tsx
<Badge>89개 팀 · 700+ 회원이 사용 중</Badge>
```

처음엔 이거 없이 돌렸는데, 배지 추가 후 가입률이 눈에 띄게 올라갔습니다.

이유는 단순해요. 조기축구 총무는 **실패 위험을 극도로 경계**합니다.

> "도입했다가 팀원들이 귀찮아하면 어쩌지"
> "이상한 거 쓴다고 욕먹으면 어쩌지"

이게 가장 큰 저항선이에요. 다른 팀이 이미 쓰고 있다는 신호 하나가 그 저항을 확 낮춥니다. **"89팀이 쓰면 우리도 써도 되겠네"** 가 자연스럽게 나옵니다.

### 구현 팁

이 카운터를 매번 DB 쿼리하면 부하 걸리니까 **`unstable_cache` 1시간 캐시** 적용:

```tsx
const getSocialProof = unstable_cache(
  async () => {
    const [teams, members] = await Promise.all([
      db.from("teams").select("id", { count: "exact", head: true }).neq("id", DEMO_TEAM_ID),
      db.from("team_members").select("id", { count: "exact", head: true })
        .neq("team_id", DEMO_TEAM_ID)
        .in("status", ["ACTIVE", "DORMANT"]),
    ]);
    return { teamCount: teams.count, memberCount: members.count };
  },
  ["social-proof"],
  { revalidate: 3600 }  // 1시간
);
```

데모 팀 제외하는 거 잊으면 숫자가 부풀려져요. 😅

---

## 실패한 시도들

### ❌ 1. 인스타 광고 (1차 시도)

예산 1만 5천원 돌렸는데:
- 도달 518명
- 프로필 방문 58명
- 팔로우 9명
- **실제 가입 5명** (방문당 ₩172)

**조기축구 총무가 인스타에서 팀 관리 앱을 적극적으로 찾지는 않더라고요.** 인지도 빌딩엔 도움 됐지만 즉시 가입 전환은 약함. 다음엔 광고 목표를 "프로필 방문" → "트래픽 / 전환"으로 바꿔서 재시도 예정.

### ❌ 2. 유튜브 간접 홍보

조기축구 채널 영상에 댓글 달기 시도. 스팸 신고만 여러 번. 즉시 폐기.

### ❌ 3. 페이스북 그룹

연령대가 안 맞았어요. 조기축구 총무는 30~50대인데 페이스북 그룹은 비활성화 상태가 많았습니다.

### ❌ 4. 다음카페

네이버 카페보다 활성도 낮아 효과 적음. 시간 대비 ROI 약함.

---

## 채널 1~2개에 집중하는 게 답

돌아보면 **"채널 하나만 집중하는 게 답"** 이었어요.

- 메인: 네이버 조기축구 카페 + 입소문 루프
- 보조: 인스타 광고 (브랜드 인지)

이 둘에 집중한 뒤부터 성장이 꾸준해졌습니다. 나머지는 시간만 빼앗기는 결과.

> **1인 개발자한텐 "선택과 포기"가 마케팅 그 자체**예요.

---

## SEO 인프라 — 광고 비용 ZERO 채널

장기적으로 가장 가성비 좋은 채널은 결국 **검색**이에요.

### 구글 / 네이버 등록

- Google Search Console + 네이버 서치어드바이저 사이트 등록
- `sitemap.xml` 자동 생성 (Next.js `app/sitemap.ts`)
- `robots.txt` 인증 영역(/dashboard, /matches 등) disallow → "크롤링됨, 색인 미생성" 정리
- 각 정적 페이지(`/login`, `/privacy`, `/terms`, `/guide`)에 **canonical 태그 명시**

### 1인 개발자가 빠지기 쉬운 함정

```ts
// ❌ 절대 하면 안 됨
async redirects() {
  return [{
    source: "/:path*",
    has: [{ type: "host", value: "www.pitch-master.app" }],
    destination: "https://pitch-master.app/:path*",
    permanent: true,
  }];
}
```

저는 이거 추가했다가 **Vercel/Cloudflare가 이미 처리하던 www→non-www redirect와 핑퐁 → ERR_TOO_MANY_REDIRECTS 라이브 다운** 한번 겪었어요. **인프라 단 처리 + 코드 단 처리 동시에 하면 절대 안 됨.**

---

## GA4 + 이벤트 설계

13개 커스텀 이벤트 정의:

```ts
export const GA = {
  // 가입 퍼널
  landingView: () => trackEvent("landing_view"),
  demoStart: () => trackEvent("demo_start"),
  loginClick: (source: string) => trackEvent("login_click", { method: "kakao", source }),
  onboardingComplete: () => trackEvent("onboarding_complete"),
  teamCreate: (teamName: string) => trackEvent("team_create", { team_name: teamName }),
  teamJoin: (method: string) => trackEvent("team_join", { method }),

  // 핵심 기능 사용
  matchCreate: (matchType: string) => trackEvent("match_create", { match_type: matchType }),
  voteComplete: (vote: string, source: string) => trackEvent("vote_complete", { vote_type: vote, source }),
  duesRecordAdd: (method: string) => trackEvent("dues_record_add", { method }),

  // 리텐션
  pushSubscribe: (enabled: boolean) => trackEvent("push_toggle", { enabled }),
  pwaInstall: () => trackEvent("pwa_install"),
};
```

가장 중요한 4개 (`demo_start`, `landing_view`, `login_click`, `team_create`)를 GA4 "주요 이벤트(전환)"로 표시. 광고 ROI 측정의 기준점.

### App Router page_view 함정

Next.js App Router에선 **gtag 자동 page_view가 클라이언트 라우팅을 못 잡습니다.** SPA 페이지 이동 시 source/medium이 모두 `(not set)` 으로 잡혀버려요.

```tsx
// 1) layout.tsx에서 자동 발화 차단
gtag('config', GA_ID, { send_page_view: false });

// 2) usePathname 변경 시 직접 발화
"use client";
export function GAPageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);
  return null;
}
```

이거 빠뜨리면 GA에서 "내부 페이지 이동이 다 referrer 없는 direct로 잡히는" 황당한 데이터 나와요. 저도 이거 한참 못 잡았습니다.

---

## 지금은

- **89개 팀, 700+ 회원**이 사용 중
- 매주 경기 일정 등록·월말 회비 정산 자동화
- AI 라인업 / 코치 분석 / 경기 후기 / 선수 시그니처 / 회비 OCR — 5개 AI 기능 모두 활성
- Play Console 베타 진행 중 (TWA로 Android 앱 출시 시도)

가장 기분 좋은 건 이런 메시지들:

> "이거 덕분에 총무 그만두고 싶은 생각이 줄었어요"
> "회비 정산 30초만에 끝내고 잠 잘 잡니다"
> "회원들이 투표 빨리 해줘서 뭐가 잘못된 줄 알았어요 ㅋㅋ"

1편에 썼던 **"나를 위한 도구"** 가 다른 총무들한테도 작동한다는 증거예요.

---

## 정리 — 1인 개발자 마케팅 원칙 5가지

1. **타겟 커뮤니티 1~2개에 집중** — 분산하면 시간만 날아감
2. **경험담 형식** — 광고 티 내면 즉시 차단
3. **구체 숫자** — "효율적" X, "30분 → 1분" O
4. **데모 모드** — 로그인 없이 체험 가능 = 전환률 2배
5. **소셜프루프** — "X팀이 쓴다" 한 줄이 의심 저항선 낮춤

---

## 다음 편 예고

4편: **혼자서 서비스 운영하기** — CS 대응·버그 수정·기능 요청 밸런스 잡기. 89팀 운영 중 새벽에 버그 알림 받으면 어떻게 처리하는지, 사용자 피드백을 어떻게 우선순위 매기는지.

---

## 써보기

👉 [pitch-master.app](https://pitch-master.app) — 회원가입 없이 둘러보기 모드 가능

---

## PitchMaster 개발기 시리즈

- 1편: 왜 만들었나
- 2편: 기술적으로 까다로웠던 것들
- **3편: 0명에서 700명, 사용자를 어떻게 모았나 (현재 글)**
- 4편: 혼자서 서비스 운영하기 (예정)

---

**태그**: `사이드프로젝트` `1인개발` `마케팅` `SEO` `GA4` `Next.js` `풋살` `조기축구` `팀관리앱` `1인개발자`
