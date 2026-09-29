import test from "node:test";
import assert from "node:assert/strict";

import { summarizeEvents, type TrackedEvent } from "./events";

const NOW = new Date(Date.UTC(2026, 8, 29, 12));
const daysAgo = (d: number, name: TrackedEvent["name"], props?: TrackedEvent["props"]): TrackedEvent => ({
  name,
  ts: new Date(NOW.getTime() - d * 86_400_000).toISOString(),
  ...(props ? { props } : {}),
});

test("summary counts active days, sessions and modes in the right windows", () => {
  const events = [
    daysAgo(20, "session_start"),
    daysAgo(20, "run_start", { replay: false }),
    daysAgo(20, "run_complete"),
    daysAgo(3, "session_start"),
    daysAgo(3, "daily_complete"),
    daysAgo(1, "session_start"),
    daysAgo(1, "run_start", { replay: true }),
    daysAgo(1, "run_complete"),
    daysAgo(1, "estimate_submit"),
  ];
  const s = summarizeEvents(events, NOW);
  assert.equal(s.activeDays7, 2);
  assert.equal(s.activeDays28, 3);
  assert.equal(s.sessions7, 2);
  assert.deepEqual(s.modes7, ["campaign", "daily", "estimation"]);
  assert.equal(s.returnedAfterWeek2, true);
  assert.equal(s.dailyCompletions28, 1);
  assert.equal(s.replayShare28, 0.5);
});

test("a brand-new player has not 'returned after week 2' and has no replay share", () => {
  const s = summarizeEvents([daysAgo(0, "session_start")], NOW);
  assert.equal(s.returnedAfterWeek2, false);
  assert.equal(s.replayShare28, null);
  assert.deepEqual(summarizeEvents([], NOW).modes7, []);
});

import { resolveAnonId } from "./events";

test("anonymous id survives losing either store and is never re-minted needlessly", () => {
  const mint = () => "minted-0000000000000000";
  assert.equal(resolveAnonId("a".repeat(20), "b".repeat(20), mint), "a".repeat(20));
  assert.equal(resolveAnonId(null, "b".repeat(20), mint), "b".repeat(20));
  assert.equal(resolveAnonId("a".repeat(20), null, mint), "a".repeat(20));
  assert.equal(resolveAnonId(null, null, mint), "minted-0000000000000000");
  assert.equal(resolveAnonId("bad id!", "<script>", mint), "minted-0000000000000000");
});
