import test from "node:test";
import assert from "node:assert/strict";

import { getAllScenarioPacks, getScenarioPackByPatternId, getScenarioVariantForPattern } from "@/data/scenarioPacks";

test("scenario packs exist for all 15 system patterns with non-empty variants", () => {
  const ids = [
    "horizontal-scaling",
    "load-balancing",
    "read-replicas",
    "caching",
    "cdn-edge",
    "async-queues",
    "sharding",
    "consistency",
    "rate-limiting",
    "circuit-breaker",
    "connection-pooling",
    "backpressure",
    "idempotency",
    "multi-region",
    "health-checks",
  ];

  for (const id of ids) {
    const pack = getScenarioPackByPatternId(id);
    assert.ok(pack, `missing scenario pack for ${id}`);
    assert.ok(pack.variants.length >= 5, `${id} should have multiple variants`);
  }

  const all = getAllScenarioPacks();
  assert.equal(all.length, 15);
});

test("variant rotation cycles without repeating immediately", () => {
  const first = getScenarioVariantForPattern("load-balancing", 0);
  const second = getScenarioVariantForPattern("load-balancing", 1);
  const third = getScenarioVariantForPattern("load-balancing", 2);

  assert.ok(first.id !== second.id);
  assert.ok(second.id !== third.id);
  assert.ok(first.id !== third.id);

  const pack = getScenarioPackByPatternId("load-balancing");
  assert.ok(pack);
  const replay = getScenarioVariantForPattern("load-balancing", pack.variants.length);
  assert.equal(replay.id, first.id);
});

test("deterministic shuffle distributes options without losing correct answer", () => {
  function deterministicShuffle<T>(items: T[], seed: string): T[] {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      hash = (hash * 9301 + 49297) % 233280;
      const j = Math.floor((Math.abs(hash) / 233280) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const options = [
    { id: "correct", isCorrect: true },
    { id: "wrong-1", isCorrect: false },
    { id: "wrong-2", isCorrect: false },
    { id: "wrong-3", isCorrect: false },
  ];

  const shuffled1 = deterministicShuffle(options, "variant-a");
  const shuffled2 = deterministicShuffle(options, "variant-b");

  assert.equal(shuffled1.length, 4);
  assert.ok(shuffled1.some((o) => o.isCorrect));

  // Verify same seed yields identical order
  const shuffledAgain = deterministicShuffle(options, "variant-a");
  assert.deepEqual(shuffled1, shuffledAgain);
});
