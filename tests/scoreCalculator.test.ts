import { describe, it, expect } from 'vitest';
import { calculateOverallScore, calculateStats } from '../src/shared/utils/scoreCalculator';

describe('Score Calculator', () => {
  it('calculates arithmetic mean of provided dimension scores', () => {
    const score = calculateOverallScore({
      visualScore: 9,
      promptAdherenceScore: 8,
      functionalityScore: 9,
      codeQualityScore: 7,
      creativityScore: 9,
    });
    expect(score).toBe(8.4);
  });

  it('handles partial dimension subsets properly', () => {
    const score = calculateOverallScore({
      visualScore: 8,
      functionalityScore: 9,
    });
    expect(score).toBe(8.5);
  });

  it('returns null when no score dimensions are provided', () => {
    const score = calculateOverallScore({});
    expect(score).toBeNull();
  });

  it('calculates average, variance, and standard deviation', () => {
    const stats = calculateStats([8, 8.5, 9, 8.5]);
    expect(stats.average).toBe(8.5);
    expect(stats.variance).toBeCloseTo(0.125, 2);
    expect(stats.stdDev).toBeGreaterThan(0.3);
  });
});
