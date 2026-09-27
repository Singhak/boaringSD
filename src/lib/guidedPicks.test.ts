import test from "node:test";
import assert from "node:assert/strict";

import { GUIDED_SCENARIOS } from "@/data/guided";
import { checkPicks, orderPicks } from "@/lib/guidedPicks";

const SEEDS = Array.from({ length: 8 }, (_, i) => `guided#${i + 1}`);

/** True if, for some attempt, the correct picks are not simply the first N tiles. */
function correctNotAlwaysFirst(ids: string[], correct: string[], key: string): boolean {
  return SEEDS.some((seed) => {
    const ordered = orderPicks(
      ids.map((id) => ({ id })),
      `${seed}|${key}`
    ).map((x) => x.id);
    return ordered.slice(0, correct.length).some((id) => !correct.includes(id));
  });
}

test("Case Studies picks are not always listed correct-first", () => {
  for (const s of GUIDED_SCENARIOS) {
    const entities = s.entitiesDiscovery.availableEntities.map((e) => e.id);
    const apis = s.apiDesignDiscovery.availableApis.map((a) => a.id);
    assert.ok(correctNotAlwaysFirst(entities, s.entitiesDiscovery.correctEntityIds, `${s.id}|entities`), `${s.id} entities`);
    assert.ok(correctNotAlwaysFirst(apis, s.apiDesignDiscovery.correctApiIds, `${s.id}|apis`), `${s.id} apis`);
  }
});

test("the order changes between attempts", () => {
  const ids = GUIDED_SCENARIOS[0].entitiesDiscovery.availableEntities.map((e) => ({ id: e.id }));
  const orders = new Set(SEEDS.map((seed) => orderPicks(ids, seed).map((x) => x.id).join(",")));
  assert.ok(orders.size > 1);
});

test("selecting every architecture component fails the exact check", () => {
  const all = ["cdn", "load_balancer", "server", "cache", "queue", "database", "replica"];
  for (const s of GUIDED_SCENARIOS) {
    const required = s.architectureDiscovery.requiredComponents;
    assert.equal(checkPicks(all, required, true).pass, false, `${s.id} accepts an over-built design`);
    assert.equal(checkPicks(required, required, true).pass, true, `${s.id} rejects its own answer`);
  }
});
