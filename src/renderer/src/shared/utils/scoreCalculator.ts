export interface ScoreDimensions {
  visualScore?: number | null;
  promptAdherenceScore?: number | null;
  functionalityScore?: number | null;
  codeQualityScore?: number | null;
  creativityScore?: number | null;
}

/**
 * Calculates the overall score as the arithmetic mean of available dimension scores.
 * Returns null if no dimension score is provided.
 */
export function calculateOverallScore(dimensions: ScoreDimensions): number | null {
  const scores: number[] = [];

  if (typeof dimensions.visualScore === 'number' && !isNaN(dimensions.visualScore)) {
    scores.push(dimensions.visualScore);
  }
  if (typeof dimensions.promptAdherenceScore === 'number' && !isNaN(dimensions.promptAdherenceScore)) {
    scores.push(dimensions.promptAdherenceScore);
  }
  if (typeof dimensions.functionalityScore === 'number' && !isNaN(dimensions.functionalityScore)) {
    scores.push(dimensions.functionalityScore);
  }
  if (typeof dimensions.codeQualityScore === 'number' && !isNaN(dimensions.codeQualityScore)) {
    scores.push(dimensions.codeQualityScore);
  }
  if (typeof dimensions.creativityScore === 'number' && !isNaN(dimensions.creativityScore)) {
    scores.push(dimensions.creativityScore);
  }

  if (scores.length === 0) {
    return null;
  }

  const sum = scores.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / scores.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Calculates average and variance across an array of scores.
 */
export function calculateStats(scores: number[]): { average: number; variance: number; stdDev: number } {
  const valid = scores.filter((s) => typeof s === 'number' && !isNaN(s));
  if (valid.length === 0) {
    return { average: 0, variance: 0, stdDev: 0 };
  }

  const average = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance = valid.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / valid.length;
  const stdDev = Math.sqrt(variance);

  return {
    average: Math.round(average * 100) / 100,
    variance: Math.round(variance * 1000) / 1000,
    stdDev: Math.round(stdDev * 100) / 100,
  };
}
