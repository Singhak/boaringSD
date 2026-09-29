// Lightweight daily helpers (no scenario-pack imports), safe for the navbar and home page.
import type { UserStats } from "@/types";

const MS_PER_DAY = 86_400_000;

/** The daily rolls over at 00:00 UTC, so everyone plays the same outage on the same day. */
export function getDailyDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Milliseconds until the next daily (00:00 UTC). */
export function msUntilNextDaily(now: Date = new Date()): number {
  return MS_PER_DAY - (now.getTime() % MS_PER_DAY);
}

export function isDailyCompleted(stats: UserStats, date: Date = new Date()): boolean {
  return stats.awardedEvents?.includes(`daily:${getDailyDateKey(date)}`) ?? false;
}
