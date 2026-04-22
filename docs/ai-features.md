# PitchMaster AI 기능 가이드

> **목적**: 현재 서비스의 모든 AI 기능을 한 문서로 정리 — 각 기능이 어떤 데이터로, 어떤 모델로, 어떤 흐름으로 동작하는지 + 한도·폴백·저장 구조.
> **최종 갱신**: 2026-04-22
> **대상 독자**: 개발자 본인(김선휘), 향후 합류 멤버, 경쟁 분석·사용자 문의 대응용 레퍼런스

---

## 0. 한눈에 보기 (5개 기능)

| # | 기능 | 모델 | 공개 범위 | 경기/팀월 한도 | 저장 |
|---|------|------|----------|---------------|------|
| 1 | **선수 시그니처** | Sonnet 4.5 (현재 규칙기반만) | 캐시 전체 공개, 재생성 김선휘만 | 제한 없음 | `team_members.ai_signature` (TTL 7일) |
| 2 | **경기 후기** | Haiku 4.5 | 캐시 전체 공개, 재생성 김선휘만 | 자동 1회 + 재생성 1회 | `matches.ai_summary` |
| 3 | **AI 코치 분석** | Haiku 4.5 | 김선휘 + 축구 팀만 | 경기당 4회 / 팀월 30회 | `matches.ai_coach_analysis` |
| 4 | **AI Full Plan** (편성+코칭 통합) | Haiku 4.5 | 김선휘 + 축구 팀만 | 경기당 3회 / 팀월 20회 | `matches.ai_coach_analysis` |
| 5 | **OCR 거래 파싱** | Haiku 4.5 Vision | 전체 공개 | 제한 없음 (이미지 해시 캐시) | `ai_ocr_cache` |

**공통 지표**: 모든 호출은 [`ai_usage_log`](../supabase/migrations/) 테이블에 `feature / source('ai'|'rule'|'error') / model / input·output·cache 토큰 / latency / matchId` 로 기록.

---

## 1. 선수 시그니처 (Player Signature)

> "김선휘 — 시즌 8골 5어시, 이번 시즌 가장 해로웠던 윙어" 같은 한 줄 소개를 선수 카드에 표시.

### UI 트리거
- `/player/[id]` 진입 시 자동 노출 ([src/app/(app)/player/[memberId]/](../src/app/(app)/player/))
- 재생성 버튼은 김선휘 계정에만 노출

### 흐름
```
[페이지 진입]
  → aiSignatureCache.getOrGenerateSignature(teamMemberId)
    → 1) DB 캐시 조회 (team_members.ai_signature + TTL 7일 체크)
       → 2-a) 캐시 유효 → 그대로 반환
       → 2-b) 만료/없음 → generateRuleBasedSignature(stats) 호출
         → 결정론적 패턴 풀에서 선택 → DB 저장 → 반환
  → <SignatureCard> 렌더
```

### 입력 데이터 (평가 기준)
- 포지션 / 총 경기 수
- 누적 골·어시·MVP
- 클린시트 (GK·수비진)
- 출석률 · 승률
- **팀내 순위** (rankFields) — "팀 최다 득점자" 같은 수식어 생성용

### 출력
- 한 줄 텍스트 (23자 이내)
- 아라비아 숫자 1개 이상 필수

### 현재 상태
- **AI 경로 비활성화** (규칙기반만) — 초기 품질 이슈로 결정론 버전만 운영
- Sonnet 4.5 호출 코드는 남아있음 — 언제든 재활성화 가능

### 한도·폴백
- Rate limit: 없음
- Fallback: 규칙기반이 1차 (AI 경로 비활성화 상태라 fallback 없음)

### 파일
- [`src/lib/server/aiSignature.ts`](../src/lib/server/aiSignature.ts)

---

## 2. 경기 후기 (Match Summary)

> 경기 끝난 뒤 "YYYY-MM-DD, 상대팀 X, 3-2 승. 김선휘 해트트릭…" 식의 카톡 공유용 3단락 후기.

### UI 트리거
- 경기 상세 → 일지 탭 → 경기 후기 섹션 자동 생성
- 캐시 존재 시 모두에게 보임. 재생성은 김선휘만

