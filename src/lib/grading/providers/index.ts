import type { GradingProvider } from "../types";
import { createGeminiProvider } from "./gemini";

export interface GradingEnv {
  LLM_PROVIDER?: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  /** Model to fall back to when LLM_MODEL is missing or keeps failing. "off" disables it. */
  LLM_FALLBACK_MODEL?: string;
}

/** Unset or empty means the built-in stable model; "off" (or "none") turns the fallback off. */
function fallbackFromEnv(value: string | undefined): string | null | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  return /^(off|none|false)$/i.test(v) ? null : v;
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
      return createGeminiProvider(apiKey, env.LLM_MODEL?.trim() || undefined, fetch, {
        fallbackModel: fallbackFromEnv(env.LLM_FALLBACK_MODEL),
      });
    default:
      return null;
  }
}
