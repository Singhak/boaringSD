/**
 * Shared answer-length lint for every multiple-choice source. A player who
 * always picks the longest option should do no better than chance.
 */

export interface LintOption {
  text: string;
  correct: boolean;
}

export interface LintQuestion {
  /** Where the question lives, for failure messages. */
  id: string;
  options: LintOption[];
}

export interface OptionLintReport {
  questions: number;
  /** Share of questions whose correct option is the (strictly) longest. */
  correctIsLongestShare: number;
  /** Mean over questions of (correct length / mean wrong length). */
  avgLengthRatio: number;
  /** Questions whose correct option is the longest, for fixing. */
  longestIds: string[];
  /**
   * Share of questions whose correct option sits at each length rank
   * ("shortest", "middle", "longest"). No rank may win most of the time,
   * or "pick the shortest / middle one" becomes the new trick.
   */
  rankShares: Record<LengthRank, number>;
}

export type LengthRank = "shortest" | "middle" | "longest";

/** Targets from docs/fix-plan-v2.md 1.2. */
export const MAX_CORRECT_IS_LONGEST_SHARE = 0.4;
export const MAX_AVG_LENGTH_RATIO = 1.1;
/** No length rank may hold the correct option in more than this share of questions. */
export const MAX_RANK_SHARE = 0.5;

export function correctIsLongest(q: LintQuestion): boolean {
  const correct = q.options.filter((o) => o.correct);
  const wrong = q.options.filter((o) => !o.correct);
  if (correct.length === 0 || wrong.length === 0) return false;
  const longestWrong = Math.max(...wrong.map((o) => o.text.length));
  return correct.some((o) => o.text.length > longestWrong);
}

export function lengthRatio(q: LintQuestion): number | null {
  const correct = q.options.filter((o) => o.correct);
  const wrong = q.options.filter((o) => !o.correct);
  if (correct.length === 0 || wrong.length === 0) return null;
  const mean = (xs: LintOption[]) => xs.reduce((a, o) => a + o.text.length, 0) / xs.length;
  return mean(correct) / mean(wrong);
}

/** Where the (first) correct option ranks by length: strictly shortest, strictly longest, or in between. */
export function correctLengthRank(q: LintQuestion): LengthRank | null {
  const correct = q.options.find((o) => o.correct);
  const wrong = q.options.filter((o) => !o.correct);
  if (!correct || wrong.length === 0) return null;
  if (correct.text.length > Math.max(...wrong.map((o) => o.text.length))) return "longest";
  if (correct.text.length < Math.min(...wrong.map((o) => o.text.length))) return "shortest";
  return "middle";
}

export function lintOptions(questions: LintQuestion[]): OptionLintReport {
  const ratios = questions.map(lengthRatio).filter((r): r is number => r !== null);
  const longestIds = questions.filter(correctIsLongest).map((q) => q.id);
  const ranks = questions.map(correctLengthRank).filter((r): r is LengthRank => r !== null);
  const share = (rank: LengthRank) => (ranks.length ? ranks.filter((r) => r === rank).length / ranks.length : 0);
  return {
    questions: questions.length,
    correctIsLongestShare: questions.length ? longestIds.length / questions.length : 0,
    avgLengthRatio: ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1,
    longestIds,
    rankShares: { shortest: share("shortest"), middle: share("middle"), longest: share("longest") },
  };
}

export function passesOptionLint(report: OptionLintReport): boolean {
  return (
    report.correctIsLongestShare <= MAX_CORRECT_IS_LONGEST_SHARE &&
    report.avgLengthRatio <= MAX_AVG_LENGTH_RATIO &&
    Object.values(report.rankShares).every((s) => s <= MAX_RANK_SHARE)
  );
}