### 흐름
```
[경기 상세 진입, ai_summary 없음]
  → MatchDiaryTab 내부에서 POST /api/ai/match-summary (SSE)
    → 서버: Rate limit 체크 (자동 1회 + 재생성 1회)
    → getOrComputeTeamStats(teamId) 로 과거 맞대결 history 합침
    → Claude Haiku 4.5 스트리밍 호출
    → 완료 후 matches.ai_summary 에 persist
  → 클라이언트 progressive 렌더

[경기 상세 진입, ai_summary 있음]
  → DB 캐시 그대로 노출
```

### 입력 데이터 (평가 기준)
- 스코어·경기 결과(승/무/패)
- 득점자·어시스트 리스트
- MVP 투표 결과
- 참석 인원 수
- 날짜·장소·상대팀 이름·매치타입
- 날씨 (`weather` API 저장값)
- **상대전적** — 해당 상대와의 과거 맞대결 이력

### 출력
- 3단락 한국어 텍스트 (300~450자)
- 카톡 공유 시 줄바꿈 잘 유지되는 포맷

### 모델·파라미터
- claude-haiku-4-5, `MAX_OUTPUT_TOKENS=400`, `TEMPERATURE=0.8`

### 저장
- `matches.ai_summary` / `ai_summary_generated_at` / `ai_summary_model` / `ai_summary_regenerate_count`
- 마이그레이션 `00028`

### 한도
- 자동 생성 1회 + 재생성 1회 (`ai_summary_regenerate_count` 증가 차단)

### Fallback
- 구조화된 룰 텍스트: `"상대전 3-2 승리. MVP: 김선휘. 득점: 김선휘 3골…"`

### 권한
- 풋살 팀은 API 레벨 403

### 파일
- [`src/lib/server/aiMatchSummary.ts`](../src/lib/server/aiMatchSummary.ts)
- API: `src/app/api/ai/match-summary/route.ts`

---

## 3. AI 코치 분석 (Tactics Coach)

> "오늘 4-2-3-1로 간다. 민준이가 좌측 풀백 끌어내면 성현이가 하프스페이스 3선 침투로 스루패스 받아 희범이 파포스트 컷백 마무리…" 수준의 쿼터별 락커룸 브리핑.

### UI 트리거
- 전술 탭 → `<AiCoachAnalysisCard>` — 전술판 편성 완료 후 "AI 코치 분석" 버튼
- 재생성 버튼 (경기당 한도 남아있으면 노출)

### 흐름
```
[편성 완료 + 버튼 클릭]
  → POST /api/ai/tactics (SSE)
    → Rate limit 체크 (경기당 4회 / 팀월 30회)
    → getOrComputeTeamStats(teamId)
      → buildHistoryBlock() — 포메이션별 승률·선수 커리어 top20·쿼터별 득실·
        최근 3경기 폼·상대팀 이력
    → computePlayerRotation / computePositionChangers / computeSlotSharing /
      computeQuarterBreakdown / computeBenchPlayers 사전 계산
    → Claude Haiku 4.5 스트리밍
    → 완료 후 matches.ai_coach_analysis persist
  → AiCoachAnalysisCard progressive 렌더
```

### 입력 데이터 (평가 기준)
**경기 편성 정보**
- 포메이션 이름 (쿼터별 다를 수 있음)
- 참석자 전체 (이름·선호 포지션·용병 여부)
- 1쿼터 placement + 전 쿼터 placement
- 선수별 쿼터 로테이션 (positionChangers · slotSharing · playerWorkload)
- 벤치 자원 (benchPlayers)
- matchType · opponent · warnings

**팀 히스토리 블록** (`ai_team_stats_cache` 24h TTL 에서 가져옴)
- 포메이션별 승·무·패 + 승률 + 평균 득실
- 선수 커리어 Top 20 (출전·골·어시·MVP·주포지션·승률·실점·최근 폼·포지션 겸직)
- 포지션별 활약 Top 10
- 쿼터별 누적 득실 + 경기당 평균
- 최근 3경기 요약 (상대·스코어·포메이션·최다득점자)
- **상대팀 과거 이력** (있을 때만 — 없으면 "첫 대결" 명시 강제)

