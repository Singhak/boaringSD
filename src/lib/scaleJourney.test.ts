import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_STATS } from "./progression";
import { JOURNEY_BONUS_XP, JOURNEY_STAGE_COUNT, journeyStagesCleared, recordJourneyStage } from "./scaleJourney";

const NOW = new Date(2026, 8, 29, 10);

test("stages clear in order, count toward the streak, and the last pays the weekly bonus once", () => {
  let s = DEFAULT_STATS;
  assert.equal(recordJourneyStage(s, "2026-W40", 1, NOW).stats, s, "cannot skip ahead");

  for (let i = 0; i < JOURNEY_STAGE_COUNT - 1; i++) {
    const out = recordJourneyStage(s, "2026-W40", i, NOW);
    assert.equal(out.xpAwarded, 0);
    s = out.stats;
  }
  assert.equal(s.streakDays, 1);
  assert.equal(journeyStagesCleared(s, "2026-W40"), JOURNEY_STAGE_COUNT - 1);

  const last = recordJourneyStage(s, "2026-W40", JOURNEY_STAGE_COUNT - 1, NOW);
  assert.equal(last.completed, true);
  assert.equal(last.xpAwarded, JOURNEY_BONUS_XP);
  assert.equal(recordJourneyStage(last.stats, "2026-W40", JOURNEY_STAGE_COUNT - 1, NOW).xpAwarded, 0);
  assert.equal(journeyStagesCleared(last.stats, "2026-W41"), 0, "a new week starts fresh");
});
