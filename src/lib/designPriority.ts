import type { ArchitectureNodeType, BuilderScenario } from "@/types";
import type { ScenarioCheck, ScenarioEvaluation } from "@/lib/builderScore";
import type { BuilderNodeLike } from "@/lib/graph";

/**
 * A boss attempt comes with a stated business priority. The hard checks and the score never
 * change, so a boss is always winnable; missing the priority costs a star. The same design
 * can earn three stars one visit and two the next, which teaches "it depends on the goal".
 */
export type DesignPriority = "cost" | "latency" | "resilience";

export const PRIORITIES: Record<DesignPriority, { label: string; brief: string }> = {
  cost: { label: "Cut cost", brief: "Finance is watching: come in well under the credit budget." },
  latency: { label: "Lowest latency", brief: "Product wants it fast: beat the latency target with room to spare." },
  resilience: { label: "Survive failures", brief: "Last quarter's outage hurt: no single point of failure on the request path." },
};

export type PriorityOutcome = NonNullable<ScenarioEvaluation["priorityOutcome"]>;

/** Deterministic per attempt, so a replay can bring a different priority. */
export function priorityForAttempt(scenarioId: string, attempt: number): DesignPriority {
  const order: DesignPriority[] = ["cost", "latency", "resilience"];
  const offset = [...scenarioId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return order[(offset + attempt) % order.length];
}

function priorityCheck(
  priority: DesignPriority,
  nodes: BuilderNodeLike[],
  evaluation: ScenarioEvaluation,
  scenario: BuilderScenario
): { outcome: PriorityOutcome; check: ScenarioCheck } {
  const count = (t: ArchitectureNodeType) => nodes.filter((n) => n.data?.type === t).length;
  const status = (o: PriorityOutcome) => (o === "met" ? "pass" : "warn") as ScenarioCheck["status"];
  const tail = (o: PriorityOutcome) => (o === "missed" ? " (−1 star)" : "");

  if (priority === "cost") {
    const ratio = evaluation.cost / Math.max(1, evaluation.budget);
    const outcome: PriorityOutcome = ratio <= 0.8 ? "met" : ratio <= 1 ? "neutral" : "missed";
    return {
      outcome,
      check: {
        id: "priority-cost",
        status: status(outcome),
        message:
          outcome === "met"
            ? `Priority (cut cost): ${Math.round(ratio * 100)}% of budget, well under.`
            : `Priority (cut cost): ${Math.round(ratio * 100)}% of budget; finance wanted 80% or less${tail(outcome)}.`,
      },
    };
  }

  if (priority === "latency") {
    const target = scenario.targets.maxLatencyMs ?? 200;
    const ms = evaluation.simulation.metrics.latencyMs;
    const outcome: PriorityOutcome = ms <= target * 0.5 ? "met" : ms <= target * 0.8 ? "neutral" : "missed";
    return {
      outcome,
      check: {
        id: "priority-latency",
        status: status(outcome),
        message:
          outcome === "met"
            ? `Priority (lowest latency): p95 ${ms}ms, under half of ${target}ms.`
            : `Priority (lowest latency): p95 ${ms}ms; product wanted under ${Math.round(target * 0.5)}ms${tail(outcome)}.`,
      },
    };
  }

  // Resilience: redundancy at each tier the design actually uses.
  const gaps: string[] = [];
  if (count("server") < 2) gaps.push("one app server");
  if (count("server") >= 2 && count("load_balancer") === 0) gaps.push("no load balancer in front of the servers");
  if (count("database") > 0 && count("replica") === 0 && count("consensus_cluster") === 0) gaps.push("the database has no replica");
  const outcome: PriorityOutcome = gaps.length === 0 ? "met" : "missed";
  return {
    outcome,
    check: {
      id: "priority-resilience",
      status: status(outcome),
      message:
        outcome === "met"
          ? "Priority (survive failures): every tier has a spare."
          : `Priority (survive failures): single point of failure: ${gaps.join(", ")}${tail(outcome)}.`,
    },
  };
}

/** Adds the attempt's priority to a scenario evaluation as an extra check; pass/fail and score are untouched. */
export function applyPriority(
  evaluation: ScenarioEvaluation,
  nodes: BuilderNodeLike[],
  scenario: BuilderScenario,
  priority: DesignPriority
): ScenarioEvaluation {
  const { outcome, check } = priorityCheck(priority, nodes, evaluation, scenario);
  return { ...evaluation, checks: [...evaluation.checks, check], priorityOutcome: outcome };
}

/** Final boss stars: missing the priority costs one, never below 1. */
export function starsWithPriority(stars: 1 | 2 | 3, outcome: PriorityOutcome | undefined): 1 | 2 | 3 {
  return outcome === "missed" ? (Math.max(1, stars - 1) as 1 | 2 | 3) : stars;
}
