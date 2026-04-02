-- 경기 결과 푸시 발송 여부
alter table matches add column if not exists result_pushed boolean default false;
