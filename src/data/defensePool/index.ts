import { PART as part1 } from "./part1";
import { PART as part2 } from "./part2";
import { PART as part3 } from "./part3";
import { PART as part4 } from "./part4";
import type { DefensePoolPart, DefenseQuestionPair } from "./types";

export type { DefensePoolPart, DefenseQuestionPair } from "./types";

/** Alternate Defense question pairs, keyed by tradeoff option id. The base pair on the option is always in the rotation too. */
export const DEFENSE_POOL: DefensePoolPart = { ...part1, ...part2, ...part3, ...part4 };

export function getDefenseAlternates(optionId: string): DefenseQuestionPair[] {
  return DEFENSE_POOL[optionId] ?? [];
}
