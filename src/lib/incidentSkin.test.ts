import test from "node:test";
import assert from "node:assert/strict";

import { getAllScenarioPacks } from "@/data/scenarioPacks";
import { getPlayableIncidents } from "@/data/incidentQuality";
import { applySkin, pickSkin, scaleTrafficText } from "@/lib/incidentSkin";

test("traffic numbers in text scale and stay readable", () => {
  assert.equal(scaleTrafficText("A single API key sends 20,000 req/s", 1.5), "A single API key sends 30,000 req/s");
  assert.equal(scaleTrafficText("draws 180,000 reads/s", 2), "draws 360,000 reads/s");
  assert.equal(scaleTrafficText("9k req/s per region", 3), "27k req/s per region");
  assert.equal(scaleTrafficText("consumes 300 order.paid events/s", 0.5), "consumes 150 order.paid events/s");
  assert.equal(scaleTrafficText("p99 jumps from 80ms to 4s", 2), "p99 jumps from 80ms to 4s", "non-traffic numbers are untouched");
});

test("skins are deterministic per seed and vary across seeds", () => {
  assert.deepEqual(pickSkin("warroom:caching#3"), pickSkin("warroom:caching#3"));
  const skins = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(pickSkin(`warroom:caching#${i}`))));
  assert.ok(skins.size > 4);
});

test("a skin never changes answers, ids, graph or non-traffic metrics", () => {
  for (const pack of getAllScenarioPacks()) {
    for (const incident of getPlayableIncidents(pack)) {
      const skinned = applySkin(incident, pickSkin(incident.id));
      assert.equal(skinned.id, incident.id);
      assert.deepEqual(skinned.graphBefore, incident.graphBefore);
      assert.deepEqual(
        skinned.choices.map((c) => [c.id, c.correct, c.label]),
        incident.choices.map((c) => [c.id, c.correct, c.label])
      );
      const nonTraffic = (ms: typeof incident.metricsBefore) => ms.filter((m) => m.key !== "rps");
      assert.deepEqual(nonTraffic(skinned.metricsBefore), nonTraffic(incident.metricsBefore));
    }
  }
});
