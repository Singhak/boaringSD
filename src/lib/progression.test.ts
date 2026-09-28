import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_STATS,
  STATS_SCHEMA_VERSION,
  completeActivity,
  getCurrentStreak,
  getEvidence,
  getMasteryState,
  levelForXp,
  nextLevelXpForLevel,
  migrateStats,
  recordBuilderResult,
  recordDefense,
  recordEstimate,
  recordFixApplied,
  recordPatternRun,
  recordReasoning,
  recordPractice,
  recordReview,
  recordRunStarted,
  selectNextAction,
} from "./progression";
import { getPatternById } from "../data/patterns";
import { getBuilderScenarioById } from "../data/builderScenarios";
import type { PatternRunResult, SystemDesignPattern, UserStats } from "../types";

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 8, 1, 10, 0, 0); // local time, avoids UTC date-key edge cases
const at = (days: number) => new Date(T0.getTime() + days * DAY);

function pattern(id: string): SystemDesignPattern {
  const p = getPatternById(id);
  assert.ok(p);
  return p;
}

const cleanRun = (patternId: SystemDesignPattern["id"]): PatternRunResult => ({
  patternId,
  diagnosisFirstTry: true,
  interventionFirstTry: true,
  transferFirstTry: true,
  hintsUsed: 0,
  failureReasons: [],
});

function onboarded(): UserStats {
  return { ...DEFAULT_STATS, completedMissions: ["mission-1", "mission-2"] };
}

// ---------------------------------------------------------------------------
// XP idempotency
// ---------------------------------------------------------------------------

test("first clear pays full XP once; same-day replays pay replay XP once", () => {
  const p = pattern("horizontal-scaling");
  const first = recordPatternRun(onboarded(), p, cleanRun(p.id), T0);
  assert.equal(first.firstClear, true);
  assert.equal(first.xpAwarded, p.rewards.firstClearXp + 25); // clean-run bonus

  const replay = recordPatternRun(first.stats, p, cleanRun(p.id), T0);
  assert.equal(replay.firstClear, false);
  assert.equal(replay.xpAwarded, p.rewards.replayXp);

  const duplicate = recordPatternRun(replay.stats, p, cleanRun(p.id), T0);
  assert.equal(duplicate.xpAwarded, 0);
  assert.equal(duplicate.stats.currentXp, replay.stats.currentXp);
  assert.equal(getEvidence(duplicate.stats, p.id).runsCleared, 2, "duplicate callback does not add evidence");

  const tomorrow = recordPatternRun(duplicate.stats, p, cleanRun(p.id), at(1));
  assert.equal(tomorrow.xpAwarded, p.rewards.replayXp);
});

test("hint usage removes the clean-run bonus", () => {
  const p = pattern("horizontal-scaling");
  const out = recordPatternRun(onboarded(), p, { ...cleanRun(p.id), hintsUsed: 1 }, T0);
  assert.equal(out.xpAwarded, p.rewards.firstClearXp);
});

test("completing a generic activity twice does not re-award first-clear XP", () => {
  const spec = { collection: "completedChallenges" as const, id: "c1", firstXp: 60, replayXp: 20 };
  const a = completeActivity(DEFAULT_STATS, spec, T0);
  const b = completeActivity(a.stats, spec, T0);
  const c = completeActivity(b.stats, spec, T0);
  assert.equal(a.xpAwarded, 60);
  assert.equal(b.xpAwarded, 20);
  assert.equal(c.xpAwarded, 0);
  assert.deepEqual(c.stats.completedChallenges, ["c1"]);
});

test("level-up is detected when XP crosses a level boundary", () => {
  const p = pattern("async-queues"); // 250 XP first clear
  const out = recordPatternRun(onboarded(), p, cleanRun(p.id), T0);
  assert.equal(out.leveledUp, true);
  assert.equal(out.stats.level, 2);
});

test("builder failures record evidence but award nothing", () => {
  const s = getBuilderScenarioById("boss-scale");
  assert.ok(s);
  const fail = recordBuilderResult(onboarded(), s, 60, false, ["server-cpu"], T0);
  assert.equal(fail.xpAwarded, 0);
  assert.equal(getEvidence(fail.stats, s.patternId).builderAttempts, 1);
  assert.deepEqual(getEvidence(fail.stats, s.patternId).failureReasons, ["server-cpu"]);

  const pass = recordBuilderResult(fail.stats, s, 60, true, [], T0);
  assert.equal(pass.xpAwarded, 60);
  const again = recordBuilderResult(pass.stats, s, 60, true, [], T0);
  assert.equal(again.xpAwarded, 12);
});

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