### 출력
- 쿼터 수+2 단락 (4쿼터 → 6단락, 3쿼터 → 5단락)
- 전체 900~1400자
- 감독 페르소나 락커룸 톤 (반말·선수 호명·감정 어휘 허용)
- 각 단락 최소 1개 전술 장면 어휘 필수 (슈팅·크로스·컷백·스루패스·하프스페이스·파포스트·오프사이드 트랩·세컨볼 회수 등)

### 모델·파라미터
- claude-haiku-4-5, `MAX_OUTPUT_TOKENS=3000`, `TEMPERATURE=0.75`

### 한도
- 경기당 4회, 팀월 30회 (`MATCH_CAPS['tactics-coach']=4`, `MONTHLY_TEAM_CAPS['tactics-coach']=30`)
- `source='ai'` 만 차감. rule·error 는 차감 없음

### Fallback
- `generateRuleBasedAnalysis()` — 포메이션·참석인원만 담긴 간단 텍스트

### 권한
- 김선휘 + `sportType === 'SOCCER'` 팀만 (풋살 403)

### 저장
- `matches.ai_coach_analysis` / `ai_coach_generated_at` / `ai_coach_model`

### 파일
- [`src/lib/server/aiTacticsAnalysis.ts`](../src/lib/server/aiTacticsAnalysis.ts)
- API: `src/app/api/ai/tactics/route.ts`

---

## 4. AI Full Plan (편성 + 코칭 통합)

> "쿼터별로 다른 포메이션을 AI가 직접 설계" 모드. 플랜(쿼터별 포메이션+배치 JSON)과 코칭 텍스트를 **한 번의 API 호출**에 같이 생성.

### UI 트리거
- `<AutoFormationBuilder>` 에서 "AI 최적 포메이션 (쿼터별 변경)" 체크 → 생성 버튼
- 성공 시 전술판에 바로 반영 + `AiCoachAnalysisCard` 에 coaching 즉시 주입

### 흐름
```
[체크 + 버튼 클릭]
  → POST /api/ai/full-plan (JSON 응답)
    → Rate limit 체크 (경기당 3회 / 팀월 20회)
    → 편성 전 제약 정리: scheduleQuarters() 로 쿼터별 선수 분배 확정
      → availableByQuarter 를 "기정사실" 로 AI 에게 전달
    → getOrComputeTeamStats 로 history 블록
    → Claude Haiku 4.5 호출 (non-stream, JSON 구조화 응답)
      → { plans: [...], coaching: "3~6단락 브리핑 텍스트" }
    → validatePlan() — availableByQuarter 외 선수 배치 감지 시 rule fallback
    → coaching 을 persistCoachAnalysis() 로 matches.ai_coach_analysis 저장
  → 클라이언트: applyAiPlanToResults → saveToTacticsBoard
    → onAiCoachingReady 콜백으로 AiCoachAnalysisCard 에 prop 직접 주입 (이벤트/네트워크 경로 우회)
```

### 입력 데이터 (평가 기준)
- AI 코치 분석과 동일 + 추가 플래그:
  - `singleFormation` — true 면 쿼터별 동일 포메이션 고정 (배치만 최적화)
  - `availableByQuarter` — 쿼터별 출전 확정 명단 (AI 가 재분배 불가)

### 출력
- JSON:
  ```json
  {
    "plans": [
      { "quarter": 1, "formation": "4-2-3-1", "placement": [{ "slot": "GK", "playerName": "..." }, ...] }
    ],
    "coaching": "감독 브리핑 3~6단락"
  }
  ```

### 모델·파라미터
- claude-haiku-4-5, `MAX_OUTPUT_TOKENS=4000`, `TEMPERATURE=0.5`

### 한도
- 경기당 3회, 팀월 20회

