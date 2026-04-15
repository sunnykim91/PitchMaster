-- member_dues_exemptions 테이블 RLS 활성화 (00022에서 누락)
-- 프로젝트 전반 패턴: 모든 테이블은 RLS 활성화되어 서비스 롤(API 경유)로만 접근 가능

ALTER TABLE member_dues_exemptions ENABLE ROW LEVEL SECURITY;

-- 별도 정책 없음 → anon/authenticated 역할은 전부 차단됨
-- API 라우트는 service_role 키로 접근하므로 RLS 우회 (정상 동작)
