export type PlayerRatingIdentity = {
  id: string;
  name: string | null;
};

export type PlayerRating = {
  id: string;
  team_id: string;
  match_id: string;
  ratee_id: string;
  rater_id: string;
  score: number;
  /** null = 비공개 마스킹됨 (서버에서 잘라낸 상태) */
  comment: string | null;
  created_at: string;
  updated_at: string;
  rater: PlayerRatingIdentity | null;
  ratee: PlayerRatingIdentity | null;
};

export type PlayerRatingsResponse = {
  ratings: PlayerRating[];
};

export type PlayerRatingSeasonResponse = {
  avgRating: number | null;
  ratingCount: number;
  recent: PlayerRating[];
};
