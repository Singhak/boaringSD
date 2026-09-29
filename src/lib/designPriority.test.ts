import test from "node:test";
import assert from "node:assert/strict";

import { applyPriority, priorityForAttempt, starsWithPriority } from "./designPriority";
import type { ScenarioEvaluation } from "./builderScore";
import { getAllBuilderScenarios } from "@/data/builderScenarios";

const scenario = getAllBuilderScenarios()[0];
const node = (id: string, type: string) => ({ id, data: { type } });
const LEAN = [node("u", "client"), node("s1", "server"), node("db", "database")];
const REDUNDANT = [node("u", "client"), node("lb", "load_balancer"), node("s1", "server"), node("s2", "server"), node("db", "database"), node("r", "replica")];

function evaluation(over: { latencyMs?: number; cost?: number; budget?: number } = {}): ScenarioEvaluation {
  return {
    score: { score: 80, grade: "A", findings: [], summary: "" } as unknown as ScenarioEvaluation["score"],
    checks: [{ id: "server-cpu", status: "pass", message: "ok" }],
    cost: over.cost ?? 1000,
    budget: over.budget ?? 2000,
    canPass: true,
    simulation: { nodeStates: {}, metrics: { latencyMs: over.latencyMs ?? 90 } } as unknown as ScenarioEvaluation["simulation"],
    failureReasons: [],
  };
}

test("each attempt rotates through the three priorities", () => {
  const seen = new Set([0, 1, 2].map((a) => priorityForAttempt(scenario.id, a)));
  assert.equal(seen.size, 3);
  assert.equal(priorityForAttempt(scenario.id, 0), priorityForAttempt(scenario.id, 3));
});

test("the same lean, cheap design meets 'cut cost' and misses 'survive failures'", () => {
  const cheap = evaluation({ cost: 1000, budget: 2000 });
  assert.equal(applyPriority(cheap, LEAN, scenario, "cost").priorityOutcome, "met");
  const resilience = applyPriority(cheap, LEAN, scenario, "resilience");
  assert.equal(resilience.priorityOutcome, "missed");
  assert.match(resilience.checks.at(-1)!.message, /single point of failure: one app server/);
  assert.equal(applyPriority(cheap, REDUNDANT, scenario, "resilience").priorityOutcome, "met");
});

test("latency: under half the target is met, up to 80% is neutral, beyond is missed", () => {
  const target = scenario.targets.maxLatencyMs ?? 200;
  const at = (f: number) => applyPriority(evaluation({ latencyMs: target * f }), LEAN, scenario, "latency").priorityOutcome;
  assert.equal(at(0.4), "met");
  assert.equal(at(0.7), "neutral");
  assert.equal(at(0.95), "missed");
});

test("a priority never changes pass/fail or the score, only the stars", () => {
  const e = evaluation();
  const out = applyPriority(e, LEAN, scenario, "resilience");
  assert.equal(out.canPass, e.canPass);
  assert.equal(out.score.score, e.score.score);
  assert.equal(starsWithPriority(3, "missed"), 2);
  assert.equal(starsWithPriority(1, "missed"), 1);
  assert.equal(starsWithPriority(3, "neutral"), 3);
  assert.equal(starsWithPriority(2, undefined), 2);
});
