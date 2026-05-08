# PitchMaster 실 결제 추적

**목적**: 카드 명세 기반 실제 지출 추적. 예상/정책 분석은 [business-costs-pricing.md](business-costs-pricing.md) 참고.

**최근 갱신**: 2026-05-08 (49차 세션, 4/1~5/6 명세 정리)

---

## 카테고리 정의

| 카테고리 | 내용 |
|---------|------|
| 인프라 | Vercel Pro 정기 + Build Minutes overage, 도메인 |
| AI API | Anthropic Claude API (호출당 비용, PitchMaster AI 기능) |
| 앱스토어 | Google Play Console (1회), Apple Developer (미집행) |
| 광고 | 메타(인스타) 광고 — 1·2·3·4차 |
| 개발 도구 | Claude Code Max — **본업 공용**, PitchMaster 단독 비용 아님 |

---

## 결제 명세 (2026-04-01 ~ 2026-05-06)

| 날짜 | 결제처 | 금액(₩) | 카테고리 | 추정 근거 |
|------|--------|---------|----------|-----------|
| 2026-04-01 | Anthropic | 10,205 | AI API | Claude Haiku 4.5 + Vision OCR 호출 누적 (PitchMaster) |
| 2026-04-02 | Google Digital Inc | 38,526 | 앱스토어 (1회성) | Play Console 등록비 ($25 + 환율/세금) — 사용자 확인 |
| 2026-04-03 | Vercel | 30,899 | 인프라 | Vercel Pro 첫 결제 ($20/월 시작일, 메모리 일치) |
| 2026-04-12 | Claude 구독 | 168,581 | 개발 도구 (이번달만 PM 병행) | Claude Max 5x ($100) — 본업 공용 |
| 2026-04-21 | Anthropic | 8,309 | AI API | Claude API 추가 호출 |
| 2026-04-23 | Claude 구독 | 228,172 | 개발 도구 (Max 20x 일시) | Max 5x → Max 20x 업그레이드 ($200), 다음달 일반 Max 환원 예정 |
| 2026-04-30 | 페이스북 광고 | 20,020 | 광고 | 메타 광고 1차(₩7,583) + 2차(₩13,594) ≈ ₩21,177 4월 정산 (메모리 일치) |
| 2026-05-02 | Vercel | 33,128 | 인프라 | Vercel Pro 5월 정기 사이클 |
| 2026-05-06 | Vercel | 102,955 | 인프라 (overage) | Build Minutes 등 한도 초과분 — 메모리 "매월 $40+ overage" 패턴 |

---

## 카테고리별 누적 (2026-04-01 ~ 2026-05-06)

| 카테고리 | 합계(₩) | 비고 |
|---------|---------|------|
| 인프라 (Vercel) | 166,982 | 정기 ₩64,027 + overage ₩102,955 |
| 광고 (메타) | 20,020 | 4월 1·2차 합산 정산 |
| 앱스토어 (Play Console) | 38,526 | 1회성 |
| AI API (Anthropic) | 18,514 | 4/1 ₩10,205 + 4/21 ₩8,309 |
| **PitchMaster 운영비 소계** | **244,042** | |
| 개발 도구 (Claude Max, 본업 공용) | 396,753 | 이번달만 Max 20x 일시 — 평월 ₩140k~170k 복귀 예정 |
| **총 카드 결제** | **640,795** | 본업 공유분 포함 |

---

## 핵심 패턴

### Vercel — 정기 + overage 이중 청구
- Pro $20 included credit가 매번 부족, Build Minutes/Bandwidth overage가 별도 청구로 카드에 찍힘
- 4월 누적: 정기 ₩30,899(4/3) → 5/2 정기 ₩33,128 → 5/6 overage ₩102,955
- **줄이는 방법**: 푸시 횟수 줄이기 (Squash 커밋), SSR 최소화 — 메모리 `feedback_squash_commits.md` 참고

### Claude 구독 — 이번달 일시 ₩396,753, 다음달 ₩140k~170k 환원
- 4/12 일반 Max 5x ($100, ₩168,581)
- 4/23 Max 20x로 업그레이드 ($200, ₩228,172)
- 사용자 메모: "이번달만 본업과 PitchMaster 병행, 다음달부터 일반 Max 5x로 환원"
- → 5월분부터 카드 명세에서 ₩228k → ₩140~170k 수준 하락 예상

### 메타 광고 — 4월 약 ₩20k, 5월 추가 발생 예정
- 메모리(`reference_meta_ads_setup.md`) 1차 ₩7,583 / 2차 ₩13,594 / 3차 ₩3,913 / 4차 ₩15,000 (인스타 앱 부스팅, 5/1~)
- 4/30 카드 결제 ₩20,020 = 1·2차 합산 (메모리 ₩21,177과 부가세/환율 차이로 근접)
- 3차·4차는 메타 광고 관리자/인스타 앱 부스팅으로 별도 결제 사이클 — 5월 카드 명세에서 추가 확인 필요

### Play Console — 4/2 ₩38,526 (메모리 정정)
- 메모리 최초 기록: "4/10경"
- 실제 카드 결제일: **4/2** — `reference_infra.md` 정정 완료

---

## 다음 갱신 시 추가할 항목

- [ ] 5월 메타 광고 3차·4차 청구 결제 확인 (인스타 앱 부스팅 ₩15,000 + 메타 관리자 3차 ₩3,913)
- [ ] 5월 Anthropic API 청구분 (5월 누적 호출 비용)
- [ ] 5월 말 Claude 구독 환원 후 실 청구액 (Max 5x 복귀 확인)
- [ ] 6월 카드 명세 도착 후 누적 합계 갱신
- [ ] 활성 100팀 도달 시점에 누적 운영비 vs 가격 정책 시점 재검토

---

## 참고

- **메모리**: `reference_infra.md` (인프라 비용), `reference_meta_ads_setup.md` (광고 1·2·3·4차), `feedback_squash_commits.md` (Vercel overage 줄이기), `reference_instagram_app_boost.md` (4차 부스팅)
- **다른 문서**: [business-costs-pricing.md](business-costs-pricing.md) (예상 비용 + 가격 정책 전략)