test("streak increments on consecutive days, holds within a day, resets after a gap", () => {
  let s = recordPractice(DEFAULT_STATS, T0);
  assert.equal(s.streakDays, 1);
  s = recordPractice(s, at(0));
  assert.equal(s.streakDays, 1);
  s = recordPractice(s, at(1));
  assert.equal(s.streakDays, 2);
  assert.equal(getCurrentStreak(s, at(2)), 2, "still alive the next day");
  assert.equal(getCurrentStreak(s, at(3)), 0, "broken after a missed day");
  s = recordPractice(s, at(3));
  assert.equal(s.streakDays, 1);
});

// ---------------------------------------------------------------------------
// Mastery transitions
// ---------------------------------------------------------------------------

test("mastery moves unseen → introduced → applied once → passed transfer → needs review → reliable", () => {
  const p = pattern("horizontal-scaling");
  const scenario = getBuilderScenarioById(p.builderScenarioId);
  assert.ok(scenario);
  let s = onboarded();
  assert.equal(getMasteryState(getEvidence(s, p.id), T0), "unseen");

  s = recordRunStarted(s, p.id, T0);
  assert.equal(getMasteryState(getEvidence(s, p.id), T0), "introduced");

  s = recordFixApplied(s, p.id, T0);
  assert.equal(getMasteryState(getEvidence(s, p.id), T0), "applied_once");

  s = recordPatternRun(s, p, cleanRun(p.id), T0).stats;
  assert.equal(getMasteryState(getEvidence(s, p.id), T0), "passed_transfer");

  s = recordBuilderResult(s, scenario, 60, true, [], T0).stats;
  assert.equal(getMasteryState(getEvidence(s, p.id), T0), "passed_transfer", "no reliable without later recall");

  assert.equal(getMasteryState(getEvidence(s, p.id), at(1)), "needs_review");

  s = recordReview(s, p, true, at(1)).stats;
  assert.equal(getMasteryState(getEvidence(s, p.id), at(1)), "passed_transfer", "no reliable without defending the call");

  // A self-assessed 100 is not evidence at all; a graded 70 clears the bar.
  s = recordReasoning(s, `${p.id}-why`, { score: 100, selfAssessed: true, patternId: p.id }, 30, at(1)).stats;
  assert.equal(getMasteryState(getEvidence(s, p.id), at(1)), "passed_transfer");
  s = recordReasoning(s, `${p.id}-10x`, { score: 70, selfAssessed: false, patternId: p.id }, 30, at(1)).stats;
  assert.equal(getMasteryState(getEvidence(s, p.id), at(1)), "reliable");
});

test("early reviews do not count; failed reviews step back and stay due", () => {
  const p = pattern("caching");
  let s = recordPatternRun(onboarded(), p, cleanRun(p.id), T0).stats;

  const early = recordReview(s, p, true, T0);
  assert.equal(early.early, true);
  assert.equal(getEvidence(early.stats, p.id).reviewsPassed, 0);

  const failed = recordReview(s, p, false, at(1));
  s = failed.stats;
  assert.equal(getEvidence(s, p.id).reviewsFailed, 1);
  assert.equal(getMasteryState(getEvidence(s, p.id), at(1)), "needs_review");

  s = recordReview(s, p, true, at(1)).stats;
  const e = getEvidence(s, p.id);
  assert.equal(e.reviewStage, 1);
  assert.equal(Math.round((Date.parse(e.reviewDueAt!) - at(1).getTime()) / DAY), 3, "next review in 3 days");
});

// ---------------------------------------------------------------------------
// Next action
// ---------------------------------------------------------------------------

test("next action: onboarding first", () => {
  assert.equal(selectNextAction(DEFAULT_STATS, T0).kind, "onboarding");
});

