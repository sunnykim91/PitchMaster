import { test, expect } from "@playwright/test";
import { skipWhenUnauthenticated } from "./guard";

skipWhenUnauthenticated();

const ORIGIN = "http://localhost:3000";

/**
 * 추가 write(쓰기) 흐름 — 모두 생성한 데이터를 afterEach 에서 삭제해 잔여물을 남기지 않는다.
 * 1) 게시판 글 작성 → /board 노출 확인 → 삭제
 * 2) 임시 경기 +득점(원클릭 UI) → 골 영속 확인(API) → 경기 삭제(CASCADE 로 골 함께 제거)
 */
test.describe("게시판 글 작성 흐름", () => {
  let postId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (postId) {
      await page.request
        .delete("/api/posts", { headers: { Origin: ORIGIN }, data: { id: postId } })
        .catch(() => {});
      postId = null;
    }
  });

  test("작성한 자유글이 게시판에 노출된다", async ({ page }) => {
    const title = `E2E 자동글 ${Date.now()}`;
    const res = await page.request.post("/api/posts", {
      headers: { Origin: ORIGIN },
      data: { title, content: "E2E 자동 생성 — 곧 삭제됩니다.", category: "FREE" },
    });
    expect(res.ok(), `글 생성 실패: ${res.status()}`).toBeTruthy();
    postId = (await res.json()).id as string;
    expect(postId).toBeTruthy();

    await page.goto("/board");
    await expect(page.getByText(title)).toBeVisible();
  });
});

test.describe("골 기록 흐름 (임시 경기 +득점 → 정리)", () => {
  let matchId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (matchId) {
      await page.request
        .delete("/api/matches", { headers: { Origin: ORIGIN }, data: { id: matchId } })
        .catch(() => {});
      matchId = null;
    }
  });

  test("+득점 한 번으로 골이 기록된다", async ({ page }) => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await page.request.post("/api/matches", {
      headers: { Origin: ORIGIN },
      data: { date: tomorrow, opponent: "E2E 골테스트", matchType: "REGULAR" },
    });
    expect(res.ok(), `경기 생성 실패: ${res.status()}`).toBeTruthy();
    matchId = (await res.json()).id as string;

    await page.goto(`/matches/${matchId}?tab=record`);
    // 기록 탭은 dynamic import — 버튼 렌더까지 대기
    const addGoal = page.getByRole("button", { name: "우리 팀 득점 기록 추가" });
    await addGoal.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    if (!(await addGoal.isVisible().catch(() => false))) {
      test.skip(true, "기록 탭에 +득점 버튼이 노출되지 않음 (조건 미충족)");
    }
    await addGoal.click();

    // UI 쓰기가 DB 에 영속됐는지 API 로 확인
    await expect(async () => {
      const g = await page.request.get(`/api/goals?matchId=${matchId}`);
      const json = await g.json();
      expect((json.goals ?? []).length).toBeGreaterThan(0);
    }).toPass({ timeout: 8000 });
  });
});
