import { deterministicShuffle } from "@/lib/shuffle";
import type { PatternTradeoffSet } from "@/data/tradeoffScenarios";
import type { TradeoffCardOption } from "@/types";

type DefenseQuestion = TradeoffCardOption["tradeoffDefenseQuestion"];

export interface DefenseQuestions {
  q1: DefenseQuestion;
  q2: DefenseQuestion;
}

const STOP_WORDS = new Set(["with", "from", "into", "that", "this", "the", "and", "for", "add", "deploy", "pattern"]);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
  );
}

/**
 * The tradeoff card that matches what the player deployed: the option sharing the
 * most words with the deployed label. Falls back to the recommended option.
 */
export function pickDefenseOption(set: PatternTradeoffSet, deployedLabel: string): TradeoffCardOption | undefined {
  const recommended = set.options.find((o) => o.id === set.recommendedOptionId) ?? set.options[0];
  const deployed = words(deployedLabel);
  let best = recommended;
  let bestScore = 0;
  for (const option of set.options) {
    const optionWords = words(`${option.title} ${option.tagline}`);
    const score = [...deployed].filter((w) => optionWords.has(w)).length;
    if (score > bestScore) {
      best = option;
      bestScore = score;
    }
  }
  return best;
}

/** Defense questions framed around the player's own deploy, with options in a per-attempt order. */
export function buildDefenseQuestions(option: TradeoffCardOption, deployedLabel: string, seed: string): DefenseQuestions {
  const q1 = option.tradeoffDefenseQuestion;
  const q2 = option.stressTest10xQuestion;
  return {
    q1: {
      question: `You deployed “${deployedLabel}”. ${q1.question}`,
      options: deterministicShuffle(q1.options, `${seed}|q1`),
    },
    q2: {
      question: q2.question,
      options: deterministicShuffle(q2.options, `${seed}|q2`),
    },
  };
}
