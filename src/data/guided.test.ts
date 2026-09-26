import test from "node:test";
import assert from "node:assert/strict";

import { GUIDED_SCENARIOS } from "@/data/guided";

const VALID_COMPONENTS = new Set(["client", "load_balancer", "server", "cache", "database", "replica", "cdn", "queue"]);

test("there are at least 14 case studies", () => {
  assert.ok(GUIDED_SCENARIOS.length >= 14, `expected >= 14 scenarios, got ${GUIDED_SCENARIOS.length}`);
});

test("scenario ids are unique", () => {
  const ids = GUIDED_SCENARIOS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("option, entity and api ids are unique within each scenario", () => {
  for (const s of GUIDED_SCENARIOS) {
    const ids = [
      ...s.requirementsDiscovery.options.map((o) => o.id),
      ...s.entitiesDiscovery.availableEntities.map((e) => e.id),
      ...s.apiDesignDiscovery.availableApis.map((a) => a.id),
    ];
    assert.equal(new Set(ids).size, ids.length, `${s.id}: duplicate ids`);
  }
});

for (const s of GUIDED_SCENARIOS) {
  test(`${s.id}: requirements step has one correct answer among >= 3 options`, () => {
    const opts = s.requirementsDiscovery.options;
    assert.ok(opts.length >= 3, `${s.id}: only ${opts.length} options`);
    assert.equal(opts.filter((o) => o.isCorrect).length, 1, `${s.id}: must have exactly one correct option`);
    for (const o of opts) {
      assert.ok(o.text.trim().length > 0 && o.feedback.trim().length > 0, `${s.id}/${o.id}: empty text or feedback`);
    }
  });

  test(`${s.id}: correct requirement is not much longer than the distractors`, () => {
    const opts = s.requirementsDiscovery.options;
    const correct = opts.find((o) => o.isCorrect)!;
    const longestDistractor = Math.max(...opts.filter((o) => !o.isCorrect).map((o) => o.text.length));
    assert.ok(
      correct.text.length <= longestDistractor * 1.4,
      `${s.id}: correct option (${correct.text.length} chars) is > 1.4x the longest distractor (${longestDistractor})`,
    );
  });

  test(`${s.id}: entity step has >= 3 options, a distractor, and a consistent answer set`, () => {
    const { availableEntities, correctEntityIds } = s.entitiesDiscovery;
    assert.ok(availableEntities.length >= 3);
    const essential = availableEntities.filter((e) => e.isEssential).map((e) => e.id).sort();
    assert.deepEqual([...correctEntityIds].sort(), essential, `${s.id}: correctEntityIds must match isEssential`);
    assert.ok(correctEntityIds.length >= 1 && correctEntityIds.length < availableEntities.length);
  });

  test(`${s.id}: API step has >= 3 options, a distractor, and a consistent answer set`, () => {
    const { availableApis, correctApiIds } = s.apiDesignDiscovery;
    assert.ok(availableApis.length >= 3);
    const core = availableApis.filter((a) => a.isInitialCore).map((a) => a.id).sort();
    assert.deepEqual([...correctApiIds].sort(), core, `${s.id}: correctApiIds must match isInitialCore`);
    assert.ok(correctApiIds.length >= 1 && correctApiIds.length < availableApis.length);
  });

  test(`${s.id}: architecture step uses known, unique components`, () => {
    const comps = s.architectureDiscovery.requiredComponents;
    assert.ok(comps.length >= 3);
    assert.equal(new Set(comps).size, comps.length);
    for (const c of comps) assert.ok(VALID_COMPONENTS.has(c), `${s.id}: unknown component ${c}`);
    assert.ok(s.architectureDiscovery.explanation.length > 80);
  });
}

test("the correct requirement is not systematically the longest option", () => {
  const longestIsCorrect = GUIDED_SCENARIOS.filter((s) => {
    const opts = s.requirementsDiscovery.options;
    const max = Math.max(...opts.map((o) => o.text.length));
    return opts.find((o) => o.isCorrect)!.text.length === max;
  }).length;
  assert.ok(longestIsCorrect <= GUIDED_SCENARIOS.length * 0.75, `${longestIsCorrect}/${GUIDED_SCENARIOS.length} correct answers are the longest option`);
});
