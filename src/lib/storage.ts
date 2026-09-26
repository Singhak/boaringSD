// Browser persistence for player progress. localStorage is the only store:
// there are no accounts or cross-device sync yet, so don't advertise either.

import type {
  BuilderScenario,
  InterviewResult,
  PatternId,
  PatternRunResult,
  ReasoningResult,
  RunProgress,
  SystemDesignPattern,
  UserStats,
} from "@/types";
import {
  DEFAULT_STATS,
  ProgressionOutcome,
  completeActivity,
  migrateStats,
  recordBuilderResult,
  recordDefense,
  recordEstimate,
  recordFixApplied,
  recordInterviewResult,
  recordPatternRun,
  recordReasoning,
  recordReview,
  recordRunStarted,
  recordTransferMiss,
} from "@/lib/progression";

const STORAGE_KEY = "sd_quest_user_stats_v1"; // key kept for backward compatibility; shape is versioned inside
const RUNS_KEY = "sd_quest_run_progress_v1";
const DESIGNS_KEY = "sd_quest_builder_designs_v1";
const ROTATION_KEY = "sd_quest_rotation_state_v1";
const SHUFFLE_KEY = "sd_quest_shuffle_nonce_v1";
export const STATS_EVENT = "sd_quest_stats_updated";

type Result = { stats: UserStats; leveledUp: boolean };

export function readRawStats(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getUserStats(): UserStats {
  if (typeof window === "undefined") return { ...DEFAULT_STATS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    const migrated = migrateStats(parsed, new Date());
    if (parsed?.schemaVersion !== migrated.schemaVersion) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveUserStats(stats: UserStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    window.dispatchEvent(new Event(STATS_EVENT));
  } catch (err) {
    console.error("Failed to save user stats:", err);
  }
}

function commit(outcome: ProgressionOutcome): ProgressionOutcome {
  saveUserStats(outcome.stats);
  return outcome;
}

function update(fn: (stats: UserStats) => UserStats): UserStats {
  const next = fn(getUserStats());
  saveUserStats(next);
  return next;
}

// ---------------------------------------------------------------------------
// Activity completions (all idempotent: first clear once, replay once per day)
// ---------------------------------------------------------------------------

const LESSON_BADGES: Record<string, string> = {
  "load-balancer": "first_node",
  cache: "cache_master",
  "database-scaling": "db_architect",
};

export function completeLesson(lessonId: string, xpReward: number): Result {
  const now = new Date();
  const badges = LESSON_BADGES[lessonId] ? [LESSON_BADGES[lessonId]] : [];
  const out = completeActivity(
    getUserStats(),
    { collection: "completedLessons", id: lessonId, firstXp: xpReward, replayXp: Math.floor(xpReward * 0.2), badges },
    now
  );
  if (out.stats.currentXp >= 500 && !out.stats.unlockedBadges.includes("grandmaster")) {
    out.stats = { ...out.stats, unlockedBadges: [...out.stats.unlockedBadges, "grandmaster"] };
  }
  return commit(out);
}

export function completeChallenge(challengeId: string, rewardXp: number): Result {
  return commit(
    completeActivity(
      getUserStats(),
      { collection: "completedChallenges", id: challengeId, firstXp: rewardXp, replayXp: 20, badges: ["challenge_hero"] },
      new Date()
    )
  );
}

export function completeGuided(scenarioId: string, rewardXp: number): Result {
  return commit(
    completeActivity(
      getUserStats(),
      { collection: "completedGuided", id: scenarioId, firstXp: rewardXp, replayXp: 25, badges: ["system_thinker"] },
      new Date()
    )
  );
}

export function completeInterview(interviewId: string, rewardXp: number): Result {
  return commit(
    completeActivity(
      getUserStats(),
      { collection: "completedInterviews", id: interviewId, firstXp: rewardXp, replayXp: 30, badges: ["interview_ace"] },
      new Date()
    )
  );
}

export function submitEstimate(problemId: string, score: number): ProgressionOutcome {
  return commit(recordEstimate(getUserStats(), problemId, score, new Date()));
}

export function saveInterviewResult(interviewId: string, result: Omit<InterviewResult, "at">): UserStats {
  return update((s) => recordInterviewResult(s, interviewId, result, new Date()));
}

export function saveDefenseResult(firstTry: boolean): UserStats {
  return update((s) => recordDefense(s, firstTry));
}

export function saveReasoningResult(
  promptId: string,
  result: Omit<ReasoningResult, "at">,
  bonusXp: number
): ProgressionOutcome {
  return commit(recordReasoning(getUserStats(), promptId, result, bonusXp, new Date()));
}

export function recordMissionComplete(missionId: string, xpReward: number): ProgressionOutcome {
  return commit(
    completeActivity(
      getUserStats(),
      {
        collection: "completedMissions",
        id: missionId,
        firstXp: xpReward,
        replayXp: 15,
        badges: ["pushpa_first_responder"],
        onFirstClear: (s) => ({
          ...s,
          systemsSaved: (s.systemsSaved || 0) + 1,
          incidentsSolved: (s.incidentsSolved || 0) + 1,
        }),
      },
      new Date()
    )
  );
}

// ---------------------------------------------------------------------------
// Pattern runs, builder bosses, reviews
// ---------------------------------------------------------------------------

export function markRunStarted(patternId: PatternId): UserStats {
  return update((s) => recordRunStarted(s, patternId, new Date()));
}

export function markFixApplied(patternId: PatternId): UserStats {
  return update((s) => recordFixApplied(s, patternId, new Date()));
}

export function markTransferMiss(patternId: PatternId): UserStats {
  return update((s) => recordTransferMiss(s, patternId));
}

export function completePatternRun(pattern: SystemDesignPattern, result: PatternRunResult): ProgressionOutcome {
  return commit(recordPatternRun(getUserStats(), pattern, result, new Date()));
}

export function submitBuilderResult(
  scenario: BuilderScenario,
  rewardXp: number,
  passed: boolean,
  failureReasons: string[]
): ProgressionOutcome {
  return commit(recordBuilderResult(getUserStats(), scenario, rewardXp, passed, failureReasons, new Date()));
}

export function submitReview(pattern: SystemDesignPattern, passed: boolean) {
  const out = recordReview(getUserStats(), pattern, passed, new Date());
  if (!out.early) saveUserStats(out.stats);
  return out;
}

// ---------------------------------------------------------------------------
// Resumable run state (kept out of UserStats so it is not mirrored to the API)
// ---------------------------------------------------------------------------

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the run continues in memory.
  }
}

