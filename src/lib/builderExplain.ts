/**
 * The builder's "Explain your design" gate: one retry, and each wrong pick costs a star.
 * Only a first-try pass counts toward the Reliable mastery tier.
 */

export const MAX_EXPLAIN_ATTEMPTS = 2;

export interface ExplainOutcome {
  /** True once the gate is settled: answered right, or out of retries. */
  done: boolean;
  passed: boolean;
  firstTry: boolean;
  stars: 1 | 2 | 3;
  retriesLeft: number;
}

/** `answers` holds the correctness of each submission, in order. */
export function explainOutcome(answers: boolean[]): ExplainOutcome {
  const used = answers.slice(0, MAX_EXPLAIN_ATTEMPTS);
  const passedAt = used.indexOf(true);
  const wrong = passedAt === -1 ? used.length : passedAt;
  const passed = passedAt !== -1;
  return {
    done: passed || used.length >= MAX_EXPLAIN_ATTEMPTS,
    passed,
    firstTry: passedAt === 0,
    stars: (3 - Math.min(2, wrong)) as 1 | 2 | 3,
    retriesLeft: Math.max(0, MAX_EXPLAIN_ATTEMPTS - used.length),
  };
}

/** Builder XP scales with stars, so a guessed explanation pays less. */
export function builderXpForStars(rewardXp: number, stars: 1 | 2 | 3): number {
  return Math.round((rewardXp * stars) / 3);
}
