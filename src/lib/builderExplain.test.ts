import test from "node:test";
import assert from "node:assert/strict";

import { builderXpForStars, explainOutcome } from "@/lib/builderExplain";

test("a first-try explanation keeps all 3 stars and counts as first try", () => {
  assert.deepEqual(explainOutcome([true]), { done: true, passed: true, firstTry: true, stars: 3, retriesLeft: 1 });
});

test("a wrong pick costs a star and leaves one retry", () => {
  const afterMiss = explainOutcome([false]);
  assert.equal(afterMiss.done, false);
  assert.equal(afterMiss.retriesLeft, 1);
  const retried = explainOutcome([false, true]);
  assert.equal(retried.passed, true);
  assert.equal(retried.firstTry, false);
  assert.equal(retried.stars, 2);
});

test("two misses end the gate with 1 star; extra answers are ignored", () => {
  const out = explainOutcome([false, false, true]);
  assert.equal(out.done, true);
  assert.equal(out.passed, false);
  assert.equal(out.stars, 1);
});

test("builder XP scales with stars", () => {
  assert.equal(builderXpForStars(90, 3), 90);
  assert.equal(builderXpForStars(90, 1), 30);
});
