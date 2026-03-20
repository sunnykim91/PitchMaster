# 벌금 관리 기능 백업

추후 별도 페이지(`/penalties`)로 분리 예정. 현재 DuesClient에서 제거된 UI + 기존 API 로직 기록.

## DB 테이블

### penalty_rules
```sql
CREATE TABLE penalty_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,           -- 항목명 (예: "무단불참")
  amount integer NOT NULL,      -- 금액
  description text,             -- 설명
  created_at timestamptz DEFAULT now()
);
```

### penalty_records
```sql
CREATE TABLE penalty_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES penalty_rules(id),
  member_id uuid NOT NULL,      -- team_members.user_id 또는 team_members.id
  amount integer NOT NULL,
  date date NOT NULL,
  is_paid boolean DEFAULT false,
  note text,
  recorded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
```

## API: `/api/penalties/route.ts` (현재 유지 중)

### GET
- `?type=records` → 벌금 내역 (rule, member, recorder join)
- 기본 → 벌금 규칙 목록

### POST
- `action: "record"` → 벌금 부과 (ruleId, memberId, amount, date, note)
- 기본 → 벌금 규칙 생성 (name, amount, description)

### PUT
- 납부 상태 토글 (id, isPaid)

### DELETE
- `?id=xxx&type=rule` → 규칙 삭제
- `?id=xxx&type=record` → 내역 삭제
- 권한: STAFF 이상

## 클라이언트 핸들러 (DuesClient에서 제거됨)

```typescript
// 벌금 규칙 추가
async function handleAddPenaltyRule(formData: FormData) {
  const name = String(formData.get("penaltyName") || "").trim();
  const amount = Number(formData.get("penaltyAmount") || 0);
  const description = String(formData.get("penaltyDescription") || "") || undefined;
  if (!name || amount <= 0) return;
  await apiMutate("/api/penalties", "POST", { name, amount, description });
}

// 벌금 규칙 삭제
async function handleDeletePenaltyRule(ruleId: string) {
  await apiMutate(`/api/penalties?id=${ruleId}&type=rule`, "DELETE");
}

// 벌금 부과
async function handleAddPenaltyRecord(formData: FormData) {
  const ruleId = String(formData.get("penaltyRuleId") || "");
  const memberId = String(formData.get("penaltyMemberId") || "");
  const rule = penaltyRules.find((r) => r.id === ruleId);
  const member = members.find((m) => m.id === memberId);
  if (!rule || !member) return;
  await apiMutate("/api/penalties", "POST", {
    action: "record",
    ruleId: rule.id,
    memberId: member.id,
    amount: rule.amount,
    date: String(formData.get("penaltyDate") || new Date().toISOString().split("T")[0]),
    note: String(formData.get("penaltyNote") || "") || undefined,
  });
}

// 납부 상태 토글
async function handleTogglePenaltyPaid(recordId: string) {
  const record = penaltyRecords.find((r) => r.id === recordId);
  if (!record) return;
  await apiMutate("/api/penalties", "PUT", { id: recordId, isPaid: !record.isPaid });
}

// 벌금 내역 삭제
async function handleDeletePenaltyRecord(recordId: string) {
  await apiMutate(`/api/penalties?id=${recordId}&type=record`, "DELETE");
}

// 요약 계산
const penaltySummary = useMemo(() => {
  const total = penaltyRecords.reduce((sum, r) => sum + r.amount, 0);
  const paid = penaltyRecords.filter((r) => r.isPaid).reduce((sum, r) => sum + r.amount, 0);
  return { total, paid, unpaid: total - paid, count: penaltyRecords.length };
}, [penaltyRecords]);
```

## UI 구성 (제거된 탭 내용)

### 벌금 관리 탭 구조
1. **헤더**: "벌금 관리" + 규칙 관리/벌금 부과 버튼 (STAFF+)
2. **현황 요약**: 총 벌금 / 납부 완료 / 미납 (3-column card-stat)
3. **규칙 관리** (collapsible): 항목명/금액/설명 폼 + 규칙 목록 카드
4. **벌금 부과** (collapsible): 대상 회원/벌금 항목/날짜/비고 폼
5. **벌금 내역**: 카드 리스트 (회원명-규칙명, 날짜, 납부/미납 배지, 토글/삭제 버튼)

### 타입 정의
```typescript
type PenaltyRule = { id: string; name: string; amount: number; description?: string };
type PenaltyRecord = {
  id: string; ruleId: string; ruleName: string;
  memberId: string; memberName: string;
  amount: number; date: string; isPaid: boolean; note?: string;
};
type ApiPenaltyRule = { id: string; team_id: string; name: string; amount: number; description: string | null };
type ApiPenaltyRecord = {
  id: string; team_id: string; rule_id: string; member_id: string;
  amount: number; date: string; is_paid: boolean; note: string | null;
  rule: { name: string }; member: { name: string };
};
```

## 복원 시 참고
- API(`/api/penalties/route.ts`)는 현재 그대로 유지 중 → 별도 페이지에서 호출하면 됨
- `dues/summary` API에서 penaltyRules, penaltyRecords도 여전히 반환 중
- 별도 페이지 생성 시: `src/app/(app)/penalties/page.tsx` + `PenaltiesClient.tsx`
