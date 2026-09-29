import type { TradeoffCardOption } from "@/types";

/** An alternate pair of Defense questions for one tradeoff option, shown on some attempts instead of the base pair. */
export interface DefenseQuestionPair {
  tradeoffDefenseQuestion: TradeoffCardOption["tradeoffDefenseQuestion"];
  stressTest10xQuestion: TradeoffCardOption["stressTest10xQuestion"];
}

/** Keyed by tradeoff option id (for example `opt-cache-aside`). */
export type DefensePoolPart = Record<string, DefenseQuestionPair[]>;
