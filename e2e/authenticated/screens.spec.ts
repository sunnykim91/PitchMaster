import { test, expect } from "@playwright/test";
import { skipWhenUnauthenticated } from "./guard";

skipWhenUnauthenticated();

/**
 * 주요 인증 화면이 크래시(에러 바운더리)·리다이렉트 없이 로드되는지 스모크.
 * 페이지별 셀렉터 대신 공통 신호로 회귀를 싸게 잡는다:
 *   ① /login 으로 안 튕김(URL)  ② (app) 에러 바운더리 "문제가 발생했어요" 미발생  ③ 앱 셸(탭바) 렌더
 * 데모 계정(회장)이라 모든 화면 접근 가능. records·dashboard·matches 는 다른 spec 에서 커버.
 */
const SCREENS = [
  { path: "/dues", url: /\/dues(\?|$)/, name: "회비" },
  { path: "/dues/monthly", url: /\/dues\/monthly/, name: "월별결산" },
  { path: "/members", url: /\/members/, name: "회원" },
  { path: "/board", url: /\/board/, name: "게시판" },
  { path: "/settings", url: /\/settings/, name: "설정" },
  { path: "/rules", url: /\/rules/, name: "회칙" },
];

test.describe("주요 화면 로드 스모크 (인증)", () => {
  for (const s of SCREENS) {
    test(`${s.name} (${s.path}) 가 크래시 없이 로드된다`, async ({ page }) => {
      await page.goto(s.path);
      await expect(page).toHaveURL(s.url);
      // (app) 에러 바운더리 미발생 + 앱 셸(탭바) 렌더 = 크래시·리다이렉트 없음.
      // (페이지가 중첩 <main> 을 두는 경우가 있어 main 단언은 쓰지 않음)
      await expect(page.getByText("문제가 발생했어요")).toHaveCount(0);
      await expect(page.locator('[data-coach-id="tab-home"]')).toBeVisible();
    });
  }

  test("내 선수 프로필(/player)이 로드된다", async ({ page }) => {
    // 햄버거 상단 프로필 링크 href(= /player/{내 id})를 읽어 직접 이동.
    // player 는 (app) 밖이라 탭바·동일 에러 바운더리가 없어 URL+main 만 확인.
    await page.locator('[data-coach-id="hamburger"]').click();
    const menu = page.getByRole("dialog").filter({ hasText: "메뉴" });
    const href = await menu.locator('a[href^="/player/"]').first().getAttribute("href");
    test.skip(!href, "프로필 링크를 찾지 못함");
    await page.goto(href!);
    await expect(page).toHaveURL(/\/player\//);
    // 선수 이름이 h1 으로 렌더 = 프로필 SSR(OVR·랭킹 등) 정상
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
