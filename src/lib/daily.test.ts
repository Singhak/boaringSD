import test from "node:test";
import assert from "node:assert/strict";

import {
  generateDailyShareCard,
  getDailyChallenge,
  getDailySeed,
  isDailyCompleted,
  recordDailyCompletion,
} from "./daily";
import { DEFAULT_STATS } from "./progression";

const D1 = new Date(2026, 8, 28, 10, 0, 0); // 2026-09-28
const D2 = new Date(2026, 8, 29, 10, 0, 0); // 2026-09-29

test("daily challenge is deterministic for the same date and differs across dates", () => {
  const c1a = getDailyChallenge(D1);
  const c1b = getDailyChallenge(D1);
  const c2 = getDailyChallenge(D2);

  assert.equal(c1a.dateKey, "2026-09-28");
  assert.equal(c1a.seed, getDailySeed(D1));
  assert.equal(c1a.incident.id, c1b.incident.id);
  assert.equal(c1a.skin.region, c1b.skin.region);
  assert.equal(c1a.skin.occasion, c1b.skin.occasion);

  // Different date gets a different seed/challenge
  assert.equal(c2.dateKey, "2026-09-29");
  assert.notEqual(c1a.seed, c2.seed);
});

test("daily challenge completion awards bonus XP once per day and increments streak", () => {
  assert.equal(isDailyCompleted(DEFAULT_STATS, D1), false);

  const res1 = recordDailyCompletion(DEFAULT_STATS, 3, D1);
  assert.equal(res1.firstClear, true);
  assert.equal(res1.xpAwarded, 75);
  assert.equal(res1.stats.streakDays, 1);
  assert.equal(isDailyCompleted(res1.stats, D1), true);

  // Second submission on the same day awards 0 XP
  const res2 = recordDailyCompletion(res1.stats, 3, D1);
  assert.equal(res2.firstClear, false);
  assert.equal(res2.xpAwarded, 0);
});

test("generateDailyShareCard produces formatted shareable text with score and streak", () => {
  const card = generateDailyShareCard({
    dateKey: "2026-09-28",
    patternTitle: "Caching Under Spike",
    stars: 3,
    budgetRemainingPercent: 88,
    streak: 4,
    hintsUsed: 0,
  });

  assert.ok(card.includes("BoaringSD Daily Outage · 2026-09-28"));
  assert.ok(card.includes("⭐⭐⭐"));
  assert.ok(card.includes("88% budget remaining"));
  assert.ok(card.includes("🔥 4 days"));
  assert.ok(card.includes("0 hints used"));
});
