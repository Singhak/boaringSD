import type { PatternId } from "@/types";

/** One thing a good answer should do, e.g. "Names the cost of the choice". */
export interface RubricItem {
  id: string;
  criterion: string;
  /** Relative importance; the score is the weighted share of items met. */
  weight: number;
}

/**
 * A short "Defend your call" prompt: someone pings the learner in chat and
 * wants a ≤280-character justification. Graded against the rubric.
 */
export interface ReasoningPrompt {
  id: string;
  /** Pattern this prompt belongs to; interview prompts use `interviewId` instead. */
  patternId?: PatternId;
  interviewId?: string;
  kind: "why_this" | "ten_x" | "interview";
  /** Who pings you, e.g. "Priya · Incident commander". */
  askedBy: string;
  /** The chat message: one or two sentences, ≤ 220 characters. */
  prompt: string;
  /** Sentence starters shown as chips to beat the blank page. */
  starters: string[];
  rubric: RubricItem[];
  /** A strong ≤280-character answer shown after grading. */
  modelAnswer: string;
}

export interface RubricVerdict {
  id: string;
  met: boolean;
  note: string;
}

export interface GradeResult {
  /** 0–100, computed from the rubric weights of the items met. */
  score: number;
  items: RubricVerdict[];
  feedback: string;
  provider: string;
}

/** A grading backend (Gemini today; any LLM provider can implement this). */
export interface GradingProvider {
  name: string;
  grade(prompt: ReasoningPrompt, answer: string): Promise<Omit<GradeResult, "score" | "provider">>;
}

/** POST /api/grade response. "self-assess" means no grader is available. */
export type GradeResponse =
  | { mode: "graded"; result: GradeResult }
  | { mode: "self-assess"; reason: string };

export const MAX_ANSWER_CHARS = 280;

/** Weighted share of rubric items met, 0–100. */
export function rubricScore(rubric: RubricItem[], metIds: Iterable<string>): number {
  const met = new Set(metIds);
  const total = rubric.reduce((n, r) => n + r.weight, 0);
  if (total <= 0) return 0;
  const earned = rubric.filter((r) => met.has(r.id)).reduce((n, r) => n + r.weight, 0);
  return Math.round((earned / total) * 100);
}
