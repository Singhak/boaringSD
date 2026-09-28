import { getAllScenarioPacks } from "@/data/scenarioPacks";
import { applySkin, pickSkin, type IncidentSkin } from "@/lib/incidentSkin";
import { claimEvent, grantXp, recordPractice, toDateKey } from "@/lib/progression";
import { hashSeed } from "@/lib/shuffle";
import type { IncidentV2, UserStats } from "@/types";

export const DAILY_BONUS_XP = 75;

export interface DailyChallengeInfo {
  dateKey: string;
  seed: string;
  patternId: string;
  packTitle: string;
  incident: IncidentV2;
  skin: IncidentSkin;
  bonusXp: number;
}

export function getDailyDateKey(date: Date = new Date()): string {
  return toDateKey(date);
}

export function getDailySeed(date: Date = new Date()): string {
  return `daily-outage-${getDailyDateKey(date)}`;
}

/**
 * Returns today's globally synchronized incident challenge.
 * Uses date hash to pick an incident and applies a constraint skin variant.
 */
export function getDailyChallenge(date: Date = new Date()): DailyChallengeInfo {
  const dateKey = getDailyDateKey(date);
  const seed = getDailySeed(date);
  const h = Math.abs(hashSeed(seed));

  const packs = getAllScenarioPacks();
  if (packs.length === 0) {
    throw new Error("No scenario packs loaded");
  }

  const pack = packs[h % packs.length];
  // Prefer an incident with constraint variants if available
  const variantIncident = pack.incidents.find((s) => s.variants && s.variants.length > 0);
  const baseIncident = variantIncident ?? pack.incidents[Math.floor(h / 7) % pack.incidents.length];

  const skin = pickSkin(seed, baseIncident);
  const incident = applySkin(baseIncident, skin);

  return {
    dateKey,
    seed,
    patternId: pack.patternId,
    packTitle: pack.patternName,
    incident,
    skin,
    bonusXp: DAILY_BONUS_XP,
  };
}

export function isDailyCompleted(stats: UserStats, date: Date = new Date()): boolean {
  const key = `daily:${getDailyDateKey(date)}`;
  return stats.awardedEvents?.includes(key) ?? false;
}

export function recordDailyCompletion(
  stats: UserStats,
  stars: number,
  now: Date = new Date()
): { stats: UserStats; xpAwarded: number; leveledUp: boolean; firstClear: boolean } {
  const dateKey = getDailyDateKey(now);
  const eventKey = `daily:${dateKey}`;

  const claim = claimEvent(stats, eventKey);
  if (!claim.awarded) {
    return { stats, xpAwarded: 0, leveledUp: false, firstClear: false };
  }

  // Bonus XP scales slightly with stars: 3 stars = full bonus, 2 stars = 75%, 1 star = 50%
  const multiplier = stars >= 3 ? 1.0 : stars === 2 ? 0.75 : 0.5;
  const xp = Math.round(DAILY_BONUS_XP * multiplier);

  const withPractice = recordPractice(claim.stats, now);
  const granted = grantXp(withPractice, xp);

  return {
    stats: granted.stats,
    xpAwarded: xp,
    leveledUp: granted.leveledUp,
    firstClear: true,
  };
}

export interface DailyShareParams {
  dateKey: string;
  patternTitle: string;
  stars: number;
  budgetRemainingPercent: number;
  streak: number;
  hintsUsed?: number;
}

export function generateDailyShareCard(params: DailyShareParams): string {
  const starIcons = "⭐".repeat(Math.max(1, Math.min(3, params.stars)));
  const emptyStars = "☆".repeat(Math.max(0, 3 - params.stars));
  const hints = params.hintsUsed ?? 0;
  const hintText = hints === 0 ? "0 hints used" : `${hints} hint${hints > 1 ? "s" : ""}`;

  return [
    `BoaringSD Daily Outage · ${params.dateKey}`,
    `Outage: ${params.patternTitle}`,
    `Performance: ${starIcons}${emptyStars} (${params.budgetRemainingPercent}% budget remaining)`,
    `Streak: 🔥 ${params.streak} day${params.streak === 1 ? "" : "s"} · ${hintText}`,
    `https://boaringsd.dev/daily`,
  ].join("\n");
}
