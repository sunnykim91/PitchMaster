import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError } from "@/lib/api-helpers";

/**
 * 시즌 어워드 공유 카드 (SVG 이미지)
 * GET /api/season-award-card?seasonId=xxx
 */
export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  // season-awards API에서 데이터 가져오기 (내부 호출)
  const seasonId = request.nextUrl.searchParams.get("seasonId");
  const awardsUrl = new URL("/api/season-awards", request.url);
  if (seasonId) awardsUrl.searchParams.set("seasonId", seasonId);

  const awardsRes = await fetch(awardsUrl.toString(), {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
  });

  if (!awardsRes.ok) {
    return apiError("Failed to fetch awards data", awardsRes.status);
  }

  const data = await awardsRes.json();
  const { awards, seasonName, teamName, totalMatches, record } = data;

  // SVG 렌더링 헬퍼
  const escSvg = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // 어워드 행 생성
  type AwardRow = {
    emoji: string;
    label: string;
    name: string;
    stat: string;
  };
  const rows: AwardRow[] = [];

  if (awards.topScorer) {
    rows.push({
      emoji: "\u{1F947}",
      label: "득점왕",
      name: awards.topScorer.name,
      stat: `${awards.topScorer.value}골`,
    });
  }
  if (awards.topAssist) {
    rows.push({
      emoji: "\u{1F947}",
      label: "도움왕",
      name: awards.topAssist.name,
      stat: `${awards.topAssist.value}어시`,
    });
  }
  if (awards.ironWall) {
    rows.push({
      emoji: "\u{1F6E1}\uFE0F",
      label: "철벽수비",
      name: awards.ironWall.name,
      stat: `${awards.ironWall.value}CS`,
    });
  }
  if (awards.topAttendance) {
    rows.push({
      emoji: "\u{1F3C3}",
      label: "출석왕",
      name: awards.topAttendance.name,
      stat: `${awards.topAttendance.value}`,
    });
  }
  if (awards.luckyCharm) {
    rows.push({
      emoji: "\u{1F340}",
      label: "승리요정",
      name: awards.luckyCharm.name,
      stat: `${awards.luckyCharm.value}`,
    });
  }
  if (awards.topMvp) {
    rows.push({
      emoji: "\u2B50",
      label: "MOM",
      name: awards.topMvp.name,
      stat: `${awards.topMvp.value}회`,
    });
  }
  if (awards.bestMatch) {
    const d = awards.bestMatch.date?.slice(5) ?? "";
    rows.push({
      emoji: "\u26A1",
      label: "베스트매치",
      name: `${d} vs ${awards.bestMatch.opponent}`,
      stat: awards.bestMatch.score,
    });
  }

  // SVG 레이아웃 계산
  const width = 600;
  const headerHeight = 120;
  const rowHeight = 56;
  const footerHeight = 80;
  const height = headerHeight + rows.length * rowHeight + footerHeight;

  const recordText =
    record
      ? `${record.wins}승 ${record.draws}무 ${record.losses}패`
      : "";

  const awardRows = rows
    .map((row, i) => {
      const y = headerHeight + i * rowHeight + 36;
      return `
      <text x="50" y="${y}" fill="#f8fafc" font-size="20" font-family="sans-serif">${row.emoji}</text>
      <text x="85" y="${y}" fill="#94a3b8" font-size="14" font-family="sans-serif" font-weight="bold">${escSvg(row.label)}</text>
      <text x="190" y="${y}" fill="#f8fafc" font-size="16" font-family="sans-serif">${escSvg(row.name)}</text>
      <text x="550" y="${y}" fill="#ff7a45" font-size="16" font-family="sans-serif" text-anchor="end" font-weight="bold">${escSvg(row.stat)}</text>
      ${i < rows.length - 1 ? `<line x1="50" y1="${y + 16}" x2="550" y2="${y + 16}" stroke="#1e293b" stroke-width="1"/>` : ""}`;
    })
    .join("");

  const footerY = headerHeight + rows.length * rowHeight + 30;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#0b0f1a"/>
      <stop offset="100%" stop-color="#1a1230"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" rx="24"/>
  <text x="300" y="50" text-anchor="middle" fill="#fbbf24" font-size="26" font-weight="bold" font-family="sans-serif">\u{1F3C6} ${escSvg(seasonName)} 시즌 어워드</text>
  <text x="300" y="80" text-anchor="middle" fill="#c7d2fe" font-size="16" font-family="sans-serif">${escSvg(teamName)} \u00B7 ${totalMatches}경기</text>
  <line x1="50" y1="100" x2="550" y2="100" stroke="#334155" stroke-width="1"/>
  ${awardRows}
  <text x="300" y="${footerY}" text-anchor="middle" fill="#2bd3b5" font-size="18" font-weight="bold" font-family="sans-serif">${escSvg(recordText)}</text>
  <text x="300" y="${footerY + 30}" text-anchor="middle" fill="#64748b" font-size="11" font-family="sans-serif">PITCHMASTER \u00B7 pitch-master.app</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
