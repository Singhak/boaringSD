import type { IncidentChoice } from "@/types";

export type ChipTone = "ok" | "warn" | "bad" | "neutral";

export interface ChoiceChip {
  kind: "approach" | "cost" | "consistency" | "cascade";
  label: string;
  tone: ChipTone;
}

/** The senior engineer's rating of a choice. It is the answer, so it only shows after a deploy. */
export function approachRating(approach: IncidentChoice["approach"]): { label: string; tone: ChipTone } | null {
  if (!approach) return null;
  if (approach === "optimal") return { label: "Optimal", tone: "ok" };
  if (approach === "viable_with_tradeoffs") return { label: "Viable with trade-offs", tone: "warn" };
  return { label: "Anti-pattern", tone: "bad" };
}

/**
 * Chips shown on a choice card. Cost and consistency are trade-off data the
 * player reasons with, so they show before a deploy, but only when every
 * sibling choice has that field too: a chip that only the right answer carries
 * is an answer leak. The approach rating and the cascade warning give the
 * answer away, so they wait until this choice is deployed.
 */
export function visibleChoiceChips(
  choice: IncidentChoice,
  submitted: boolean,
  siblings: IncidentChoice[] = [choice]
): ChoiceChip[] {
  const chips: ChoiceChip[] = [];
  const rating = approachRating(choice.approach);
  if (submitted && rating) chips.push({ kind: "approach", ...rating });

  const everyHasCost = siblings.every((c) => c.tradeoffs?.costMonthlyDelta !== undefined);
  const everyHasConsistency = siblings.every((c) => !!c.tradeoffs?.consistencyGuarantee);

  const cost = choice.tradeoffs?.costMonthlyDelta;
  if (cost !== undefined && (submitted || everyHasCost)) {
    chips.push({ kind: "cost", label: cost > 0 ? `+$${cost}/mo` : "$0/mo", tone: "neutral" });
  }
  if (choice.tradeoffs?.consistencyGuarantee && (submitted || everyHasConsistency)) {
    chips.push({ kind: "consistency", label: choice.tradeoffs.consistencyGuarantee, tone: "neutral" });
  }
  if (submitted && choice.cascadeIncidentId) {
    chips.push({ kind: "cascade", label: "Cascade risk", tone: "warn" });
  }
  return chips;
}
