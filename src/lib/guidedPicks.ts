import { deterministicShuffle } from "@/lib/shuffle";

export interface PickResult {
  pass: boolean;
  missing: number;
  extra: number;
}

/**
 * Grades a Case Studies multi-select. `exact`: the picks must equal the answer
 * set, so selecting everything fails. Otherwise the picks only need to include
 * every required item.
 */
export function checkPicks(selected: readonly string[], correctIds: readonly string[], exact: boolean): PickResult {
  const missing = correctIds.filter((id) => !selected.includes(id)).length;
  const extra = exact ? selected.filter((id) => !correctIds.includes(id)).length : 0;
  return { pass: missing === 0 && extra === 0, missing, extra };
}

/** Pick tiles in a per-attempt order, so the correct picks do not always come first. */
export function orderPicks<T extends { id: string }>(items: readonly T[], seed: string): T[] {
  return deterministicShuffle(items, seed);
}
