import { test, expect } from "@playwright/test";
import { skipWhenUnauthenticated } from "./guard";

skipWhenUnauthenticated();

// CSRF 미들웨어(src/middleware.ts) 화이트리스트 통과용. 임의 localhost 포트를 허용하므로 3000 고정.
const ORIGIN = "http://localhost:3000";

/**
 * 유일한 "변경(write)" 흐름. 데모 팀은 28경기 전부 COMPLETED 라 진행 중 경기가 없으므로,
 * 테스트가 직접 내일 날짜의 임시 경기를 만들고 → 참석 투표를 토글한 뒤 → afterEach 에서 삭제한다.
 * 경기 삭제는 CASCADE 로 투표까지 함께 지워 데모 데이터에 잔여물을 남기지 않는다 (실패해도 정리).
 */
test.describe("참석 투표 변경 흐름 (임시 경기 생성 → 투표 → 정리)", () => {
  let matchId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (matchId) {
      await page.request
        .delete("/api/matches", { headers: { Origin: ORIGIN }, data: { id: matchId } })
        .catch(() => {});
      matchId = null;
    }
  });

  test("내 참석 투표를 참석→미정으로 바꾸면 선택이 이동한다", async ({ page }) => {
    // 내일 날짜로 임시 경기 생성 (status 기본값 ≠ COMPLETED → '내 투표' 카드 노출)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await page.request.post("/api/matches", {
      headers: { Origin: ORIGIN },
      data: { date: tomorrow, opponent: "E2E 임시상대", matchType: "REGULAR" },
    });
    expect(res.ok(), `경기 생성 실패: ${res.status()}`).toBeTruthy();
    matchId = (await res.json()).id as string;
    expect(matchId).toBeTruthy();

    await page.goto(`/matches/${matchId}?tab=vote`);

    const radiogroup = page.getByRole("radiogroup", { name: "참석 투표" });
    await expect(radiogroup).toBeVisible();
    const attend = radiogroup.getByRole("radio", { name: "참석" });
    const maybe = radiogroup.getByRole("radio", { name: "미정" });

    // 참석 선택 → 체크됨 (POST /api/attendance)
    await attend.click();
    await expect(attend).toHaveAttribute("aria-checked", "true");

    // 미정으로 변경 → 선택이 이동(참석 해제)
    await maybe.click();
    await expect(maybe).toHaveAttribute("aria-checked", "true");
    await expect(attend).toHaveAttribute("aria-checked", "false");
  });
});
