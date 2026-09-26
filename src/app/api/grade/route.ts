import { getReasoningPrompt } from "@/data/reasoningPrompts";
import { createRateLimiter, gradeAnswer } from "@/lib/grading/grade";
import { getGradingProvider } from "@/lib/grading/providers";

// 20 graded answers per minute per client is plenty for play and caps LLM spend.
const allow = createRateLimiter(20, 60_000);

export async function POST(request: Request) {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(client)) {
    return Response.json({ error: "Too many answers, take a breath and try again in a minute" }, { status: 429 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const outcome = await gradeAnswer(input, {
    provider: getGradingProvider(),
    lookupPrompt: getReasoningPrompt,
  });
  return Response.json(outcome.body, { status: outcome.status });
}
