export const meta = {
  name: 'scoring-mvp-audit',
  description: '골 스코어 + MVP 집계 정합성 감사 — 차원별 팬아웃 + 적대적 검증 (읽기 전용, 리포트만)',
  phases: [
    { title: 'Audit', detail: '차원별 finder 병렬 — 지정 파일 Read 후 정책 위반 탐색' },
    { title: 'Verify', detail: '각 발견을 독립 스켑틱이 반증 시도 — 거짓양성 제거' },
    { title: 'Report', detail: 'CONFIRMED만 심각도순 종합' },
  ],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'file', 'severity', 'claim', 'policy'],
        properties: {
          title: { type: 'string', description: '한 줄 결함 요약' },
          file: { type: 'string', description: '리포 상대경로' },
          line: { type: 'integer', description: '앵커 라인(모르면 0)' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          claim: { type: 'string', description: '구체적 입력→잘못된 결과' },
          policy: { type: 'string', description: '올바른 동작(문서화된 의도)' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['refuted', 'confidence', 'reasoning'],
  properties: {
    refuted: { type: 'boolean', description: '실제 코드 확인 결과 발견이 틀렸으면 true (이미 처리됨/오독/의도된 차이/파일·라인 오류)' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string', description: '코드 근거 (인용 라인 포함)' },
  },
}

// 오탐 방지 — 아래는 "의도된 차이"라 결함 아님. finder·verifier 모두 이걸 알아야 한다.
const NOT_BUGS = `## 결함이 아닌 것 (의도된 설계 — 보고 금지)
- MatchDiaryTab 의 일반회원 뷰 "현재 1위"는 **실시간 최다득표**로, 확정 MVP 정책(70% 게이트)과 일부러 별개다.
- 운영진 지정 MVP: 경기일 < LATEST_STAFF_MVP_CUTOFF(2026-07-08)면 "최다득표", 이후면 "최신 지정 1건" — 둘 다 의도된 시대별 규칙.
- 운영진 즉시 확정은 (토글 mvp_vote_staff_only ON) 또는 (경기일 < STAFF_DECISION_POLICY_CUTOFF 2026-05-04)일 때만. 그 외엔 운영진표도 일반표(70% 룰). 이 분기는 정상.
- 자책골(own goal)이 팀 스코어엔 반영되지만 개인 득점엔 안 들어가는 건 정상.`

const DIMENSIONS = [
  {
    key: 'score-string',
    label: '스코어 문자열 단일소스 (computeMatchScore ~15경로)',
    files: 'src/lib/server/matchScore.ts (computeMatchScore 정의), src/app/api/matches/route.ts, src/lib/server/getMatchesData.ts, src/lib/server/getDashboardData.ts',
    policy:
      '경기 스코어 문자열은 computeMatchScore() 단일 소스를 공유해야 한다. 완료된 상대전(vs 상대팀)은 골 기록이 없어도 0:0으로 통일(112차 수정, 이전엔 null 미기록 버그). EVENT 경기만 스코어를 숨긴다. computeMatchScore 를 우회해 인라인으로 스코어를 재계산하는 경로가 있으면 규칙 drift 위험.',
    check: 'computeMatchScore 우회한 인라인 스코어 계산, 완료 상대전 0:0 통일 누락, EVENT가 아닌데 스코어 숨김 또는 EVENT인데 스코어 노출.',
  },
  {
    key: 'own-goal',
    label: '자책골(own goal) 집계 방향',
    files: 'src/app/api/goals/route.ts, src/app/api/matches/route.ts, src/app/api/records/route.ts, src/app/api/records/detail/route.ts, src/lib/server/getDashboardData.ts, src/lib/server/matchScore.ts',
    policy:
      '자책골(own_goal)은 팀 스코어엔 반영되지만 개인 득점 집계엔 포함되면 안 된다. 우리팀 자책→상대 득점, 상대팀 자책→우리 득점. 선수별 득점 랭킹/개인 통계에 자책골이 섞이면 오집계.',
    check: '개인 골 집계(선수별 득점)에 자책골이 포함되는지, 스코어 계산 시 자책골 방향(우리/상대) 오류, 경로별 자책 처리 divergence.',
  },
  {
    key: 'mvp-gate',
    label: 'MVP 확정 게이트 (70% + 운영진, 12경로)',
    files:
      'src/lib/mvpThreshold.ts (resolveValidMvps·pickStaffDecision·aggregateMvpsByMatch), src/lib/server/getRecordsData.ts, src/lib/server/getDashboardData.ts, src/app/api/records/route.ts, src/app/api/season-awards/route.ts, src/app/api/ai/match-summary/[matchId]/route.ts, src/lib/server/aiTeamStats.ts',
    policy:
      'MVP 확정 = (1) 운영진 지정 즉시(투표율 무관) 또는 (2) 실제 참석자(attendance_status=PRESENT|LATE)의 70% 이상 투표 시 최다득표. 공동 1등이면 전원 공동 MVP. 모든 집계 경로는 resolveValidMvps/aggregateMvpsByMatch 정책 헬퍼를 경유해야 하며, raw 최다득표(count desc)로 정책을 우회하면 안 된다.',
    check: '정책 헬퍼 우회하고 raw 최다득표만 쓰는 집계 경로, 70% 게이트 누락, 공동 1등을 단수로만 처리(전원 인정 누락), 참석자 분모 계산 오류(PRESENT|LATE 아닌 다른 기준).',
  },
  {
    key: 'created-at-select',
    label: 'MVP vote select의 created_at 누락 (preferLatest 오작동)',
    files:
      'src/app/api/records/route.ts, src/app/api/records/detail/route.ts, src/app/api/season-awards/route.ts, src/app/api/player-card/route.ts, src/app/api/share-card/route.ts, src/lib/server/getRecordsData.ts, src/lib/server/getDashboardData.ts, src/lib/server/aiTeamStats.ts, src/app/player/[memberId]/page.tsx, src/app/api/ai/match-summary/[matchId]/route.ts',
    policy:
      'LATEST_STAFF_MVP_CUTOFF(2026-07-08) 이후 경기는 운영진 "최신 지정 1건"으로 판정하므로, MVP 투표를 읽는 모든 select 는 created_at 을 포함해야 한다. 헬퍼 인자 캐스팅(as Parameters<...>) 때문에 TS 가 누락을 못 잡으니, select 문자열에 created_at 이 실제로 있는지 직접 확인해야 한다. 빠지면 최신 지정 판정이 틀린 운영진을 고른다.',
    check: 'mvp_votes/votes 를 읽는 각 select 문자열에 created_at 이 빠졌는지 전수 확인. 캐스팅으로 가려진 누락 집중.',
  },
  {
    key: 'season-ovr',
    label: '시즌 OVR 계산 (computeSeasonOvr)',
    files: 'src/lib/server/computeSeasonOvr.ts, src/lib/server/processMatchCompletedPush.ts (호출부)',
    policy:
      'computeSeasonOvr 는 경기 후 OVR 변동 감지에 쓰인다. MVP 반영 시 정책 헬퍼를 경유해야 하고, 최소 출전 가드가 있어야 하며, 골/도움/자책/출석 집계가 다른 경로와 일관돼야 한다.',
    check: 'OVR 계산이 MVP를 raw 최다득표로 세는지, 최소 출전 가드 유무, 자책골 포함 여부가 다른 집계와 어긋나는지, 0 division/빈 시즌 edge.',
  },
  {
    key: 'cross-surface',
    label: '화면 간 집계 일치 (records vs dashboard vs matches)',
    files: 'src/lib/server/getRecordsData.ts, src/lib/server/getDashboardData.ts, src/lib/server/getMatchesData.ts, src/app/api/records/route.ts',
    policy:
      '같은 선수의 골·도움·MVP 횟수는 기록 화면·대시보드·경기목록에서 동일해야 한다(모두 같은 정책 헬퍼/집계 규칙 경유). 한 화면은 자책 포함·다른 화면은 제외, 한 곳은 정책 MVP·다른 곳은 raw 최다득표 같은 divergence 는 사용자 눈에 "숫자가 화면마다 다름"으로 드러난다.',
    check: 'getRecordsData vs getDashboardData vs getMatchesData 사이 골/도움/MVP 집계 규칙 divergence(자책 포함 기준·MVP 판정·완료전 0:0 처리 등).',
  },
]

const finderPrompt = (d) => `너는 풋살팀 관리앱 PitchMaster의 **골/스코어·MVP 집계 감사관**이다. 아래 차원 한 개만 정밀 감사하라.

## 감사 차원: ${d.label}
## 대상 파일 (반드시 Read로 실제 내용 확인)
${d.files}

## 문서화된 정책 (올바른 동작)
${d.policy}

## 중점 점검
${d.check}

${NOT_BUGS}

## 방법
1. 대상 파일을 실제로 Read하라(추측 금지). 필요하면 Grep으로 호출부/집계 로직을 추가 확인.
2. 코드가 위 정책에서 **실제로 벗어나는 지점만** 결함으로 보고하라. 스타일·취향·"개선하면 좋음"은 제외.
3. 각 결함은 구체적 입력→잘못된 결과로 서술. 파일 경로와 (가능하면) 라인 명시.
4. 위 "결함이 아닌 것"에 해당하면 절대 보고하지 마라.
5. 확신 없으면 severity를 낮추되, 근거 없는 추측은 넣지 마라. 깨끗하면 findings: [].

결과는 FINDINGS_SCHEMA(JSON)로만 반환.`

const refutePrompt = (f) => `너는 골/MVP 집계 감사 결과를 검증하는 **적대적 스켑틱**이다. 아래 발견이 틀렸음을 입증하려 시도하라.

## 발견
- 제목: ${f.title}
- 파일: ${f.file}${f.line ? ` (라인 ${f.line})` : ''}
- 주장: ${f.claim}
- 기대 정책: ${f.policy}

${NOT_BUGS}

## 임무
1. 지목된 파일을 **직접 Read**하라. 필요하면 Grep으로 주변/헬퍼 로직 확인.
2. 다음 중 하나라도 참이면 refuted=true:
   (a) 코드가 이미 그 케이스를 처리하고 있다 (정책 헬퍼 경유 등)
   (b) 실제로는 문제가 아니다 — 특히 위 "결함이 아닌 것"에 해당하는 의도된 차이
   (c) 파일/라인/함수가 틀렸다(존재하지 않음)
3. 코드상 명백한 진짜 집계 오류일 때만 refuted=false.
4. **확신이 없으면 refuted=true로 기울여라** — 거짓양성을 통과시키는 것보다 낫다.

근거에 실제 코드 라인을 인용하라. 결과는 VERDICT_SCHEMA(JSON)로만 반환.`

phase('Audit')
const results = await pipeline(
  DIMENSIONS,
  (d) => agent(finderPrompt(d), { label: `audit:${d.key}`, phase: 'Audit', schema: FINDINGS_SCHEMA }),
  (review, d) =>
    parallel(
      (review?.findings ?? []).map((f) => () =>
        agent(refutePrompt(f), { label: `verify:${d.key}`, phase: 'Verify', schema: VERDICT_SCHEMA })
          .then((v) => ({ ...f, dimension: d.label, verdict: v }))
      )
    )
)

phase('Report')
const all = results.flat().filter(Boolean)
const confirmed = all.filter((f) => f.verdict && f.verdict.refuted === false)
const refuted = all.filter((f) => f.verdict && f.verdict.refuted === true)
const rank = { high: 0, medium: 1, low: 2 }
confirmed.sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9))

log(`감사 완료: 총 발견 ${all.length} → CONFIRMED ${confirmed.length} / 반증(거짓양성) ${refuted.length}`)

return {
  summary: {
    dimensions: DIMENSIONS.length,
    rawFindings: all.length,
    confirmed: confirmed.length,
    refuted: refuted.length,
  },
  confirmed: confirmed.map((f) => ({
    severity: f.severity,
    dimension: f.dimension,
    title: f.title,
    file: f.file,
    line: f.line || null,
    claim: f.claim,
    policy: f.policy,
    verifierConfidence: f.verdict.confidence,
    verifierReasoning: f.verdict.reasoning,
  })),
  refutedTitles: refuted.map((f) => ({ title: f.title, why: f.verdict.reasoning })),
}
