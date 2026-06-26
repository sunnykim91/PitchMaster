---
paths:
  - "src/app/(app)/matches/**"
  - "src/lib/positionRoles/**"
---

## 경기 상세 탭 구조

`src/app/(app)/matches/[matchId]/MatchDetailClient.tsx`

```
정보 | 투표 | 전술 | 출석 | 기록 | 후기
```
6개 탭 (EVENT 타입은 2개만). 각 탭 = lucide 아이콘 + 라벨 세로 배치, `flex-1` 균등 분할 + `min-h-[52px]`. 370px Z Flip도 fit (52차에 라벨 후기로 변경 + 아이콘 추가 적용).

---

## 역할 가이드 (2026-04-19 신규)

경기 전술 탭에서 쿼터별 본인 포지션의 역할·주의점을 보여주는 결정론적 지식 베이스.

- **파일**: `src/lib/positionRoles/` — `base/`·`overrides/`는 이제 디렉터리(축구 10 포메이션 override + `futsal.ts`) + merge 유틸
- **UI**: `src/components/MatchRoleGuide.tsx`
- **지원**: 축구 11인제 + **풋살 5·6인제** (축구 8/9/10인제는 조용히 미노출). `isSupported` 헬퍼 기준 (41차 풋살 추가)
- **구조**: base(포메이션 무관 공통) + override(포메이션별 whyItMatters·linkage) 병합
- **권한별 뷰**:
  - MEMBER — 본인만. 불참 시 안내. 전술판 미작성이면 섹션 숨김
  - PRESIDENT/STAFF — 드롭다운(용병 제외)으로 다른 선수 가능. 전술판 미작성이면 포메이션 폴백
- **쿼터 그룹화**: 같은 (formationId, role)이면 비연속 쿼터도 한 카드 ("2·4쿼터 RCB"). 포메이션 다르면 별도 카드
- **동기화**: `match-squads-saved` window CustomEvent — TacticsBoard/AutoFormationBuilder 저장 시 발행 → MatchRoleGuide·MatchTacticsTab이 구독해 refetch

---

## 전술 탭 카드 순서 (2026-04-19 재정비)

카드 순서 프리셋 드롭다운 제거 + 고정 `order` 기반 배치. 상세는 [src/app/(app)/matches/CLAUDE.md](src/app/(app)/matches/CLAUDE.md) 참고.

- 용병 카드는 **편성 완료 여부**에 따라 동적 이동 (-5 상단 / 95 하단)
- "편성 완료" = 매 쿼터마다 정규 슬롯 전부 채워진 squad 존재 (주심/부심1·2/촬영 제외, `match_squads`에 DB 영속 기준)
- 메타 슬롯 키(formation.slots에 없음, `__` prefix): `__referee`(주심·sky) · `__linesman1`·`__linesman2`(부심 2명·emerald, 2026-04-29 추가) · `__camera`(촬영·violet). 모두 `match_squads.positions` JSONB에 동일 Placement 형식으로 저장
