// PitchScore™ — 선수 능력치 평가 시스템 타입 정의
// Triple Trust 알고리즘으로 산출되는 가중 평균 점수

export type AttributeCode =
  | 'SPEED'
  | 'FINISHING' | 'SHOT_POWER'
  | 'SHORT_PASS' | 'LONG_PASS' | 'CROSS' | 'FREE_KICK' | 'VISION'
  | 'DRIBBLING' | 'TRAPPING' | 'BREAK_PRESS'
  | 'TACKLING' | 'POSITIONING' | 'CLEARING' | 'INTERCEPT'
  | 'STAMINA' | 'STRENGTH'
  | 'HEADING'
  | 'GK_REFLEX' | 'GK_LONG_KICK' | 'GK_FOOT' | 'GK_HANDLING';

export type AttributeCategory =
  | 'PACE' | 'SHOOTING' | 'PASSING' | 'DRIBBLING'
  | 'DEFENDING' | 'PHYSICAL' | 'HEADING' | 'GOALKEEPING';

export type EvaluationSource = 'SELF' | 'STAFF' | 'PEER';
export type EvaluationContext = 'ROUND' | 'FREE' | 'POST_MATCH';

export type AttributeLevel = 1 | 2 | 3 | 4 | 5;

export interface AttributeCodeMaster {
  code: AttributeCode;
  name_ko: string;
  category: AttributeCategory;
  display_order: number;
  gk_only: boolean;
}

export interface AttributeLabel {
  attribute_code: AttributeCode;
  level: AttributeLevel;
  label_ko: string;
}

export interface PlayerEvaluation {
  id: string;
  target_user_id: string;
  evaluator_user_id: string;
  team_id: string | null;
  attribute_code: AttributeCode;
  score: AttributeLevel;
  source: EvaluationSource;
  context: EvaluationContext;
  match_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerAttributeScore {
  user_id: string;
  attribute_code: AttributeCode;
  weighted_avg: number;
  sample_count: number;
  updated_at: string;
}

// Triple Trust 알고리즘 입력 (가중치 계산용)
export interface TripleTrustInput {
  score: AttributeLevel;
  source: EvaluationSource;
  context: EvaluationContext;
  created_at: string;
}

// PitchScore 산출 결과
export interface PitchScoreResult {
  pitch_score: number;        // 0~5 (소수점 2자리)
  sample_count: number;
  total_weight: number;
}

// 능력치 1개에 대한 종합 결과 (UI 노출용)
export interface AggregatedAttributeScore {
  attribute_code: AttributeCode;
  name_ko: string;
  category: AttributeCategory;
  pitch_score: number;
  sample_count: number;
  level_label?: string;       // 가장 가까운 정수 단계의 라벨
}
