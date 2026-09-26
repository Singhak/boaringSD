/**
 * Back-of-the-envelope estimate parsing and scoring, shared by the math gym and
 * the interview estimation stage. Scoring is by ratio (how many times off),
 * so 2x too high and 2x too low score the same.
 */

export type EstimateGrade = "perfect" | "acceptable" | "order_of_magnitude" | "incorrect";

export interface EstimateScore {
  score: number; // 0–100
  grade: EstimateGrade;
  /** How many times off the estimate is (1 = exact). */
  factor: number;
  percentageError: number;
}

const MAGNITUDES: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  mm: 1e6,
  million: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
  t: 1e12,
  trillion: 1e12,
};

// Longest alternatives first; a suffix must not run into more letters, so "3 MB" stays 3.
const ESTIMATE_RE = /^~?\s*([0-9]*\.?[0-9]+(?:e[+-]?\d+)?)\s*(trillion|thousand|million|billion|bn|mm|k|m|b|t)?(?![a-z])/i;

/** Parses "12k", "1.2M", "1e4", "1,000", "~350 req/s", "3 GB". Returns NaN when unreadable. */
export function parseEstimate(input: string): number {
  const cleaned = input.trim().replace(/[,_]/g, "");
  const match = ESTIMATE_RE.exec(cleaned);
  if (!match) return NaN;
  const base = Number(match[1]);
  const suffix = match[2]?.toLowerCase();
  return suffix ? base * MAGNITUDES[suffix] : base;
}

const PERFECT_FACTOR = 1.15;
const BALLPARK_FACTOR = 3;
const MAGNITUDE_FACTOR = 10;

/**
 * @param tolerancePercent how far off still counts as a solid estimate (default 35%).
 */
export function scoreEstimate(answer: number, target: number, tolerancePercent = 35): EstimateScore {
  if (!Number.isFinite(answer) || answer <= 0 || target <= 0) {
    return { score: 0, grade: "incorrect", factor: Infinity, percentageError: 100 };
  }

  const factor = Math.max(answer / target, target / answer);
  const percentageError = Math.round((Math.abs(answer - target) / target) * 100);
  const acceptableFactor = Math.max(PERFECT_FACTOR, 1 + tolerancePercent / 100);

  if (factor <= PERFECT_FACTOR) return { score: 100, grade: "perfect", factor, percentageError };
  if (factor <= acceptableFactor) return { score: 85, grade: "acceptable", factor, percentageError };
  if (factor <= BALLPARK_FACTOR) return { score: 50, grade: "order_of_magnitude", factor, percentageError };
  if (factor <= MAGNITUDE_FACTOR) return { score: 20, grade: "incorrect", factor, percentageError };
  return { score: 0, grade: "incorrect", factor, percentageError };
}
