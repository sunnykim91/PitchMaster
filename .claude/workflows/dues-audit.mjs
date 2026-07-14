export const meta = {
  name: 'dues-audit',
  description: '회비 로직 정합성 감사 — 차원별 팬아웃 감사 + 적대적 검증 (읽기 전용, 리포트만 반환)',
  phases: [
    { title: 'Audit', detail: '차원별 finder 병렬 — 각자 지정 파일 Read 후 정책 위반 탐색' },
    { title: 'Verify', detail: '각 발견을 독립 스켑틱이 반증 시도 — 거짓양성 제거' },
    { title: 'Report', detail: 'CONFIRMED만 심각도순 종합' },
  ],
}

// ── 발견 스키마 (finder가 반환) ─────────────────────────────
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
          claim: { type: 'string', description: '무엇이 어떻게 틀렸는지 (구체적 입력→잘못된 결과)' },
          policy: { type: 'string', description: '올바른 동작(문서화된 의도)' },
        },
      },
    },
  },
}

// ── 검증 스키마 (스켑틱이 반환) ─────────────────────────────
const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['refuted', 'confidence', 'reasoning'],
  properties: {
    refuted: { type: 'boolean', description: '실제 코드 확인 결과 발견이 틀렸으면 true (이미 처리됨/오독/파일·라인 오류)' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string', description: '코드 근거 (인용 라인 포함)' },
  },
}

// ── 감사 차원: 실제 파일 + 문서화된 정책 ────────────────────
const DIMENSIONS = [
  {
    key: 'classify-category',
    label: '카테고리 분류 (월회비 뻥튀기)',
    files: 'src/lib/dues/classifyCategory.ts, src/app/api/reports/monthly/route.ts',
    policy:
      '유니폼·구장비·환불 등 비-회비 항목은 income(월회비)로 분류되면 안 됨 — 잘못 분류 시 월회비 총액이 부풀려짐. 분류 미매칭 시 fallback이 안전(월회비로 오분류 X)해야 함. 대소문자·공백에 강건해야 함.',
    check: '누락된 키워드, income/expense 오분류, fallback이 월회비로 새는지, 대소문자/공백 처리.',
  },
  {
    key: 'ocr-direction',
    label: 'OCR 입출금 방향',
    files: 'src/lib/server/aiOcrParse.ts (특히 detectChronoOrder, 잔액 델타 로직)',
    policy:
      '은행 명세서 OCR은 입금/출금 방향을 잔액 델타로 판정해야 하며, 명세서 정렬 방향(최신순/과거순)을 하드코딩 가정하면 회귀 발생(과거 사고 이력). 정렬 방향은 데이터로 판정, 델타 부호로 입금(+)/출금(-) 결정.',
    check: '정렬 방향 하드코딩 가정, 잔액 델타 부호 오류, 첫/마지막 행 edge case, 단일 행/동일 잔액 처리.',
  },
  {
    key: 'name-match',
    label: '이름 최장매칭 3경로 일관성',
    files:
      'src/lib/dues/matchMemberByName.ts, src/app/(app)/dues/DuesBulkTab.tsx, src/app/(app)/dues/DuesClient.tsx, src/app/api/dues/route.ts',
    policy:
      '입금자명↔회원 매칭은 최장 부분일치. team_members에는 name 컬럼 없음 → users.name을 사용해야 함. 3개 호출부가 동일 매칭 로직(matchMemberByName)을 써야 하며 각자 다른 로직으로 분기하면 안 됨.',
    check: '호출부별 매칭 로직 divergence, 잘못된 컬럼(team_members.name) 참조, 공백/정규화 불일치.',
  },
  {
    key: 'penalty-exempt',
    label: '벌금 면제·부과 3경로',
    files:
      'src/lib/server/getPenaltyExemptUserIds.ts, src/app/api/cron/no-vote-penalty/route.ts, src/app/api/dues/penalties/route.ts, src/app/api/dues/penalties/sync/route.ts',
    policy:
      '벌금 면제는 LEAVE(휴회)/INJURED(부상)만 — 선납·키퍼는 부과 대상. 미정(MAYBE)=미투표로 벌금 부과. EVENT 경기 미투표는 벌금 제외. 여러 경로(cron·penalties·sync)가 동일한 면제 집합/판정을 써야 함.',
    check: '경로별 면제 규칙 divergence, MAYBE 처리 불일치, EVENT 제외 불일치, 선납/키퍼가 잘못 면제되는지.',
  },
  {
    key: 'kst-boundary',
    label: 'KST 월경계·집계·중복',
    files:
      'src/lib/server/getDuesData.ts, src/app/api/dues/balance/route.ts, src/app/api/dues/summary/route.ts, src/app/api/dues/excel/route.ts',
    policy:
      '월 경계는 KST(+9h) 기준. timestamptz를 .split("T")로 자르면 UTC 기준이라 자정 근처 오분류 — 금지. 엑셀 업로드 중복제거 키에 description을 포함해 동일 금액 다른 내역이 합쳐지지 않게.',
    check: 'UTC/KST 혼용, .split("T") 사용처, 월경계 off-by-one, 중복제거 키 누락으로 인한 과다/과소 집계.',
  },
]