test("next action: first pattern run after onboarding, then its builder boss, then the next run", () => {
  let s = onboarded();
  const a1 = selectNextAction(s, T0);
  assert.equal(a1.kind, "pattern-run");
  assert.equal(a1.patternId, "horizontal-scaling");

  const p1 = pattern("horizontal-scaling");
  s = recordPatternRun(s, p1, cleanRun(p1.id), T0).stats;
  const a2 = selectNextAction(s, T0);
  assert.equal(a2.kind, "builder-boss");
  assert.equal(a2.href, "/builder?scenario=boss-scale");

  s = recordBuilderResult(s, getBuilderScenarioById("boss-scale")!, 60, true, [], T0).stats;
  const a3 = selectNextAction(s, T0);
  assert.equal(a3.kind, "pattern-run");
  assert.equal(a3.patternId, "load-balancing");
});

test("next action: a due review outranks new content; an unfinished run outranks both", () => {
  const p1 = pattern("horizontal-scaling");
  let s = recordPatternRun(onboarded(), p1, cleanRun(p1.id), T0).stats;
  s = recordBuilderResult(s, getBuilderScenarioById("boss-scale")!, 60, true, [], T0).stats;

  const review = selectNextAction(s, at(1));
  assert.equal(review.kind, "review");
  assert.match(review.href, /mode=review/);

  const resume = selectNextAction(s, at(1), {
    "chapter-2": {
      chapterId: "chapter-2",
      stage: "counter",
      diagnosisAttempts: 1,
      interventionAttempts: 1,
      counterAttempts: 0,
      transferAttempts: 0,
      hintsUsed: 0,
      failureReasons: [],
      updatedAt: at(1).toISOString(),
    },
  });
  assert.equal(resume.kind, "resume");
});

test("locked patterns are never suggested", () => {
  const s = onboarded();
  const action = selectNextAction(s, T0, {
    "chapter-4": {
      chapterId: "chapter-4",
      stage: "diagnose",
      diagnosisAttempts: 1,
      interventionAttempts: 0,
      counterAttempts: 0,
      transferAttempts: 0,
      hintsUsed: 0,
      failureReasons: [],
      updatedAt: T0.toISOString(),
    },
  });
  assert.equal(action.kind, "pattern-run");
  assert.equal(action.patternId, "horizontal-scaling");
});

test("next action: suggests tier final mock interview after completing tier and its boss", () => {
  let s = onboarded();
  const tier1Patterns = ["horizontal-scaling", "load-balancing", "read-replicas", "caching", "cdn-edge"] as const;
  for (const id of tier1Patterns) {
    const p = pattern(id);
    s = recordPatternRun(s, p, cleanRun(p.id), T0).stats;
    const bossScenario = getBuilderScenarioById(p.builderScenarioId)!;
    s = recordBuilderResult(s, bossScenario, 100, true, [], T0).stats;
  }
  const action = selectNextAction(s, T0);
  assert.equal(action.kind, "interview");
  assert.equal(action.href, "/interview?problem=interview-url-shortener");
  assert.match(action.title, /Tier 1: Foundation/);
});

test("next action: suggests estimation gym when capacity estimation skill is weak on radar", () => {
  let s = onboarded();
  const first3 = ["horizontal-scaling", "load-balancing", "read-replicas"] as const;
  for (const id of first3) {
    const p = pattern(id);
    s = recordPatternRun(s, p, cleanRun(p.id), T0).stats;
    const bossScenario = getBuilderScenarioById(p.builderScenarioId)!;
    s = recordBuilderResult(s, bossScenario, 100, true, [], T0).stats;
  }
  s = recordEstimate(s, "math-1", 10, T0).stats;
  s = recordEstimate(s, "math-2", 15, T0).stats;
  s = recordEstimate(s, "math-3", 20, T0).stats;

  const action = selectNextAction(s, T0);
  assert.equal(action.kind, "estimation");
  assert.equal(action.href, "/math");
  assert.match(action.title, /Estimation Gym/);
});

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

test("v1 stats migrate: cleared chapters become cleared runs and are not re-rewarded", () => {
  const v1 = {
    level: 3,
    currentXp: 320,
    nextLevelXp: 450,
    streakDays: 1,
    completedLessons: ["cache"],
    completedChallenges: [],
    completedMissions: ["mission-1", "mission-2"],
    completedChapters: ["chapter-1", "chapter-2"],
    totalScore: 320,
    soundEnabled: false,
    unlockedBadges: ["cache_master"],
  };
  const s = migrateStats(v1, T0);
  assert.equal(s.schemaVersion, STATS_SCHEMA_VERSION);
  assert.equal(s.soundEnabled, false);
  assert.equal(s.streakDays, 0, "untracked v1 streak is not trusted");
  assert.equal(getEvidence(s, "horizontal-scaling").runsCleared, 1);
  assert.equal(getEvidence(s, "load-balancing").transferPasses, 1);
  assert.equal(getEvidence(s, "read-replicas").runsCleared, 0);

  const replay = recordPatternRun(s, pattern("horizontal-scaling"), cleanRun("horizontal-scaling"), T0);
  assert.equal(replay.firstClear, false);
  const lesson = completeActivity(s, { collection: "completedLessons", id: "cache", firstXp: 100, replayXp: 20 }, T0);
  assert.equal(lesson.xpAwarded, 20);
});

