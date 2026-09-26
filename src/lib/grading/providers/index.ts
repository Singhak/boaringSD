import type { GradingProvider } from "../types";
import { createGeminiProvider } from "./gemini";

export interface GradingEnv {
  LLM_PROVIDER?: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
}

/**
 * Picks the grading backend from env. Returns null when none is configured,
 * in which case the app falls back to self-assessment.
 *
 * LLM_PROVIDER: "gemini" (implemented). Other providers plug in here by
 * implementing GradingProvider.
 */
export function getGradingProvider(env: GradingEnv = process.env as GradingEnv): GradingProvider | null {
  const provider = (env.LLM_PROVIDER ?? "").trim().toLowerCase();
  const apiKey = env.LLM_API_KEY?.trim();
  if (!provider || !apiKey) return null;

  switch (provider) {
    case "gemini":
      return createGeminiProvider(apiKey, env.LLM_MODEL?.trim() || undefined);
    default:
      return null;
  }
}
