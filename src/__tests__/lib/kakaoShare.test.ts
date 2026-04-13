import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shareMatchResult, shareVoteLink, shareTeamInvite } from "@/lib/kakaoShare";

const APP_URL = "https://pitch-master.app";

// navigator.share fallback 테스트에서 모바일 UA 모킹 (PC에서는 clipboard으로 분기)
const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Mobile/15E148";
function mockMobileUA() {
  Object.defineProperty(navigator, "userAgent", { value: MOBILE_UA, writable: true, configurable: true });
}
function restoreUA(original: string) {
  Object.defineProperty(navigator, "userAgent", { value: original, writable: true, configurable: true });
}

// ─── Mock Kakao SDK ───────────────────────────────────────────────────────────
const mockKakao = {
  isInitialized: vi.fn().mockReturnValue(true),
  init: vi.fn(),
  Share: { sendDefault: vi.fn() },
};

function setKakaoAvailable() {
  Object.defineProperty(window, "Kakao", { value: mockKakao, writable: true, configurable: true });
}

function setKakaoUnavailable() {
  Object.defineProperty(window, "Kakao", { value: undefined, writable: true, configurable: true });
}

// ─── shareMatchResult ─────────────────────────────────────────────────────────
describe("shareMatchResult()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setKakaoAvailable();
  });

  afterEach(() => {
    setKakaoUnavailable();
  });

  const baseArgs = {
    matchId: "match-001",
    date: "2024-03-15",
    score: "3-1",
    opponent: "FC 서울",
    mvp: "김철수",
  };

  it("Kakao SDK 사용 가능 시 Kakao.Share.sendDefault 호출", async () => {
    await shareMatchResult(baseArgs);
    expect(mockKakao.Share.sendDefault).toHaveBeenCalledTimes(1);
    expect(mockKakao.Share.sendDefault).toHaveBeenCalledWith(
      expect.objectContaining({
        objectType: "feed",
        content: expect.objectContaining({
          title: expect.stringContaining("3-1"),
          link: expect.objectContaining({
            mobileWebUrl: `${APP_URL}/matches/match-001`,
          }),
        }),
      })
    );
  });

  it("Kakao 미초기화 시 isInitialized false → init 호출됨", async () => {
    mockKakao.isInitialized.mockReturnValueOnce(false);
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "test-js-key");

    await shareMatchResult(baseArgs);

    expect(mockKakao.init).toHaveBeenCalledWith("test-js-key");
    expect(mockKakao.Share.sendDefault).toHaveBeenCalled();
  });

  it("Kakao JS Key 없을 때 fallback으로 navigator.share 사용 (모바일)", async () => {
    const origUA = navigator.userAgent;
    mockMobileUA();
    mockKakao.isInitialized.mockReturnValueOnce(false);
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "");

    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    await shareMatchResult(baseArgs);

    expect(mockKakao.Share.sendDefault).not.toHaveBeenCalled();
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(`${APP_URL}/matches/match-001`),
      })
    );
    restoreUA(origUA);
  });

  it("Kakao 미사용 시 navigator.share fallback 호출 (모바일)", async () => {
    const origUA = navigator.userAgent;
    mockMobileUA();
    setKakaoUnavailable();

    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    await shareMatchResult(baseArgs);

    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(`${APP_URL}/matches/match-001`),
      })
    );
    restoreUA(origUA);
  });

  it("navigator.share도 없을 때 clipboard.writeText 호출", async () => {
    setKakaoUnavailable();

    Object.defineProperty(navigator, "share", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    // alert 모킹
    const mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});

    await shareMatchResult(baseArgs);

    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining(`${APP_URL}/matches/match-001`));
    mockAlert.mockRestore();
  });
});

// ─── shareVoteLink ────────────────────────────────────────────────────────────
describe("shareVoteLink()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setKakaoAvailable();
  });

  afterEach(() => {
    setKakaoUnavailable();
  });

  const baseArgs = {
    matchId: "match-001",
    date: "2024-03-15",
    time: "18:00",
    location: "서울 월드컵경기장",
    opponent: "FC 서울",
  };

  it("올바른 content title 생성 (날짜 포함)", async () => {
    await shareVoteLink(baseArgs);
    expect(mockKakao.Share.sendDefault).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining("2024-03-15"),
        }),
      })
    );
  });

  it("content description에 상대팀/시간/장소 포함", async () => {
    await shareVoteLink(baseArgs);
    const call = mockKakao.Share.sendDefault.mock.calls[0][0];
    const description = call.content.description;

    expect(description).toContain("FC 서울");
    expect(description).toContain("18:00");
    expect(description).toContain("서울 월드컵경기장");
  });

  it("Kakao 미사용 시 navigator.share fallback (모바일)", async () => {
    const origUA = navigator.userAgent;
    mockMobileUA();
    setKakaoUnavailable();

    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    await shareVoteLink(baseArgs);

    expect(mockKakao.Share.sendDefault).not.toHaveBeenCalled();
    expect(mockShare).toHaveBeenCalledTimes(1);
    restoreUA(origUA);
  });
});

// ─── shareTeamInvite ──────────────────────────────────────────────────────────
describe("shareTeamInvite()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setKakaoAvailable();
  });

  afterEach(() => {
    setKakaoUnavailable();
  });

  const baseArgs = {
    teamName: "FC 테스트",
    inviteCode: "INVITE123",
  };

  it("초대 코드가 URL에 포함됨", async () => {
    await shareTeamInvite(baseArgs);
    const call = mockKakao.Share.sendDefault.mock.calls[0][0];
    const webUrl = call.content.link.webUrl;

    expect(webUrl).toContain("INVITE123");
    expect(webUrl).toBe(`${APP_URL}/team?code=INVITE123`);
  });

  it("content title에 팀명 포함", async () => {
    await shareTeamInvite(baseArgs);
    expect(mockKakao.Share.sendDefault).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining("FC 테스트"),
        }),
      })
    );
  });

  it("content description에 행동 유도 문구 포함", async () => {
    await shareTeamInvite(baseArgs);
    const call = mockKakao.Share.sendDefault.mock.calls[0][0];
    expect(call.content.description).toBeDefined();
  });

  it("Kakao 미사용 시 navigator.share fallback (모바일, 초대 코드 URL 포함)", async () => {
    const origUA = navigator.userAgent;
    mockMobileUA();
    setKakaoUnavailable();

    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    await shareTeamInvite(baseArgs);

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(`${APP_URL}/team?code=INVITE123`),
      })
    );
    restoreUA(origUA);
  });
});
