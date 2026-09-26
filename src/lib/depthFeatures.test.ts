import test from "node:test";
import assert from "node:assert/strict";

import { calculateSkillRadar, DEFAULT_STATS } from "./progression";
import { evaluateScenario } from "./builderScore";
import { getBuilderScenarioById } from "../data/builderScenarios";
import { INTERVIEW_PROBLEMS } from "../data/interview";
import { PATTERN_TRADEOFFS } from "../data/tradeoffScenarios";
import type { BuilderScenario, PatternEvidence, UserStats } from "../types";

function evidence(overrides: Partial<PatternEvidence>): PatternEvidence {
  return {
    runsStarted: 0,
    applied: 0,
    runsCleared: 0,
    diagnosisFirstTry: 0,
    interventionFirstTry: 0,
    transferAttempts: 0,
    transferPasses: 0,
    builderAttempts: 0,
    builderPasses: 0,
    hintsUsed: 0,
    reviewsPassed: 0,
    reviewsFailed: 0,
    reviewStage: 0,
    scenariosPassed: [],
    failureReasons: [],
    ...overrides,
  };
}

test("Skill radar ignores pure activity: XP, streaks and incident counts give no reading", () => {
  const busy: UserStats = {
    ...DEFAULT_STATS,
    currentXp: 950,
    level: 7,
    incidentsSolved: 8,
    systemsSaved: 5,
    streakDays: 4,
    completedInterviews: ["interview-url-shortener"],
    practiceDays: ["2026-09-20", "2026-09-21", "2026-09-22"],
  };
  const radar = calculateSkillRadar(busy);
  for (const s of Object.values(radar.scores)) {
    assert.equal(s.score, 0, `${s.label} should not move without measured results`);
    assert.equal(s.hasEnoughData, false);
    assert.match(s.highlightTip, /^Scouting:/);
  }
});

test("Skill radar reads measured results, and mistakes lower the reading", () => {
  const clean: UserStats = {
    ...DEFAULT_STATS,
    patternProgress: {
      caching: evidence({ runsCleared: 5, diagnosisFirstTry: 5, interventionFirstTry: 5, transferAttempts: 5, transferPasses: 5 }),
    },
    estimationResults: {
      a: { best: 100, last: 100, attempts: 1 },
      b: { best: 85, last: 85, attempts: 2 },
      c: { best: 100, last: 50, attempts: 3 },
    },
  };
  const sloppy: UserStats = {
    ...clean,
    patternProgress: {
      caching: evidence({ runsCleared: 5, diagnosisFirstTry: 2, interventionFirstTry: 2, transferAttempts: 5, transferPasses: 1 }),
    },
  };

  const good = calculateSkillRadar(clean);
  const bad = calculateSkillRadar(sloppy);
  assert.ok(good.scores.bottleneck_diagnosis.hasEnoughData);
  assert.ok(good.scores.bottleneck_diagnosis.score > bad.scores.bottleneck_diagnosis.score);
  assert.ok(good.scores.pattern_selection.score > bad.scores.pattern_selection.score);
  assert.ok(good.scores.capacity_estimation.score >= 45, "three strong estimates already read as a solid start");
  assert.ok(good.scores.bottleneck_diagnosis.score < 100, "small samples are shrunk, never an instant 100");
  assert.equal(good.growthArea, "tradeoff_defense", "the first unmeasured axis is the growth area");
});

