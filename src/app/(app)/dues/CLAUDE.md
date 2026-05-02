# 회비 모듈 컨텍스트

## 탭 구조

| 파일 | 탭명 | 접근 권한 |
|------|------|-----------|
| `DuesStatusTab.tsx` | 납부현황 | **staffOnly** (STAFF/PRESIDENT만) |
| `DuesRecordsTab.tsx` | 납부기록 | 전체 (본인 기록) |
| `DuesPenaltyTab.tsx` | 벌금 | 전체 |
| `DuesSettingsTab.tsx` | 설정 | STAFF/PRESIDENT만 |
| `DuesBulkTab.tsx` | 일괄처리 | STAFF/PRESIDENT만 |

**주의**: `DuesClient.tsx`에서 `staffOnly: true` 탭 필터링 처리됨.
일반 회원은 자기 납부 기록을 `DuesRecordsTab`에서만 볼 수 있음.

## 주요 컴포넌트

- `DuesPenaltyTab` — 벌금 기록 조회 + 납부처리 UI (완전 구현)
- `DuesSettingsTab` — penalty_rules CRUD (생성/삭제/활성화 토글) (완전 구현)
- `DuesStatusTab` — 월별 수지결산(`MonthlySettlement`) 포함

## 면제·선납 통합 도메인 (2026-05-02 정리)

회비 선납은 **별도 시스템 없이 `member_dues_exemptions` 테이블에 PREPAID 타입으로 통합**.

### 4종 상태 타입
| 타입 | 용도 | 입금 거래 | 종료일 |
|------|------|-----------|--------|
| `EXEMPT` | 직책·역할 면제 (회장·임원·키퍼) | 없음 | 무기한 가능 |
| `PREPAID` | 선납 (3·6·12개월 등) | **회비 기록 탭에 별도 등록** | 필수 (자동 계산) |
| `LEAVE` | 휴회 | 없음 | 선택 |
| `INJURED` | 부상 | 없음 | 선택 |

### PREPAID 전용 컬럼 (`member_dues_exemptions`, 00052)
- `monthly_amount` — 등록 시점 월 회비 스냅샷
- `period_months` — 선납 기간 (3·6·12 등)
- `actual_paid_amount` — 실 결제액 (우대 적용 후)
- 우대액 = `monthly_amount × period_months − actual_paid_amount` (UI 계산)
- DB CHECK 제약: PREPAID 시 위 3개 + `end_date` 모두 필수

### 등록 흐름 (DuesSettingsTab → MemberExemptionSection)
- 폼은 단일 진입점, 상태 드롭다운 선택에 따라 **동적 필드 변경**
- PREPAID: 기간 버튼(3·6·12) + 월 회비 + 시작월 + 받은 금액 + 우대 자동 표시
- 받은 금액은 회비 기록 탭에 OCR/엑셀/수기 중 편한 방식으로 입금 1건 별도 등록
- 폼 안 "입금 등록하러 가기" 버튼 → `/dues?tab=records`

### 자동 면제 적용 (`/api/dues/payment-status` GET)
- 4종 타입 모두 **payment_status에 EXEMPT로 동일 처리** + note에 타입 라벨("선납:..." 등)
- 회계 트랙(dues_records)과는 분리 — 입금 거래는 회비 기록 탭에서 별도 관리

### 폐기된 시스템 (00053으로 DROP)
- `dues_prepayments` 테이블, `/api/dues/prepayments`, `PrepaymentRegisterModal`, `src/lib/duesPrepayment.ts` 모두 제거
- DROP 시점 운영 DB 0행 확인 — 데이터 손실 없음

## API 엔드포인트

- `POST /api/dues/penalties` — 벌금 기록 생성 (권한: DUES_RECORD_ADD)
- `POST /api/dues/penalty-rules` — 벌금 규칙 생성 (권한: DUES_SETTING_EDIT)
- `POST /api/dues/member-status` — 면제·선납·휴회·부상 등록. PREPAID 시 monthlyAmount/periodMonths/actualPaidAmount 필수
- `GET /api/dues/payment-status` — 월별 납부 상태 (활성 면제 자동 EXEMPT 적용)
