import test from "node:test";
import assert from "node:assert/strict";

import { buildDebriefSummary } from "@/lib/debriefSummary";

test("a same-day replay shows +0 XP and says when replay XP resets", () => {
  const s = buildDebriefSummary({ incidentXp: [0], runXp: 0, transferFirstTry: true });
  assert.equal(s.xpAwarded, 0);
  assert.equal(s.xpLabel, "+0 XP");
  assert.equal(s.xpNote, "Replay XP resets tomorrow");
});

test("the debrief shows the XP actually awarded", () => {
  const s = buildDebriefSummary({ incidentXp: [150, 15], runXp: 200, transferFirstTry: true });
  assert.equal(s.xpAwarded, 365);
  assert.equal(s.xpNote, null);
});

test("Mastery Verified only when the aftershock was passed first try", () => {
  assert.equal(buildDebriefSummary({ incidentXp: [100], runXp: 0, transferFirstTry: true }).masteryTitle, "Mastery Verified");
  const missed = buildDebriefSummary({ incidentXp: [100], runXp: 0, transferFirstTry: false });
  assert.equal(missed.masteryVerified, false);
  assert.notEqual(missed.masteryTitle, "Mastery Verified");
});
