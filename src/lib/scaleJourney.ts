// Scale Journey progress: stages cleared per ISO week, and the weekly completion bonus.
import { claimEvent, grantXp, recordPractice } from "@/lib/progression";
import type { UserStats } from "@/types";

export const JOURNEY_STAGE_COUNT = 5;
export const JOURNEY_BONUS_XP = 150;
/** Levels cleared before the weekly boss unlocks (the end of the Foundation tier). */
export const JOURNEY_UNLOCK_LEVELS = 5;

export function journeyStagesCleared(stats: UserStats, weekKey: string): number {
  return stats.journeyWeeks?.[weekKey] ?? 0;
}

/**
 * Records a cleared stage. Stages are cleared in order, a cleared stage counts toward the
 * streak, and clearing the last one pays the weekly bonus once.
 */
export function recordJourneyStage(
  stats: UserStats,
  weekKey: string,
  stageIndex: number,
  now: Date
): { stats: UserStats; xpAwarded: number; leveledUp: boolean; completed: boolean } {
  const cleared = journeyStagesCleared(stats, weekKey);
  if (stageIndex !== cleared) return { stats, xpAwarded: 0, leveledUp: false, completed: cleared >= JOURNEY_STAGE_COUNT };

  // Keep the last 8 weeks.
  const weeks = Object.entries(stats.journeyWeeks ?? {})
    .filter(([k]) => k !== weekKey)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);
  let next: UserStats = recordPractice(
    { ...stats, journeyWeeks: { ...Object.fromEntries(weeks), [weekKey]: cleared + 1 } },
    now
  );
  const completed = cleared + 1 >= JOURNEY_STAGE_COUNT;
  if (!completed) return { stats: next, xpAwarded: 0, leveledUp: false, completed };

  const claim = claimEvent(next, `journey:${weekKey}`);
  if (!claim.awarded) return { stats: claim.stats, xpAwarded: 0, leveledUp: false, completed };
  next = claim.stats;
  const granted = grantXp(next, JOURNEY_BONUS_XP);
  return { stats: granted.stats, xpAwarded: JOURNEY_BONUS_XP, leveledUp: granted.leveledUp, completed };
}
