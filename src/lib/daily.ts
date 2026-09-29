import { getAllScenarioPacks } from "@/data/scenarioPacks";
import { getPlayableIncidents } from "@/data/incidentQuality";
import { applySkin, pickSkin, type IncidentSkin } from "@/lib/incidentSkin";
import { claimEvent, grantXp, recordPractice } from "@/lib/progression";
import { deterministicShuffle } from "@/lib/shuffle";
import { getDailyDateKey } from "@/lib/dailyKey";
import type { DailyResult, IncidentPackV2, IncidentV2, UserStats } from "@/types";

export { getDailyDateKey, isDailyCompleted, msUntilNextDaily } from "@/lib/dailyKey";

export const DAILY_BONUS_XP = 75;
const MS_PER_DAY = 86_400_000;

export interface DailyChallengeInfo {
  dateKey: string;
  seed: string;
  patternId: string;
  packTitle: string;
  level: number;
  phase: IncidentPackV2["phase"];
  incident: IncidentV2;
  /** Index into the base incident's `variants`, or undefined for a cosmetic-only day. */
  variantIndex?: number;
  skin: IncidentSkin;
  bonusXp: number;
}

export function getDailySeed(date: Date = new Date()): string {
  return `daily-outage-${getDailyDateKey(date)}`;
}

interface PoolEntry {
  pack: IncidentPackV2;
  incident: IncidentV2;
  variantIndex?: number;
}

/**
 * Every authored constraint variant is one daily. The pool is shuffled once with a fixed
 * seed and walked a day at a time, so no variant repeats until all of them have been played
 * and consecutive days land on different patterns.
 */
function dailyPool(): PoolEntry[] {
  const entries: PoolEntry[] = [];
  const fallback: PoolEntry[] = [];
  for (const pack of getAllScenarioPacks()) {
    for (const incident of getPlayableIncidents(pack)) {
      if (incident.isCascade) continue;
      (incident.variants ?? []).forEach((_, variantIndex) => entries.push({ pack, incident, variantIndex }));
      fallback.push({ pack, incident });
    }
  }
  const pool = entries.length > 0 ? entries : fallback;
  const key = (e: PoolEntry) => `${e.incident.id}#${e.variantIndex ?? ""}`;
  return deterministicShuffle(
    pool.sort((a, b) => key(a).localeCompare(key(b))),
    "daily-pool-v1"
  );
}

let cachedPool: PoolEntry[] | null = null;

/** Today's outage: the same incident, constraint and skin for every player. */
export function getDailyChallenge(date: Date = new Date()): DailyChallengeInfo {
  const dateKey = getDailyDateKey(date);
  const seed = getDailySeed(date);
  cachedPool ??= dailyPool();
  if (cachedPool.length === 0) throw new Error("No scenario packs loaded");

  const dayNumber = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / MS_PER_DAY);
  const { pack, incident: base, variantIndex } = cachedPool[dayNumber % cachedPool.length];
  const variant = variantIndex !== undefined ? base.variants?.[variantIndex] : undefined;
  const cosmetic = pickSkin(seed);
  const skin: IncidentSkin = variant ? { ...cosmetic, variant } : cosmetic;

  return {
    dateKey,
    seed,
    patternId: pack.patternId,
    packTitle: pack.patternName,
    level: pack.level,
    phase: pack.phase,
    incident: applySkin(base, skin),
    variantIndex,
    skin,
    bonusXp: DAILY_BONUS_XP,
  };
}

export function getDailyResult(stats: UserStats, date: Date = new Date()): DailyResult | undefined {
  return stats.dailyResults?.[getDailyDateKey(date)];
}

export function recordDailyCompletion(
  stats: UserStats,
  result: Omit<DailyResult, "at">,
  now: Date = new Date()
): { stats: UserStats; xpAwarded: number; leveledUp: boolean; firstClear: boolean } {
  const dateKey = getDailyDateKey(now);
  const claim = claimEvent(stats, `daily:${dateKey}`);
  if (!claim.awarded) {
    return { stats, xpAwarded: 0, leveledUp: false, firstClear: false };
  }

  // Keep the last 30 results so the share card survives a revisit.
  const kept = Object.entries(claim.stats.dailyResults ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-29);
  const withResult: UserStats = {
    ...claim.stats,
    dailyResults: { ...Object.fromEntries(kept), [dateKey]: { ...result, at: now.toISOString() } },
  };

  // Bonus XP scales with stars: 3 stars = full bonus, 2 stars = 75%, 1 star = 50%.
  const multiplier = result.stars >= 3 ? 1.0 : result.stars === 2 ? 0.75 : 0.5;
  const xp = Math.round(DAILY_BONUS_XP * multiplier);
  const granted = grantXp(recordPractice(withResult, now), xp);

  return { stats: granted.stats, xpAwarded: xp, leveledUp: granted.leveledUp, firstClear: true };
}

export interface DailyShareParams {
  dateKey: string;
  patternTitle: string;
  stars: number;
  budgetRemainingPercent: number;
  streak: number;
  hintsUsed?: number;
  /** Absolute link back to the daily; omitted when unknown. */
  url?: string;
}

export function generateDailyShareCard(params: DailyShareParams): string {
  const stars = Math.max(0, Math.min(3, params.stars));
  const hints = params.hintsUsed ?? 0;
  const hintText = hints === 0 ? "0 hints used" : `${hints} hint${hints > 1 ? "s" : ""}`;

  return [
    `BoaringSD Daily Outage · ${params.dateKey}`,
    `Outage: ${params.patternTitle}`,
    `Performance: ${"⭐".repeat(stars)}${"☆".repeat(3 - stars)} (${params.budgetRemainingPercent}% budget remaining)`,
    `Streak: 🔥 ${params.streak} day${params.streak === 1 ? "" : "s"} · ${hintText}`,
    ...(params.url ? [params.url] : []),
  ].join("\n");
}