### 핵심 설계 원칙
- **AI 역할 경계**: 쿼터 간 선수 분배는 클라이언트 (`scheduleQuarters`) 가 확정. AI 는 slot 매핑만.
- **self-check 강제**: 응답 생성 후 `placement ↔ availableByQuarter` 교차검증 — 위반 시 rule fallback
- **coaching 과 plans 일관성**: 선수 역할 언급 시 해당 쿼터 `plans.placement` 실제 slot 기준으로만 서술 (지명·역할 모순 방지)

### Fallback
- `ruleBasedFallback()` — 기존 규칙 엔진으로 편성, coaching 은 `generateRuleBasedAnalysis()`

### 권한
- 김선휘 + 축구 팀만

### 파일
- [`src/lib/server/aiFullPlan.ts`](../src/lib/server/aiFullPlan.ts)
- API: `src/app/api/ai/full-plan/route.ts`

---

## 5. OCR 거래 파싱 (Vision)

> 통장 캡처 이미지에서 거래 내역을 자동 추출. "이미지로 일괄 등록" 버튼.

### UI 트리거
- 회비 → 일괄 등록 탭 → "이미지로 일괄 등록" → 통장 캡처 업로드

### 흐름
```
[이미지 업로드]
  → 클라이언트에서 해시 계산 (SHA-256)
  → POST /api/ocr (FormData + hash)
    → ai_ocr_cache 조회 (image_hash)
      → 캐시 hit → 저장된 JSON 반환 (AI 호출 없음)
      → miss → Claude Haiku 4.5 Vision 호출
        → JSON 배열 반환
        → ai_ocr_cache 에 저장
  → 클라이언트: 거래 리스트 UI → 사용자가 납부자 매핑 → 일괄 저장
```

### 입력 데이터 (평가 기준)
- 통장 거래내역 스크린샷 이미지 (Base64, < 4.5 MB)

### 출력
- JSON 배열:
  ```json
  [
    { "date": "2026-04-01", "time": "10:23", "counterparty": "김선휘", "amount": 30000, "type": "입금", "balance": 450000, "memo": "4월 회비" }
  ]
  ```

### 모델·파라미터
- claude-haiku-4-5 Vision, `MAX_OUTPUT_TOKENS=2000`, `TEMPERATURE=0.1`

### 캐시 (중요)
- `ai_ocr_cache` 테이블 — `image_hash` PK
- 동일 이미지 재업로드 시 AI 호출 0회
- 마이그레이션 `00030`

### 한도
- **없음** — 이미지 해시 캐시로 중복 차단

### Fallback
- 기존 Clova OCR (Naver) — 텍스트만 추출, 클라이언트 정규식으로 파싱

### 권한
- 전체 팀 공개 (경기 AI 기능과 달리 제약 없음)

### 파일
- [`src/lib/server/aiOcrParse.ts`](../src/lib/server/aiOcrParse.ts)
- API: `src/app/api/ocr/route.ts`

---

## 공통 인프라

### A. TeamStats 캐시 (`ai_team_stats_cache`)
- **TTL**: 24시간
- **용도**: AI 코치·Full Plan·경기 후기의 **history 블록** 소스
- **계산 항목**:
  - `formationStats` — 포메이션별 승·무·패·득실
  - `playerCareerStats` — 선수 Top 20 (출전·골·어시·MVP·승률·실점·최근 폼·포지션 겸직)
  - `playerPositionStats` — 포지션별 Top 10
  - `quarterStats` — 쿼터별 누적 득실
  - `recentMatchSummaries` — 최근 3경기 (상대·스코어·포메이션·최다득점자)
  - `opponentHistory` — 상대팀별 맞대결 기록
- **호출**: `getOrComputeTeamStats(teamId)` — 서버 사이드 전용

### B. 사용량 로그 (`ai_usage_log`)
모든 AI 호출이 기록됨. 빌링·남용 감지·품질 모니터링 목적.

| 컬럼 | 의미 |
|------|------|
| `feature` | 'signature' / 'match_summary' / 'tactics-coach' / 'tactics-plan' / 'ocr' |
| `source` | 'ai' / 'rule' / 'error' — **'ai' 만 rate limit 차감** |
| `model` | 실제 호출한 Claude 모델명 |
| `user_id` / `team_id` / `match_id` / `entity_id` | 주체·대상 |
| `input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_creation_tokens` | Anthropic 응답 usage 에서 추출 |
| `latency_ms` | 호출 시작 → 응답 완료 |
| `error_reason` | 실패 사유 (`api_error` / `invalid_json` / `validation_failed` / `low_quality` …) |
| `retry_count` | 저품질 시 재시도 횟수 |

