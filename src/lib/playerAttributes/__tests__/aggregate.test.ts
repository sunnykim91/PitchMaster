import { describe, it, expect } from 'vitest';
import { calculatePitchScore, pitchScoreToLevel } from '../aggregate';
import type { TripleTrustInput } from '../types';

const NOW = new Date('2026-05-02T00:00:00Z');

function ev(
  partial: Partial<TripleTrustInput> & Pick<TripleTrustInput, 'score'>,
): TripleTrustInput {
  return {
    source: 'PEER',
    context: 'FREE',
    created_at: NOW.toISOString(),
    ...partial,
  };
}

describe('calculatePitchScore — Triple Trust 알고리즘', () => {
  it('평가 0건이면 0, 0, 0 반환', () => {
    const result = calculatePitchScore([], { now: NOW });
    expect(result).toEqual({ pitch_score: 0, sample_count: 0, total_weight: 0 });
  });

  it('일반 회원 1명 평가 (authority 1.0 × recency 1.0 × formality 0.85)', () => {
    const result = calculatePitchScore(
      [ev({ score: 4, source: 'PEER', context: 'FREE' })],
      { now: NOW },
    );
    // 4 × (1.0 × 1.0 × 0.85) / (1.0 × 1.0 × 0.85) = 4
    expect(result.pitch_score).toBe(4);
    expect(result.sample_count).toBe(1);
    expect(result.total_weight).toBe(0.85);
  });

  it('운영진(STAFF)이 일반(PEER)보다 영향력 큼', () => {
    // 같은 4점이지만 STAFF는 authority 1.3 → 가중치 더 큼
    const peer = calculatePitchScore(
      [ev({ score: 4, source: 'PEER', context: 'FREE' })],
      { now: NOW },
    );
    const staff = calculatePitchScore(
      [ev({ score: 4, source: 'STAFF', context: 'FREE' })],
      { now: NOW },
    );
    // 단일 평가에선 같은 점수가 나오지만, total_weight가 다름
    expect(peer.pitch_score).toBe(4);
    expect(staff.pitch_score).toBe(4);
    expect(staff.total_weight).toBeGreaterThan(peer.total_weight);
  });

  it('SELF formality 0.7 적용', () => {
    // SELF: authority 0.7 × recency 1.0 × formality 0.7 = 0.49
    const result = calculatePitchScore(
      [ev({ score: 5, source: 'SELF', context: 'FREE' })],
      { now: NOW },
    );
    expect(result.pitch_score).toBe(5);
    expect(result.total_weight).toBe(0.49);
  });

  it('ROUND context는 formality 1.0', () => {
    const round = calculatePitchScore(
      [ev({ score: 4, source: 'PEER', context: 'ROUND' })],
      { now: NOW },
    );
    expect(round.total_weight).toBe(1.0);
  });

  it('1년 지난 평가는 신선도 0.5', () => {
    const oneYearAgo = new Date('2025-04-01T00:00:00Z'); // 약 13개월 전
    const result = calculatePitchScore(
      [ev({ score: 5, source: 'PEER', context: 'ROUND', created_at: oneYearAgo.toISOString() })],
      { now: NOW },
    );
    // authority 1.0 × recency 0.5 × formality 1.0 = 0.5
    expect(result.total_weight).toBe(0.5);
  });

  it('운영진 1명 + 일반 3명 + 본인 1명 가중평균 (스펙 예시)', () => {
    // 운영진 4점, 일반 (3,4,3) 평균 3.33, 본인 5점
    // STAFF 4 × (1.3 × 1.0 × 0.85) = 4 × 1.105 = 4.42
    // PEER  3 × (1.0 × 1.0 × 0.85) = 2.55
    // PEER  4 × (1.0 × 1.0 × 0.85) = 3.40
    // PEER  3 × (1.0 × 1.0 × 0.85) = 2.55
    // SELF  5 × (0.7 × 1.0 × 0.7)  = 5 × 0.49 = 2.45
    // 분자 = 4.42 + 2.55 + 3.40 + 2.55 + 2.45 = 15.37
    // 분모 = 1.105 + 0.85 + 0.85 + 0.85 + 0.49 = 4.145
    // 평균 = 15.37 / 4.145 = 3.71
    const result = calculatePitchScore(
      [
        ev({ score: 4, source: 'STAFF', context: 'FREE' }),
        ev({ score: 3, source: 'PEER', context: 'FREE' }),
        ev({ score: 4, source: 'PEER', context: 'FREE' }),
        ev({ score: 3, source: 'PEER', context: 'FREE' }),
        ev({ score: 5, source: 'SELF', context: 'FREE' }),
      ],
      { now: NOW },
    );
    expect(result.pitch_score).toBeCloseTo(3.71, 1);
    expect(result.sample_count).toBe(5);
  });

  it('최신 평가가 오래된 평가보다 영향력 큼', () => {
    const recent = ev({ score: 5, source: 'PEER', context: 'ROUND', created_at: NOW.toISOString() });
    const old = ev({
      score: 1,
      source: 'PEER',
      context: 'ROUND',
      created_at: '2024-01-01T00:00:00Z', // 약 16개월 전, recency 0.5
    });

    const result = calculatePitchScore([recent, old], { now: NOW });
    // recent: 5 × 1.0 = 5.0,  old: 1 × 0.5 = 0.5
    // 분자 = 5.0 + 0.5 = 5.5,  분모 = 1.0 + 0.5 = 1.5,  평균 = 3.67
    // 단순 평균(3)보다 높음 → 최신 가중
    expect(result.pitch_score).toBeGreaterThan(3);
  });
});

describe('pitchScoreToLevel', () => {
  it('점수를 가장 가까운 정수로 변환', () => {
    expect(pitchScoreToLevel(3.71)).toBe(4);
    expect(pitchScoreToLevel(3.49)).toBe(3);
    expect(pitchScoreToLevel(0.5)).toBe(1);
    expect(pitchScoreToLevel(5.5)).toBe(5);
    expect(pitchScoreToLevel(1)).toBe(1);
    expect(pitchScoreToLevel(5)).toBe(5);
  });
});
