import { MAX_ANSWER_CHARS, rubricScore, type GradeResponse, type GradingProvider, type ReasoningPrompt } from "./types";

export interface GradeDeps {
  provider: GradingProvider | null;
  lookupPrompt: (id: string) => ReasoningPrompt | undefined;
}

export type GradeOutcome = { status: number; body: GradeResponse | { error: string } };

/**
 * Validates a grade request and grades it. The rubric always comes from the
 * server-side prompt list (never from the client), and the score is computed
 * here from rubric weights rather than trusted from the model.
 */
export async function gradeAnswer(input: unknown, deps: GradeDeps): Promise<GradeOutcome> {
  const body = (input ?? {}) as { promptId?: unknown; answer?: unknown };
  if (typeof body.promptId !== "string" || typeof body.answer !== "string") {
    return { status: 400, body: { error: "promptId and answer are required strings" } };
  }

  const prompt = deps.lookupPrompt(body.promptId);
  if (!prompt) return { status: 404, body: { error: "Unknown prompt" } };

  const answer = body.answer.trim();
  if (answer.length === 0) return { status: 400, body: { error: "Answer is empty" } };
  if (answer.length > MAX_ANSWER_CHARS) {
    return { status: 400, body: { error: `Answer is longer than ${MAX_ANSWER_CHARS} characters` } };
  }

  if (!deps.provider) {
    return { status: 200, body: { mode: "self-assess", reason: "No grader is configured" } };
  }

  try {
    const verdict = await deps.provider.grade(prompt, answer);
    const score = rubricScore(
      prompt.rubric,
      verdict.items.filter((i) => i.met).map((i) => i.id)
    );
    return {
      status: 200,
      body: { mode: "graded", result: { ...verdict, score, provider: deps.provider.name } },
    };
  } catch {
    // Grader down or returned junk: the learner can still self-assess.
    return { status: 200, body: { mode: "self-assess", reason: "The grader is unavailable right now" } };
  }
}

/** Fixed-window limiter keyed by client (in-memory, per server instance). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string, now = Date.now()): boolean => {
    const entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
      }
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