test("Multi-path scenarios accept either archetype's component set", () => {
  const base = getBuilderScenarioById("boss-cache");
  assert.ok(base);
  const scenario: BuilderScenario = {
    ...base,
    requiredComponents: ["load_balancer", "database", "cache"],
    acceptedArchetypes: [
      {
        id: "arch-read-opt",
        name: "Path A: cache in front of the database",
        description: "Absorb repeat reads in memory.",
        requiredComponents: ["load_balancer", "server", "cache", "database"],
        maxLatencyP99Ms: 50,
        maxMonthlyCostUsd: 5000,
        tradeoffSummary: "Fast reads; invalidation to manage.",
      },
      {
        id: "arch-replica-opt",
        name: "Path B: read replicas",
        description: "Spread reads across replicas.",
        requiredComponents: ["load_balancer", "server", "database", "replica"],
        forbiddenComponents: ["cache"],
        maxLatencyP99Ms: 80,
        maxMonthlyCostUsd: 5000,
        tradeoffSummary: "No cache to invalidate; replication lag instead.",
      },
    ],
  };

  const nodes = [
    { id: "users", data: { type: "client", label: "Users" } },
    { id: "lb", data: { type: "load_balancer", label: "LB" } },
    { id: "s1", data: { type: "server", label: "App 1" } },
    { id: "s2", data: { type: "server", label: "App 2" } },
    { id: "s3", data: { type: "server", label: "App 3" } },
    { id: "db", data: { type: "database", label: "Primary" } },
    { id: "r1", data: { type: "replica", label: "Replica 1" } },
    { id: "r2", data: { type: "replica", label: "Replica 2" } },
  ];
  const edges = [
    { source: "users", target: "lb" },
    { source: "lb", target: "s1" },
    { source: "lb", target: "s2" },
    { source: "lb", target: "s3" },
    { source: "s1", target: "db" },
    { source: "s2", target: "db" },
    { source: "s3", target: "db" },
    { source: "db", target: "r1" },
    { source: "db", target: "r2" },
  ];

  const replicaPath = evaluateScenario(nodes, edges, scenario);
  assert.ok(!replicaPath.failureReasons.includes("require-cache"), "the replica path does not need a cache");
  assert.equal(replicaPath.score.matchedArchetype?.id, "arch-replica-opt");

  const withoutPaths = evaluateScenario(nodes, edges, { ...scenario, acceptedArchetypes: undefined });
  assert.ok(withoutPaths.failureReasons.includes("require-cache"));
});

test("All 4 interview problems have scopeItems and estimationTargets", () => {
  assert.equal(INTERVIEW_PROBLEMS.length, 4);

  for (const problem of INTERVIEW_PROBLEMS) {
    // 1. Scope items verification
    assert.ok(problem.scopeItems, `${problem.id} is missing scopeItems`);
    assert.ok(problem.scopeItems.length >= 4, `${problem.id} should have at least 4 scope items`);
    const hasCore = problem.scopeItems.some((s) => s.isCore);
    const hasDistractor = problem.scopeItems.some((s) => !s.isCore);
    assert.ok(hasCore, `${problem.id} must have core scope items`);
    assert.ok(hasDistractor, `${problem.id} must have out-of-scope distractor items`);

    // 2. Estimation targets verification
    assert.ok(problem.estimationTargets, `${problem.id} is missing estimationTargets`);
    assert.ok(problem.estimationTargets.length >= 3, `${problem.id} should have at least 3 estimation targets`);
    for (const target of problem.estimationTargets) {
      assert.ok(target.canonicalAnswer > 0, `${target.id} must have positive canonical answer`);
      assert.ok(target.stepByStepDerivation.length > 0, `${target.id} must have derivations`);
      assert.ok(target.ruleOfThumbTip.length > 0, `${target.id} must have a rule of thumb tip`);
    }
  }
});

test("Pattern tradeoff sets exist with multi-attribute metrics and defense questions", () => {
  const cachingTradeoffs = PATTERN_TRADEOFFS["caching"];
  assert.ok(cachingTradeoffs);
  assert.ok(cachingTradeoffs.options.length >= 3);

  const recommended = cachingTradeoffs.options.find((o) => o.isRecommendedForConstraints);
  assert.ok(recommended);
  assert.ok(recommended.costEstimateDeltaUsd > 0);
  assert.ok(recommended.latencyProfileMs < 0);
  assert.ok(recommended.tradeoffDefenseQuestion.options.some((o) => o.isCorrect));
  assert.ok(recommended.stressTest10xQuestion.options.some((o) => o.isCorrect));
});
