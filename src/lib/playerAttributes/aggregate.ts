// PitchScore™ Triple Trust 알고리즘 — 가중평균 계산 핵심
// PitchScore = Σ(score × authority × recency × formality) / Σ(authority × recency × formality)

import {
  AUTHORITY_WEIGHTS,
  calculateRecencyWeight,
  calculateFormalityWeight,
} from './config';
import type { TripleTrustInput, PitchScoreResult } from './types';

export interface PitchScoreOptions {
  now?: Date;
}

/**
 * Triple Trust 알고리즘으로 PitchScore 산출.
 * 평가가 0건이면 pitch_score=0, sample_count=0 반환.
 */
export function calculatePitchScore(
  evaluations: TripleTrustInput[],
  options: PitchScoreOptions = {},
): PitchScoreResult {
  const now = options.now ?? new Date();

  if (evaluations.length === 0) {
    return { pitch_score: 0, sample_count: 0, total_weight: 0 };
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const ev of evaluations) {
    const authority = AUTHORITY_WEIGHTS[ev.source];
    const daysAgo = Math.floor(
      (now.getTime() - new Date(ev.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    const recency = calculateRecencyWeight(daysAgo);
    const formality = calculateFormalityWeight(ev.source, ev.context);

    const w = authority * recency * formality;
    weightedSum += ev.score * w;
    totalWeight += w;
  }

  return {
    pitch_score: round2(weightedSum / totalWeight),
    sample_count: evaluations.length,
    total_weight: round2(totalWeight),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * PitchScore (소수)를 가장 가까운 정수 라벨 단계로 변환 (1~5).
 */
export function pitchScoreToLevel(score: number): 1 | 2 | 3 | 4 | 5 {
  const rounded = Math.round(score);
  if (rounded < 1) return 1;
  if (rounded > 5) return 5;
  return rounded as 1 | 2 | 3 | 4 | 5;
}
