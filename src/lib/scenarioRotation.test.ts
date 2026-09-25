import test from "node:test";
import assert from "node:assert/strict";

import { getScenarioPackByPatternId, getScenarioVariantForPattern } from "@/data/scenarioPacks";

test("scenario packs exist for every pattern with a non-empty variant list", () => {
  const ids = [
    "horizontal-scaling",
    "load-balancing",
    "read-replicas",
    "caching",
    "cdn-edge",
    "async-queues",
    "sharding",
    "consistency",
  ];

  for (const id of ids) {
    const pack = getScenarioPackByPatternId(id);
    assert.ok(pack, `missing scenario pack for ${id}`);
    assert.ok(pack.variants.length >= 5, `${id} should have multiple variants`);
  }
});

test("variant rotation cycles without repeating immediately", () => {
  const first = getScenarioVariantForPattern("load-balancing", 0);
  const second = getScenarioVariantForPattern("load-balancing", 1);
  const third = getScenarioVariantForPattern("load-balancing", 2);

  assert.ok(first.id !== second.id);
  assert.ok(second.id !== third.id);
  assert.ok(first.id !== third.id);

  const replay = getScenarioVariantForPattern("load-balancing", 99);
  assert.equal(replay.id, first.id);
});