test("migration tolerates garbage and is stable for v2 data", () => {
  assert.deepEqual(migrateStats(null, T0).completedChapters, []);
  assert.equal(migrateStats({ currentXp: "lots", completedLessons: "x" }, T0).currentXp, 0);

  const once = migrateStats({ completedChapters: ["chapter-1"] }, T0);
  const twice = migrateStats(once, at(5));
  assert.deepEqual(twice.patternProgress, once.patternProgress);
});

test("v2 stats upgrade to v3: progress kept, mock account fields dropped, result collections added", () => {
  const v2 = {
    ...DEFAULT_STATS,
    schemaVersion: 2,
    currentXp: 400,
    isLoggedIn: true,
    userEmail: "someone@example.com",
    userName: "Someone",
    completedChapters: ["chapter-1"],
    patternProgress: { "horizontal-scaling": { ...getEvidence(DEFAULT_STATS, "horizontal-scaling"), runsCleared: 2 } },
  };
  const s = migrateStats(v2, T0);
  assert.equal(s.schemaVersion, 3);
  assert.equal(s.currentXp, 400);
  assert.equal(getEvidence(s, "horizontal-scaling").runsCleared, 2);
  assert.equal(s.isLoggedIn, undefined);
  assert.equal(s.userEmail, undefined);
  assert.deepEqual(s.estimationResults, {});
  assert.deepEqual(s.defenseStats, { attempts: 0, firstTry: 0 });
});

// ---------------------------------------------------------------------------
// Honest evidence
// ---------------------------------------------------------------------------

test("transfer evidence only counts a first-try pass, and a run without a transfer question adds none", () => {
  const p = pattern("horizontal-scaling");
  const noTransfer = recordPatternRun(onboarded(), p, { ...cleanRun(p.id), transferFirstTry: null }, T0).stats;
  assert.equal(getEvidence(noTransfer, p.id).transferAttempts, 0);
  assert.equal(getEvidence(noTransfer, p.id).transferPasses, 0);

  const missed = recordPatternRun(onboarded(), p, { ...cleanRun(p.id), transferFirstTry: false }, T0).stats;
  assert.equal(getEvidence(missed, p.id).transferAttempts, 1);
  assert.equal(getEvidence(missed, p.id).transferPasses, 0);

  const passed = recordPatternRun(onboarded(), p, cleanRun(p.id), T0).stats;
  assert.equal(getEvidence(passed, p.id).transferPasses, 1);
});

test("estimates: every attempt is evidence, XP only for a pass and only once per day", () => {
  const miss = recordEstimate(DEFAULT_STATS, "math-dau-qps-1", 50, T0);
  assert.equal(miss.xpAwarded, 0);
  assert.deepEqual(miss.stats.estimationResults?.["math-dau-qps-1"], { best: 50, last: 50, attempts: 1 });

  const pass = recordEstimate(miss.stats, "math-dau-qps-1", 100, T0);
  assert.equal(pass.xpAwarded, 20);
  assert.equal(pass.stats.estimationResults?.["math-dau-qps-1"]?.best, 100);

  const replay = recordEstimate(pass.stats, "math-dau-qps-1", 100, T0);
  assert.equal(replay.xpAwarded, 5, "a same-day replay pays the small replay bonus once");
  const farm = recordEstimate(replay.stats, "math-dau-qps-1", 100, T0);
  assert.equal(farm.xpAwarded, 0, "further resubmits the same day pay nothing");
  assert.equal(farm.stats.level, farm.stats.currentXp >= 150 ? 2 : 1, "XP goes through grantXp so level stays in sync");
});