const finderPrompt = (d) => `너는 풋살팀 관리앱 PitchMaster의 **회비 로직 감사관**이다. 아래 차원 한 개만 정밀 감사하라.

## 감사 차원: ${d.label}
## 대상 파일 (반드시 Read로 실제 내용 확인)
${d.files}

## 문서화된 정책 (올바른 동작)
${d.policy}

## 중점 점검
${d.check}

## 방법
1. 대상 파일을 실제로 Read하라 (추측 금지). 필요하면 Grep으로 호출부를 추가 확인.
2. 코드가 위 정책에서 **실제로 벗어나는 지점만** 결함으로 보고하라. 스타일·취향·"개선하면 좋음"은 제외.
3. 각 결함은 구체적 입력→잘못된 결과로 서술. 파일 경로와 (가능하면) 라인을 명시.
4. 확신 없으면 severity를 낮추되, 근거 없는 추측은 아예 넣지 마라.
5. 정말 깨끗하면 findings: [] 로 반환하라. 억지 결함 생성 금지.

결과는 FINDINGS_SCHEMA(JSON)로만 반환.`

const refutePrompt = (f) => `너는 회비 감사 결과를 검증하는 **적대적 스켑틱**이다. 아래 발견이 틀렸음을 입증하려 시도하라.

## 발견
- 제목: ${f.title}
- 파일: ${f.file}${f.line ? ` (라인 ${f.line})` : ''}
- 주장: ${f.claim}
- 기대 정책: ${f.policy}

## 임무
1. 지목된 파일을 **직접 Read**하라. 필요하면 Grep으로 주변 로직 확인.
2. 다음 중 하나라도 참이면 refuted=true:
   (a) 코드가 이미 그 케이스를 처리하고 있다
   (b) 실제로는 문제가 아니다(오독·정책 오해)
   (c) 파일/라인/함수가 틀렸다(존재하지 않음)
3. 코드상 명백한 진짜 결함일 때만 refuted=false.
4. **확신이 없으면 refuted=true로 기울여라** — 거짓양성을 통과시키는 것보다 낫다.

근거에는 실제 코드 라인을 인용하라. 결과는 VERDICT_SCHEMA(JSON)로만 반환.`

// ── 실행: Audit → (item별) Verify 파이프라인 ────────────────
phase('Audit')
const results = await pipeline(
  DIMENSIONS,
  // stage 1: 차원별 감사
  (d) => agent(finderPrompt(d), { label: `audit:${d.key}`, phase: 'Audit', schema: FINDINGS_SCHEMA }),
  // stage 2: 그 차원의 각 발견을 병렬로 적대적 검증
  (review, d) =>
    parallel(
      (review?.findings ?? []).map((f) => () =>
        agent(refutePrompt(f), { label: `verify:${d.key}`, phase: 'Verify', schema: VERDICT_SCHEMA })
          .then((v) => ({ ...f, dimension: d.label, verdict: v }))
      )
    )
)

// ── 종합 ────────────────────────────────────────────────────
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
