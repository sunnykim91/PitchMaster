-- 카카오 프로필 이미지 URL을 http -> https 로 일괄 정규화.
-- 카카오가 회신하는 profile_image URL이 http://k.kakaocdn.net/... 형태로 오던 것을
-- 신규 가입·재로그인 시점부터는 https://로 변환해 저장하지만, 기존 row 백필 필요.
-- next/image 가 런타임에 자동 https 업그레이드하더라도 HTML src 가 http로 남아있어
-- Lighthouse Best Practices(is-on-https / mixed-content) 점수가 깎이는 문제 해결용.

UPDATE users
SET profile_image_url = REGEXP_REPLACE(profile_image_url, '^http://', 'https://')
WHERE profile_image_url LIKE 'http://%';
