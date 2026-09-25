// Pure progression rules. No browser APIs here: storage.ts loads/saves, this
// module decides what a completion is worth, so it can be unit tested.

import { getAllPatterns, getPatternByChapterId } from "@/data/patterns";
import type {
  BuilderScenario,
  MasteryState,
  PatternEvidence,
  PatternId,
  PatternRunResult,
  RunProgress,
  RunStage,
  SystemDesignPattern,
  UserStats,
} from "@/types";

export const STATS_SCHEMA_VERSION = 2;
export const XP_PER_LEVEL = 150;
const REVIEW_INTERVAL_DAYS = [1, 3, 7, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_STATS: UserStats = {
  level: 1,
  currentXp: 0,
  nextLevelXp: XP_PER_LEVEL,
  streakDays: 0,
  completedLessons: [],
  completedChallenges: [],
  completedGuided: [],
  completedInterviews: [],
  completedMissions: [],
  completedChapters: [],
  systemsSaved: 0,
  incidentsSolved: 0,
  isLoggedIn: false,
  userEmail: null,
  userName: null,
  totalScore: 0,
  soundEnabled: true,
  unlockedBadges: [],
  schemaVersion: STATS_SCHEMA_VERSION,
  patternProgress: {},
  awardedEvents: [],
  practiceDays: [],
};

export interface ProgressionOutcome {
  stats: UserStats;
  xpAwarded: number;
  leveledUp: boolean;
  firstClear: boolean;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Local calendar day, YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// ---------------------------------------------------------------------------
// XP and levels
// ---------------------------------------------------------------------------

export function levelForXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function grantXp(stats: UserStats, amount: number): { stats: UserStats; leveledUp: boolean } {
  if (amount <= 0) return { stats, leveledUp: false };
  const currentXp = stats.currentXp + amount;
  const level = levelForXp(currentXp);
  return {
    stats: {
      ...stats,
      currentXp,
      level,
      nextLevelXp: level * XP_PER_LEVEL,
      totalScore: stats.totalScore + amount,
    },
    leveledUp: level > stats.level,
  };
}

/** Records an idempotency key. Returns awarded=false if the key was already used. */
export function claimEvent(stats: UserStats, key: string): { stats: UserStats; awarded: boolean } {
  const events = stats.awardedEvents ?? [];
  if (events.includes(key)) return { stats, awarded: false };
  return { stats: { ...stats, awardedEvents: [...events, key] }, awarded: true };
}

/**
 * First clear pays full XP exactly once; replays pay a small amount at most once
 * per day, so refreshes and duplicate callbacks cannot farm rewards.
 */
function awardFirstOrReplay(
  stats: UserStats,
  eventBase: string,
  firstXp: number,
  replayXp: number,
  now: Date
): { stats: UserStats; xp: number; firstClear: boolean } {
  const first = claimEvent(stats, `${eventBase}:first`);
  if (first.awarded) return { stats: first.stats, xp: firstXp, firstClear: true };

  const today = toDateKey(now);
  const replayKey = `${eventBase}:replay:${today}`;
  // Drop older replay keys for this item so the list stays small.
  const pruned: UserStats = {
    ...stats,
    awardedEvents: (stats.awardedEvents ?? []).filter(
      (k) => !(k.startsWith(`${eventBase}:replay:`) && k !== replayKey)
    ),
  };
  const replay = claimEvent(pruned, replayKey);
  return { stats: replay.stats, xp: replay.awarded ? replayXp : 0, firstClear: false };
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

/** Call on meaningful practice only (a solved run, builder pass, or review). */
export function recordPractice(stats: UserStats, now: Date): UserStats {
  const today = toDateKey(now);
  if (stats.lastPracticeDate === today) return stats;
  const yesterday = toDateKey(addDays(now, -1));
  const streakDays = stats.lastPracticeDate === yesterday ? stats.streakDays + 1 : 1;
  const practiceDays = [...(stats.practiceDays ?? []).filter((d) => d !== today), today].slice(-60);
  return { ...stats, streakDays, lastPracticeDate: today, practiceDays };
}

/** Streak as the learner should see it: broken streaks read as 0. */
export function getCurrentStreak(stats: UserStats, now: Date): number {
  if (!stats.lastPracticeDate) return 0;
  const today = toDateKey(now);
  const yesterday = toDateKey(addDays(now, -1));
  return stats.lastPracticeDate === today || stats.lastPracticeDate === yesterday ? stats.streakDays : 0;
}

export function practicedToday(stats: UserStats, now: Date): boolean {
  return stats.lastPracticeDate === toDateKey(now);
}

// ---------------------------------------------------------------------------
// Generic activity completion (lessons, challenges, guided, interviews, missions)
// ---------------------------------------------------------------------------

export type ActivityCollection =
  | "completedLessons"
  | "completedChallenges"
  | "completedGuided"
  | "completedInterviews"
  | "completedMissions";

export interface ActivitySpec {
  collection: ActivityCollection;
  id: string;
  firstXp: number;
  replayXp: number;
  badges?: string[];
  onFirstClear?: (stats: UserStats) => UserStats;
}

export function completeActivity(stats: UserStats, spec: ActivitySpec, now: Date): ProgressionOutcome {
  const list = stats[spec.collection] ?? [];
  let next: UserStats = list.includes(spec.id) ? stats : { ...stats, [spec.collection]: [...list, spec.id] };

  const award = awardFirstOrReplay(next, `${spec.collection}:${spec.id}`, spec.firstXp, spec.replayXp, now);
  next = award.stats;
  if (award.firstClear && spec.onFirstClear) next = spec.onFirstClear(next);

  const badges = new Set(next.unlockedBadges);
  (spec.badges ?? []).forEach((b) => badges.add(b));
  next = { ...next, unlockedBadges: [...badges] };

  next = recordPractice(next, now);
  const granted = grantXp(next, award.xp);
  return { stats: granted.stats, xpAwarded: award.xp, leveledUp: granted.leveledUp, firstClear: award.firstClear };
}

// ---------------------------------------------------------------------------
// Pattern evidence and mastery
// ---------------------------------------------------------------------------

export function emptyEvidence(): PatternEvidence {
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
  };
}

export function getEvidence(stats: UserStats, patternId: PatternId): PatternEvidence {
  return { ...emptyEvidence(), ...(stats.patternProgress?.[patternId] ?? {}) };
}

function withEvidence(stats: UserStats, patternId: PatternId, evidence: PatternEvidence): UserStats {
  return { ...stats, patternProgress: { ...(stats.patternProgress ?? {}), [patternId]: evidence } };
}

function addFailureReasons(existing: string[], reasons: string[]): string[] {
  return [...existing, ...reasons].slice(-12);
}

export const MASTERY_ORDER: MasteryState[] = [
  "unseen",
  "introduced",
  "applied_once",
  "passed_transfer",
  "needs_review",
  "reliable",
];

export const MASTERY_LABELS: Record<MasteryState, string> = {
  unseen: "Unseen",
  introduced: "Introduced",
  applied_once: "Applied once",
  passed_transfer: "Passed transfer",
  reliable: "Reliable",
  needs_review: "Needs review",
};

export function getMasteryState(evidence: PatternEvidence | undefined, now: Date): MasteryState {
  if (!evidence) return "unseen";
  const touched = evidence.runsStarted + evidence.applied + evidence.runsCleared + evidence.builderAttempts;
  if (touched === 0) return "unseen";
  if (evidence.applied === 0 && evidence.runsCleared === 0) return "introduced";
  if (evidence.transferPasses === 0) return "applied_once";

  const reviewOverdue = evidence.reviewDueAt !== undefined && now.getTime() >= Date.parse(evidence.reviewDueAt);
  if (reviewOverdue) return "needs_review";

  // Reliable = succeeded in a run, a transfer question, a builder scenario, and a later recall.
  if (evidence.builderPasses > 0 && evidence.reviewsPassed > 0) return "reliable";
  return "passed_transfer";
}

/** The three pieces of evidence a pattern needs beyond the run itself. */
export function getEvidenceChecklist(evidence: PatternEvidence) {
  return [
    { id: "transfer", label: "Transfer question", done: evidence.transferPasses > 0 },
    { id: "builder", label: "Builder scenario", done: evidence.builderPasses > 0 },
    { id: "review", label: "Later recall", done: evidence.reviewsPassed > 0 },
  ];
}

/** Honest one-line summary, e.g. "Passed 2 of 3 checks · review due in 2 days". */
export function describeEvidence(evidence: PatternEvidence, now: Date): string {
  const state = getMasteryState(evidence, now);
  if (state === "unseen") return "Not started";
  if (state === "introduced") return "Started a run; fix not deployed yet";
  const checklist = getEvidenceChecklist(evidence);
  const done = checklist.filter((c) => c.done).length;
  let text = `Passed ${done} of ${checklist.length} checks`;
  if (evidence.reviewDueAt) {
    const days = Math.ceil((Date.parse(evidence.reviewDueAt) - now.getTime()) / DAY_MS);
    text += days <= 0 ? " · review due now" : ` · review in ${days} day${days === 1 ? "" : "s"}`;
  }
  return text;
}

/** Suggests the one weakness to practice next for a pattern. */
export function getNextWeakness(evidence: PatternEvidence, now: Date): string | null {
  const state = getMasteryState(evidence, now);
  if (state === "unseen" || state === "introduced") return "Finish the run";
  if (state === "needs_review") return "Recall this pattern";
  if (evidence.transferPasses === 0) return "Pass the transfer question";
  if (evidence.builderPasses === 0) return "Pass the builder scenario";
  if (evidence.reviewsPassed === 0) return "Pass a later review";
  return null;
}

export function isPatternCleared(stats: UserStats, pattern: SystemDesignPattern): boolean {
  return getEvidence(stats, pattern.id).runsCleared > 0;
}

export function isPatternUnlocked(stats: UserStats, pattern: SystemDesignPattern): boolean {
  const patterns = getAllPatterns();
  return pattern.prerequisites.every((pre) => {
    const p = patterns.find((x) => x.id === pre);
    return p ? isPatternCleared(stats, p) : true;
  });
}

// ---------------------------------------------------------------------------
// Pattern run events
// ---------------------------------------------------------------------------

export function recordRunStarted(stats: UserStats, patternId: PatternId, now: Date): UserStats {
  const e = getEvidence(stats, patternId);
  return withEvidence(stats, patternId, { ...e, runsStarted: e.runsStarted + 1, lastPracticedAt: now.toISOString() });
}

export function recordFixApplied(stats: UserStats, patternId: PatternId, now: Date): UserStats {
  const e = getEvidence(stats, patternId);
  return withEvidence(stats, patternId, { ...e, applied: e.applied + 1, lastPracticedAt: now.toISOString() });
}

export function recordTransferMiss(stats: UserStats, patternId: PatternId): UserStats {
  const e = getEvidence(stats, patternId);
  return withEvidence(stats, patternId, {
    ...e,
    transferAttempts: e.transferAttempts + 1,
    failureReasons: addFailureReasons(e.failureReasons, ["transfer"]),
  });
}

/**
 * Completes a run. Only call after diagnosis, fix, counter-strike, and transfer
 * all succeeded. Safe to call twice: the first-clear reward is keyed per pattern.
 */
export function recordPatternRun(
  stats: UserStats,
  pattern: SystemDesignPattern,
  result: PatternRunResult,
  now: Date
): ProgressionOutcome {
  const e = getEvidence(stats, pattern.id);
  const award = awardFirstOrReplay(
    stats,
    `pattern-run:${pattern.id}`,
    pattern.rewards.firstClearXp,
    pattern.rewards.replayXp,
    now
  );
  let next = award.stats;

  // A duplicate callback on the same day must not double-count evidence either.
  const countsAsNewRun = award.xp > 0 || award.firstClear;
  if (countsAsNewRun) {
    const cleanRun = result.hintsUsed === 0 && result.diagnosisFirstTry && result.interventionFirstTry;
    const updated: PatternEvidence = {
      ...e,
      runsCleared: e.runsCleared + 1,
      diagnosisFirstTry: e.diagnosisFirstTry + (result.diagnosisFirstTry ? 1 : 0),
      interventionFirstTry: e.interventionFirstTry + (result.interventionFirstTry ? 1 : 0),
      transferAttempts: e.transferAttempts + 1,
      transferPasses: e.transferPasses + 1,
      hintsUsed: e.hintsUsed + result.hintsUsed,
      failureReasons: addFailureReasons(e.failureReasons, result.failureReasons),
      firstClearedAt: e.firstClearedAt ?? now.toISOString(),
      lastPracticedAt: now.toISOString(),
      reviewDueAt: e.reviewDueAt ?? addDays(now, REVIEW_INTERVAL_DAYS[0]).toISOString(),
    };
    next = withEvidence(next, pattern.id, updated);
    if (award.firstClear && cleanRun) {
      // Small bonus for solving without hints on the first try.
      award.xp += 25;
    }
  }

  const chapters = next.completedChapters ?? [];
  if (!chapters.includes(pattern.chapterId)) {
    next = { ...next, completedChapters: [...chapters, pattern.chapterId] };
  }

  next = recordPractice(next, now);
  const granted = grantXp(next, award.xp);
  return { stats: granted.stats, xpAwarded: award.xp, leveledUp: granted.leveledUp, firstClear: award.firstClear };
}

/** Records a builder submission. Rewards only on pass; failures are kept as evidence. */
export function recordBuilderResult(
  stats: UserStats,
  scenario: BuilderScenario,
  rewardXp: number,
  passed: boolean,
  failureReasons: string[],
  now: Date
): ProgressionOutcome {
  const e = getEvidence(stats, scenario.patternId);
  let next = withEvidence(stats, scenario.patternId, {
    ...e,
    builderAttempts: e.builderAttempts + 1,
    builderPasses: e.builderPasses + (passed ? 1 : 0),
    scenariosPassed:
      passed && !e.scenariosPassed.includes(scenario.id) ? [...e.scenariosPassed, scenario.id] : e.scenariosPassed,
    failureReasons: passed ? e.failureReasons : addFailureReasons(e.failureReasons, failureReasons),
    lastPracticedAt: now.toISOString(),
  });

  if (!passed) return { stats: next, xpAwarded: 0, leveledUp: false, firstClear: false };

  const award = awardFirstOrReplay(next, `builder:${scenario.id}`, rewardXp, Math.round(rewardXp * 0.2), now);
  next = recordPractice(award.stats, now);
  const granted = grantXp(next, award.xp);
  return { stats: granted.stats, xpAwarded: award.xp, leveledUp: granted.leveledUp, firstClear: award.firstClear };
}

export function isReviewDue(evidence: PatternEvidence, now: Date): boolean {
  return evidence.reviewDueAt !== undefined && now.getTime() >= Date.parse(evidence.reviewDueAt);
}

/**
 * Spaced review at 1, 3, 7 (then 30) days. Early reviews are allowed as practice
 * but do not advance the schedule or count as recall.
 */
export function recordReview(
  stats: UserStats,
  pattern: SystemDesignPattern,
  passed: boolean,
  now: Date
): ProgressionOutcome & { early: boolean } {
  const e = getEvidence(stats, pattern.id);
  const due = isReviewDue(e, now);
  if (!due) {
    return { stats, xpAwarded: 0, leveledUp: false, firstClear: false, early: true };
  }

  if (!passed) {
    const updated: PatternEvidence = {
      ...e,
      reviewsFailed: e.reviewsFailed + 1,
      reviewStage: Math.max(0, e.reviewStage - 1),
      reviewDueAt: now.toISOString(), // step back: practice again now
      failureReasons: addFailureReasons(e.failureReasons, ["review"]),
      lastPracticedAt: now.toISOString(),
    };
    return { stats: withEvidence(stats, pattern.id, updated), xpAwarded: 0, leveledUp: false, firstClear: false, early: false };
  }

  const stage = Math.min(REVIEW_INTERVAL_DAYS.length - 1, e.reviewStage + 1);
  const updated: PatternEvidence = {
    ...e,
    reviewsPassed: e.reviewsPassed + 1,
    reviewStage: stage,
    reviewDueAt: addDays(now, REVIEW_INTERVAL_DAYS[stage]).toISOString(),
    lastPracticedAt: now.toISOString(),
  };
  let next = withEvidence(stats, pattern.id, updated);
  const claim = claimEvent(next, `review:${pattern.id}:${toDateKey(now)}`);
  next = recordPractice(claim.stats, now);
  const xp = claim.awarded ? pattern.rewards.reviewXp : 0;
  const granted = grantXp(next, xp);
  return { stats: granted.stats, xpAwarded: xp, leveledUp: granted.leveledUp, firstClear: false, early: false };
}

// ---------------------------------------------------------------------------
// Next action and daily objective
// ---------------------------------------------------------------------------

export type NextActionKind = "onboarding" | "resume" | "review" | "builder-boss" | "pattern-run" | "practice";

export interface NextAction {
  kind: NextActionKind;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  xpReward: number;
  patternId?: PatternId;
  badge: string;
}

export const STAGE_LABELS: Record<RunStage, string> = {
  observe: "Observe the incident",
  diagnose: "Diagnose the failure",
  choose: "Deploy a fix",
  counter: "Handle the tradeoff",
  transfer: "Apply it elsewhere",
  result: "Review the result",
};

export function hasFinishedOnboarding(stats: UserStats): boolean {
  const missions = stats.completedMissions ?? [];
  const solved = stats.incidentsSolved ?? 0;
  return (
    solved >= 2 ||
    (missions.includes("mission-1") && missions.includes("mission-2")) ||
    (missions.includes("hs-01") && missions.includes("lb-01"))
  );
}


export function selectNextAction(
  stats: UserStats,
  now: Date,
  runs: Record<string, RunProgress> = {},
  builderXpFor: (pattern: SystemDesignPattern) => number = (p) => p.rewards.builderXp
): NextAction {
  if (!hasFinishedOnboarding(stats)) {
    return {
      kind: "onboarding",
      title: "Incident 001: Twitter Feed Is Down",
      description: "Server CPU is at 98% under 100,000 req/s. Stabilize it to start your first level.",
      href: "/mission",
      ctaLabel: "Fix the incident",
      xpReward: 150,
      badge: "Tutorial incident",
    };
  }

  const patterns = getAllPatterns();

  const unfinished = Object.values(runs)
    .filter((r) => r.stage !== "observe" && r.stage !== "result")
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  for (const run of unfinished) {
    const pattern = getPatternByChapterId(run.chapterId);
    if (pattern && isPatternUnlocked(stats, pattern)) {
      return {
        kind: "resume",
        title: `Resume Level ${pattern.levelNumber}: ${pattern.title}`,
        description: `You stopped at "${STAGE_LABELS[run.stage]}". Your answers so far are saved.`,
        href: `/campaign/${pattern.chapterId}`,
        ctaLabel: "Resume run",
        xpReward: isPatternCleared(stats, pattern) ? pattern.rewards.replayXp : pattern.rewards.firstClearXp,
        patternId: pattern.id,
        badge: "Run in progress",
      };
    }
  }

  const due = patterns.find((p) => getMasteryState(getEvidence(stats, p.id), now) === "needs_review");
  if (due) {
    return {
      kind: "review",
      title: `Review: ${due.title}`,
      description: "Two quick questions to check you still remember when and why this pattern works.",
      href: `/campaign/${due.chapterId}?mode=review`,
      ctaLabel: "Start review",
      xpReward: due.rewards.reviewXp,
      patternId: due.id,
      badge: "Review due",
    };
  }

  // Prove the most recently cleared pattern in the builder before moving on.
  const clearedWithoutBoss = [...patterns]
    .reverse()
    .find((p) => isPatternCleared(stats, p) && getEvidence(stats, p.id).builderPasses === 0);
  const nextRun = patterns.find((p) => !isPatternCleared(stats, p) && isPatternUnlocked(stats, p));

  if (clearedWithoutBoss && (!nextRun || nextRun.levelNumber === clearedWithoutBoss.levelNumber + 1)) {
    return {
      kind: "builder-boss",
      title: `Builder Boss: ${clearedWithoutBoss.title}`,
      description: "Build the fix yourself, stress-test it, and submit the design.",
      href: `/builder?scenario=${clearedWithoutBoss.builderScenarioId}`,
      ctaLabel: "Start builder boss",
      xpReward: builderXpFor(clearedWithoutBoss),
      patternId: clearedWithoutBoss.id,
      badge: `Level ${clearedWithoutBoss.levelNumber} boss`,
    };
  }

  if (nextRun) {
    return {
      kind: "pattern-run",
      title: `Level ${nextRun.levelNumber}: ${nextRun.levelGoal}`,
      description: nextRun.newConstraint,
      href: `/campaign/${nextRun.chapterId}`,
      ctaLabel: `Start Level ${nextRun.levelNumber}`,
      xpReward: nextRun.rewards.firstClearXp,
      patternId: nextRun.id,
      badge: nextRun.title,
    };
  }

  // Everything cleared: practice the weakest pattern.
  const weakest = [...patterns].sort((a, b) => {
    const ea = getEvidence(stats, a.id);
    const eb = getEvidence(stats, b.id);
    const ra = MASTERY_ORDER.indexOf(getMasteryState(ea, now));
    const rb = MASTERY_ORDER.indexOf(getMasteryState(eb, now));
    return ra - rb || ea.builderPasses - eb.builderPasses;
  })[0];
  const needsBoss = getEvidence(stats, weakest.id).builderPasses === 0;
  return {
    kind: "practice",
    title: `Practice: ${weakest.title}`,
    description: needsBoss
      ? "You cleared this run but have not built it yet. Prove it in the builder."
      : "Replay the builder scenario and try to pass with fewer hints.",
    href: `/builder?scenario=${weakest.builderScenarioId}`,
    ctaLabel: "Practice now",
    xpReward: needsBoss ? builderXpFor(weakest) : Math.round(builderXpFor(weakest) * 0.2),
    patternId: weakest.id,
    badge: "Practice",
  };
}

export interface DailyObjective {
  completedToday: boolean;
  action: NextAction;
  streak: number;
}

export function getDailyObjective(stats: UserStats, now: Date, runs: Record<string, RunProgress> = {}): DailyObjective {
  return {
    completedToday: practicedToday(stats, now),
    action: selectNextAction(stats, now, runs),
    streak: getCurrentStreak(stats, now),
  };
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Accepts anything read from localStorage and returns valid v2 stats.
 * v1 data (no schemaVersion) is upgraded: cleared chapters become cleared
 * pattern runs, and existing completions are marked as already rewarded.
 */
export function migrateStats(raw: unknown, now: Date): UserStats {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATS };
  const r = raw as Record<string, unknown>;

  const currentXp = asNumber(r.currentXp, 0);
  const level = levelForXp(currentXp);
  const stats: UserStats = {
    ...DEFAULT_STATS,
    ...(r as Partial<UserStats>),
    currentXp,
    level,
    nextLevelXp: level * XP_PER_LEVEL,
    totalScore: asNumber(r.totalScore, currentXp),
    streakDays: asNumber(r.streakDays, 0),
    completedLessons: asStringArray(r.completedLessons),
    completedChallenges: asStringArray(r.completedChallenges),
    completedGuided: asStringArray(r.completedGuided),
    completedInterviews: asStringArray(r.completedInterviews),
    completedMissions: asStringArray(r.completedMissions),
    completedChapters: asStringArray(r.completedChapters),
    unlockedBadges: asStringArray(r.unlockedBadges),
    awardedEvents: asStringArray(r.awardedEvents),
    practiceDays: asStringArray(r.practiceDays),
    soundEnabled: typeof r.soundEnabled === "boolean" ? r.soundEnabled : true,
    patternProgress:
      r.patternProgress && typeof r.patternProgress === "object"
        ? (r.patternProgress as UserStats["patternProgress"])
        : {},
  };

  if (asNumber(r.schemaVersion, 1) >= STATS_SCHEMA_VERSION) return stats;

  // v1 → v2
  const events = new Set(stats.awardedEvents);
  const collections: ActivityCollection[] = [
    "completedLessons",
    "completedChallenges",
    "completedGuided",
    "completedInterviews",
    "completedMissions",
  ];
  collections.forEach((c) => (stats[c] ?? []).forEach((id) => events.add(`${c}:${id}:first`)));

  const progress = { ...(stats.patternProgress ?? {}) };
  for (const pattern of getAllPatterns()) {
    if (!stats.completedChapters?.includes(pattern.chapterId)) continue;
    events.add(`pattern-run:${pattern.id}:first`);
    // The v1 chapter flow required the boss and transfer answers, so count one clear.
    // We have no timing data, so schedule the first review a day from now.
    progress[pattern.id] = {
      ...emptyEvidence(),
      ...(progress[pattern.id] ?? {}),
      runsStarted: 1,
      applied: 1,
      runsCleared: 1,
      transferAttempts: 1,
      transferPasses: 1,
      firstClearedAt: now.toISOString(),
      reviewDueAt: addDays(now, REVIEW_INTERVAL_DAYS[0]).toISOString(),
    };
  }

  return {
    ...stats,
    // v1 never tracked practice dates, so the old streak value cannot be trusted.
    streakDays: stats.lastPracticeDate ? stats.streakDays : 0,
    awardedEvents: [...events],
    patternProgress: progress,
    schemaVersion: STATS_SCHEMA_VERSION,
  };
}