export function getAllRunProgress(): Record<string, RunProgress> {
  return readJson<Record<string, RunProgress>>(RUNS_KEY, {});
}

export function getRunProgress(chapterId: string): RunProgress | undefined {
  return getAllRunProgress()[chapterId];
}

export function saveRunProgress(progress: RunProgress): void {
  writeJson(RUNS_KEY, { ...getAllRunProgress(), [progress.chapterId]: progress });
}

export function clearRunProgress(chapterId: string): void {
  const all = getAllRunProgress();
  delete all[chapterId];
  writeJson(RUNS_KEY, all);
}

export interface SavedDesign {
  nodes: { id: string; label: string; type: string; x: number; y: number }[];
  edges: { source: string; target: string }[];
}

interface ScenarioDesigns {
  draft?: SavedDesign;
  passed?: SavedDesign;
}

export function getScenarioDesigns(scenarioId: string): ScenarioDesigns {
  return readJson<Record<string, ScenarioDesigns>>(DESIGNS_KEY, {})[scenarioId] ?? {};
}

export function saveScenarioDesign(scenarioId: string, kind: keyof ScenarioDesigns, design: SavedDesign | undefined): void {
  const all = readJson<Record<string, ScenarioDesigns>>(DESIGNS_KEY, {});
  all[scenarioId] = { ...(all[scenarioId] ?? {}), [kind]: design };
  writeJson(DESIGNS_KEY, all);
}

export function readScenarioRotationState(): Record<string, number> {
  return readJson<Record<string, number>>(ROTATION_KEY, {});
}

export function saveScenarioRotationState(key: string, value: number): void {
  const next = { ...readScenarioRotationState(), [key]: value };
  writeJson(ROTATION_KEY, next);
}

/**
 * Seed for option shuffling that changes on every attempt of the same content,
 * so answer positions can't be memorised. Call once per attempt (e.g. in a
 * lazy useState initializer of a client-only component).
 */
export function nextShuffleSeed(scope: string): string {
  const all = readJson<Record<string, number>>(SHUFFLE_KEY, {});
  const n = (all[scope] ?? 0) + 1;
  writeJson(SHUFFLE_KEY, { ...all, [scope]: n });
  return `${scope}#${n}`;
}

// ---------------------------------------------------------------------------
// Feature unlocks
// ---------------------------------------------------------------------------

export function getFeatureUnlockStatus(stats: UserStats) {
  const level = stats.level || 1;
  const chapters = stats.completedChapters || [];
  const missions = stats.completedMissions || [];
  const isExperienced = level >= 2 || chapters.length >= 1 || missions.length >= 2;

  return {
    campaign: { unlocked: true, minLevel: 1, label: "Campaign" },
    builder: { unlocked: isExperienced, minLevel: 2, label: "Architecture Sandbox" },
    interview: { unlocked: isExperienced, minLevel: 2, label: "Interview Arena" },
    challengeLab: { unlocked: level >= 3 || chapters.length >= 2, minLevel: 3, label: "Challenge Lab" },
  };
}
