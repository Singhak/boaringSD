import test from "node:test";
import assert from "node:assert/strict";

import {
  generateDailyShareCard,
  getDailyChallenge,
  getDailyDateKey,
  getDailyResult,
  getDailySeed,
  isDailyCompleted,
  msUntilNextDaily,
  recordDailyCompletion,
} from "./daily";
import { DEFAULT_STATS } from "./progression";

const D1 = new Date(Date.UTC(2026, 8, 28, 10, 0, 0)); // 2026-09-28
const D2 = new Date(Date.UTC(2026, 8, 29, 10, 0, 0)); // 2026-09-29
const RESULT = { incidentId: "cache-02", stars: 3, budgetLeft: 88, hintsUsed: 0, wrongDeploys: 0 };

test("the daily date rolls over at 00:00 UTC, whatever the device's time zone", () => {
  assert.equal(getDailyDateKey(new Date(Date.UTC(2026, 8, 28, 23, 59))), "2026-09-28");
  assert.equal(getDailyDateKey(new Date(Date.UTC(2026, 8, 29, 0, 0))), "2026-09-29");
  assert.equal(msUntilNextDaily(new Date(Date.UTC(2026, 8, 28, 23, 0))), 3_600_000);
});

test("daily challenge is deterministic for the same date and differs across dates", () => {
  const c1a = getDailyChallenge(D1);
  const c1b = getDailyChallenge(D1);
  const c2 = getDailyChallenge(D2);

  assert.equal(c1a.dateKey, "2026-09-28");
  assert.equal(c1a.seed, getDailySeed(D1));
  assert.equal(c1a.incident.id, c1b.incident.id);
  assert.equal(c1a.variantIndex, c1b.variantIndex);
  assert.deepEqual(c1a.skin, c1b.skin);
  assert.notEqual(`${c1a.incident.id}#${c1a.variantIndex}`, `${c2.incident.id}#${c2.variantIndex}`);
});

test("the daily walks every constraint variant before repeating, and flips the answer when it has one", () => {
  const seen = new Set<string>();
  const patterns: string[] = [];
  for (let d = 0; d < 30; d++) {
    const c = getDailyChallenge(new Date(D1.getTime() + d * 86_400_000));
    const key = `${c.incident.id}#${c.variantIndex}`;
    assert.ok(!seen.has(key), `${key} repeated within 30 days`);
    seen.add(key);
    patterns.push(c.patternId);
    if (c.skin.variant) {
      assert.equal(c.incident.choices.find((ch) => ch.correct)?.id, c.skin.variant.correctChoiceId);
      assert.equal(c.incident.constraint, c.skin.variant.constraint);
    }
  }
  assert.ok(new Set(patterns).size >= 10, "a month of dailies covers many patterns");
});

test("daily completion awards bonus XP once per day, saves the result and counts toward the streak", () => {
  assert.equal(isDailyCompleted(DEFAULT_STATS, D1), false);

  const res1 = recordDailyCompletion(DEFAULT_STATS, RESULT, D1);
  assert.equal(res1.firstClear, true);
  assert.equal(res1.xpAwarded, 75);
  assert.equal(res1.stats.streakDays, 1);
  assert.equal(isDailyCompleted(res1.stats, D1), true);
  assert.equal(getDailyResult(res1.stats, D1)?.budgetLeft, 88);

  const res2 = recordDailyCompletion(res1.stats, { ...RESULT, stars: 1 }, D1);
  assert.equal(res2.firstClear, false);
  assert.equal(res2.xpAwarded, 0);
  assert.equal(getDailyResult(res2.stats, D1)?.stars, 3, "a replay never overwrites the first result");

  assert.equal(recordDailyCompletion(DEFAULT_STATS, { ...RESULT, stars: 1 }, D2).xpAwarded, 38);
});

test("generateDailyShareCard produces formatted shareable text with score and streak", () => {
  const card = generateDailyShareCard({
    dateKey: "2026-09-28",
    patternTitle: "Caching Under Spike",
    stars: 2,
    budgetRemainingPercent: 88,
    streak: 4,
    hintsUsed: 0,
    url: "https://example.test/daily",
  });

  assert.ok(card.includes("BoaringSD Daily Outage · 2026-09-28"));
  assert.ok(card.includes("⭐⭐☆"));
  assert.ok(card.includes("88% budget remaining"));
  assert.ok(card.includes("🔥 4 days"));
  assert.ok(card.includes("0 hints used"));
  assert.ok(card.endsWith("https://example.test/daily"));
  assert.ok(!generateDailyShareCard({ ...{ dateKey: "d", patternTitle: "p", stars: 0, budgetRemainingPercent: 0, streak: 1 } }).includes("http"));
});