test("defense and reasoning results are recorded; a self-assessment never overwrites a graded answer", () => {
  const d = recordDefense(recordDefense(DEFAULT_STATS, true), false);
  assert.deepEqual(d.defenseStats, { attempts: 2, firstTry: 1 });

  const graded = recordReasoning(DEFAULT_STATS, "caching-why", { score: 70, selfAssessed: false }, 30, T0);
  assert.equal(graded.xpAwarded, 30);
  const self = recordReasoning(graded.stats, "caching-why", { score: 90, selfAssessed: true }, 30, T0);
  assert.equal(self.stats.reasoningResults?.["caching-why"]?.selfAssessed, false);
  assert.equal(self.xpAwarded, 0, "bonus is paid once per prompt");
});

test("a self-assessed reply pays at most half the bonus and never counts toward Reliable", () => {
  const p = pattern("caching");
  const self = recordReasoning(DEFAULT_STATS, "caching-why", { score: 100, selfAssessed: true, patternId: p.id }, 30, T0);
  assert.equal(self.xpAwarded, 15);
  assert.equal(getEvidence(self.stats, p.id).reasoningBest ?? 0, 0, "self-graded replies are not evidence");
  const again = recordReasoning(self.stats, "caching-why", { score: 100, selfAssessed: true, patternId: p.id }, 30, T0);
  assert.equal(again.xpAwarded, 0);
  // A later graded answer tops the bonus up to the full amount, never more.
  const graded = recordReasoning(self.stats, "caching-why", { score: 80, selfAssessed: false, patternId: p.id }, 30, T0);
  assert.equal(graded.xpAwarded, 15);
  assert.equal(getEvidence(graded.stats, p.id).reasoningBest, 80);
});

test("builder: hints are recorded, and only a first-try explanation counts as a builder pass", () => {
  const s = getBuilderScenarioById("boss-scale");
  assert.ok(s);
  const retried = recordBuilderResult(onboarded(), s, 60, true, [], T0, { hintsUsed: 2, explainFirstTry: false });
  const e = getEvidence(retried.stats, s.patternId);
  assert.equal(e.hintsUsed, 2);
  assert.equal(e.builderPasses, 0);
  assert.ok(e.scenariosPassed.includes(s.id), "the scenario still reads as cleared");
  const clean = recordBuilderResult(onboarded(), s, 60, true, [], T0, { explainFirstTry: true });
  assert.equal(getEvidence(clean.stats, s.patternId).builderPasses, 1);
});

test("XP levels grow progressively (150, 300, 500, 750...)", () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(149), 1);
  assert.equal(levelForXp(150), 2);
  assert.equal(levelForXp(299), 2);
  assert.equal(levelForXp(300), 3);
  assert.equal(levelForXp(499), 3);
  assert.equal(levelForXp(500), 4);
  assert.equal(levelForXp(749), 4);
  assert.equal(levelForXp(750), 5);
  assert.equal(nextLevelXpForLevel(1), 150);
  assert.equal(nextLevelXpForLevel(2), 300);
  assert.equal(nextLevelXpForLevel(3), 500);
  assert.equal(nextLevelXpForLevel(4), 750);
});

test("Streak counts only passed actions: failed estimate or clicking a lesson does not advance streak", () => {
  // Failed estimate does not increment streak
  const failedEst = recordEstimate(DEFAULT_STATS, "math-dau-qps-1", 40, T0);
  assert.equal(failedEst.stats.streakDays, 0);
  assert.equal(failedEst.stats.lastPracticeDate, undefined);

  // Lesson complete does not increment streak
  const lessonOutcome = completeActivity(DEFAULT_STATS, {
    collection: "completedLessons",
    id: "lesson-lb-1",
    firstXp: 0,
    replayXp: 0,
  }, T0);
  assert.equal(lessonOutcome.stats.streakDays, 0);

  // Passed estimate (>= 85) DOES increment streak
  const passedEst = recordEstimate(DEFAULT_STATS, "math-dau-qps-1", 95, T0);
  assert.equal(passedEst.stats.streakDays, 1);
});

test("Side-mode daily XP cap limits maximum XP earned per mode per day", () => {
  // Daily cap for estimates is 60 XP
  let s = DEFAULT_STATS;
  let totalAwarded = 0;
  for (let i = 0; i < 5; i++) {
    const res = recordEstimate(s, `prob-${i}`, 100, T0); // 20 XP each
    s = res.stats;
    totalAwarded += res.xpAwarded;
  }
  assert.equal(totalAwarded, 60, "Estimates capped at 60 XP per day");
});

