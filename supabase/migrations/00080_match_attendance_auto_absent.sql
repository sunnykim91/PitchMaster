-- 휴회(LEAVE) 회원 자동 불참 표시.
-- 본인이 직접 찍은 불참과 구분해, 휴회 해제 시 '미래 경기의 자동 불참'만 안전하게 회수하기 위함.
-- (기존 행은 default false 라 기존 투표에는 영향 없음.)
alter table match_attendance
  add column if not exists auto_absent boolean not null default false;

comment on column match_attendance.auto_absent is
  '휴회(LEAVE) 등록으로 시스템이 자동 기록한 불참. 본인이 직접 투표하면 false로 전환됨.';
