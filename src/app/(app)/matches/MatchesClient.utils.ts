import type { DbMatch, Match } from "./MatchesClient.types";

export function mapDbMatchToMatch(db: DbMatch): Match {
  return {
    id: db.id,
    date: db.match_date,
    time: db.match_time,
    endTime: db.match_end_time,
    endDate: db.match_end_date,
    location: db.location,
    opponent: db.opponent_name || undefined,
    quarterCount: db.quarter_count,
    quarterDuration: db.quarter_duration,
    breakDuration: db.break_duration,
    status: db.status,
    voteDeadline: db.vote_deadline || undefined,
    score: db.score ?? null,
    uniformType: (db.uniform_type === "THIRD" ? "THIRD" : db.uniform_type === "AWAY" ? "AWAY" : "HOME") as "HOME" | "AWAY" | "THIRD",
    matchType: (db.match_type === "INTERNAL" ? "INTERNAL" : db.match_type === "EVENT" ? "EVENT" : "REGULAR") as "REGULAR" | "INTERNAL" | "EVENT",
    sportType: (db.sport_type === "FUTSAL" ? "FUTSAL" : db.sport_type === "SOCCER" ? "SOCCER" : null) as "SOCCER" | "FUTSAL" | null,
    playerCount: db.player_count ?? undefined,
    statsIncluded: db.stats_included ?? true,
  };
}

// 시안 카드용 — matchType별 hue + 라벨 매핑
export function matchTypeMeta(type: Match["matchType"]): { label: string; hue: "atk" | "def" | "mid" } {
  switch (type) {
    case "INTERNAL":
      return { label: "자체", hue: "def" };
    case "EVENT":
      return { label: "이벤트", hue: "mid" };
    default:
      return { label: "정규", hue: "atk" };
  }
}