### C. Rate Limit (`checkRateLimit`)
```ts
// src/lib/server/aiUsageLog.ts
MONTHLY_TEAM_CAPS = {
  "tactics-plan": 20,
  "tactics-coach": 30,
}
MATCH_CAPS = {
  "tactics-plan": 3,
  "tactics-coach": 4,
}
```
- 경기당 한도 ↔ 팀월 한도 **이중 검증**
- 초과 시 429 `{ error: "rate_limited", reason: "match_used" | "monthly_team_cap" }`

### D. Feature Flag
```typescript
// page.tsx (서버 컴포넌트)
const enableAi = session.user.name === "김선휘";

// MatchDetailClient.tsx (클라이언트)
const effectiveEnableAi = enableAi && sportType === "SOCCER";
```
- **김선휘 전용**: 경기 후기·AI 코치·Full Plan·선수 시그니처 재생성
- **전체 공개**: 선수 시그니처 캐시 조회, 경기 후기 캐시 조회, OCR
- **풋살 차단**: 경기 후기·AI 코치·Full Plan (API 레벨 403)

---

## DB 테이블 매핑 요약

| 테이블 | 마이그레이션 | 용도 |
|--------|-------------|------|
| `ai_usage_log` | 00027 | 모든 AI 호출 관찰성 |
| `matches.ai_summary*` | 00028 | 경기 후기 캐시 |
| `ai_ocr_cache` | 00030 | OCR 결과 캐시 (이미지 해시) |
| `ai_usage_log` (rate limit 정책) | 00033 | v2 한도 체계 |
| `ai_team_stats_cache` | 00034 | 팀 통계 24h 캐시 |
| `matches.ai_coach_analysis*` | 00036 | AI 코치 분석 캐시 |
| `team_members.ai_signature*` | (미확인) | 선수 시그니처 7일 TTL 캐시 |

---

## 비용 관리 원칙

1. **캐시 우선** — DB에 있으면 AI 호출 안 함 (선수 시그니처 7일, 경기 후기 영구, OCR 이미지 해시)
2. **prompt caching** — 모든 AI 호출에 `cache_control: 'ephemeral'` 적용 (system 프롬프트 재사용)
3. **Rule fallback** — 실패·저품질 시 결정론 텍스트로 대체 (rate limit 차감 없음)
4. **Feature flag 게이팅** — 김선휘 본인 계정·축구 팀에만 비싼 AI 기능 노출
5. **사용량 로그** — 월별 집계로 비정상 사용 감지 가능

---

## 개선 대기 항목 (2026-04-22 기준)

- AiBadge 공통 컴포넌트 — 전술 코치 외 4곳 (경기 후기·Full Plan·선수 시그니처·OCR) 에도 적용 필요
- 선수 시그니처 AI 경로 재활성화 — 규칙기반 품질 한계 검토 중
- OVR 능력치 게임화 — 경쟁사(축구고·조기사커) 대비 gap ([competitors.md](./competitors.md) 섹션 4 참조)
- Web Geolocation 간이 GPS — 축구고 대비 gap

---

## 참조

- 경쟁사 AI 기능 대비: [docs/competitors.md](./competitors.md)
- 가격 정책: [docs/business-costs-pricing.md](./business-costs-pricing.md)
- rate limit 정책 원칙: 메모리 `project_ai_rate_limit_2026_04_20.md`
- AI 코치 프롬프트 규칙: [`src/lib/server/aiTacticsAnalysis.ts`](../src/lib/server/aiTacticsAnalysis.ts) SYSTEM_PROMPT
- AI Full Plan 프롬프트 규칙: [`src/lib/server/aiFullPlan.ts`](../src/lib/server/aiFullPlan.ts) SYSTEM_PROMPT
