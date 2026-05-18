-- 2026-05-18: OVR 공식 재설계에 따른 last_ovr 일괄 초기화
--
-- 변경 배경:
--   playerCardUtils.calculateOVR() 재설계 — 카운트 지표 정규화, 실점 감점 완화,
--   sqrt 표본 보정, DEF 골 보너스, MID 공격P 보너스. 평균적으로 GK +13, MID +4,
--   DEF +3 가산. 신규 표본 작은 선수는 sqrt 보정으로 감점.
--
-- 알림 폭발 방지:
--   processMatchCompletedPush.ts 가 team_members.last_ovr 와 신 계산값을 비교해
--   |delta| >= 2 또는 rarity 변동 시 푸시 발송. 공식 변경으로 모든 선수의 OVR이
--   일제히 변동되므로, 첫 경기 종료 시 출장 선수 전원에게 푸시 발송 위험.
--
--   last_ovr=NULL 로 초기화하면 다음 경기 종료 시 "최초 스냅샷만 저장, 알림 생략"
--   경로 (processMatchCompletedPush.ts:111-118) 를 타게 됨 → 첫 알림 폭발 차단.
--   두 번째 경기부터 정상적으로 신 공식 기준으로 변동 감지 + 알림 발송.

UPDATE team_members
SET last_ovr = NULL,
    last_ovr_updated_at = NULL
WHERE last_ovr IS NOT NULL;
