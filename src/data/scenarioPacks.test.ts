import test from "node:test";
import assert from "node:assert/strict";

import { getAllScenarioPacks, getIncidentById, getWarRoomIncident } from "@/data/scenarioPacks";
import { getPlayableIncidents, incidentQualityIssues } from "@/data/incidentQuality";

// Enough distinct War Room runs per level that replays don't feel repetitive.
const MIN_WAR_ROOM_ROTATION = 5;

test("every reviewed incident passes the content-quality gate", () => {
  const failures: string[] = [];
  for (const pack of getAllScenarioPacks()) {
    for (const inc of pack.incidents.filter((i) => i.reviewed)) {
      const issues = incidentQualityIssues(inc, pack);
      if (issues.length > 0) failures.push(`${inc.id}: ${issues.join(", ")}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("reviewed incidents have three choices with their own result text", () => {
  for (const pack of getAllScenarioPacks()) {
    for (const inc of pack.incidents.filter((i) => i.reviewed)) {
      assert.equal(inc.choices.length, 3, `${inc.id} should have exactly 3 choices`);
      assert.equal(inc.hints.length, 3, `${inc.id} should have 3 hints`);
      for (const c of inc.choices) {
        assert.ok(c.resultTitle?.trim(), `${inc.id}/${c.id} has no resultTitle`);
        assert.ok((c.resultBody?.trim().split(/\s+/).length ?? 0) >= 8, `${inc.id}/${c.id} resultBody is too thin`);
        assert.ok(c.metricsAfter && c.metricsAfter.length > 0, `${inc.id}/${c.id} has no metricsAfter`);
      }
    }
  }
});

test("reviewed incidents' CPU metric agrees with the hottest node in the graph", () => {
  for (const pack of getAllScenarioPacks()) {
    for (const inc of pack.incidents.filter((i) => i.reviewed)) {
      const cpuMetric = inc.metricsBefore.find((m) => m.key === "cpu");
      const nodeCpus = inc.graphBefore.nodes.map((n) => n.cpu).filter((c): c is number => typeof c === "number");
      if (!cpuMetric || nodeCpus.length === 0) continue;
      const hottest = Math.max(...nodeCpus);
      assert.ok(
        Math.abs(Number(cpuMetric.value) - hottest) <= 15,
        `${inc.id}: CPU metric ${cpuMetric.value}% vs hottest node ${hottest}%`
      );
    }
  }
});

test(`every level has at least ${MIN_WAR_ROOM_ROTATION} playable War Room incidents`, () => {
  const thin: string[] = [];
  for (const pack of getAllScenarioPacks()) {
    const startable = getPlayableIncidents(pack).filter((i) => !i.isCascade);
    if (startable.length < MIN_WAR_ROOM_ROTATION) thin.push(`${pack.patternId}: ${startable.length}`);
  }
  assert.deepEqual(thin, []);
});

test("War Room rotation starts with the canonical incident and then varies", () => {
  for (const pack of getAllScenarioPacks()) {
    const first = getWarRoomIncident(pack.patternId, 0);
    assert.ok(first?.canonical || first?.id === pack.canonicalId, `${pack.patternId} should open on its canonical incident`);
    const second = getWarRoomIncident(pack.patternId, 1);
    assert.ok(second, `${pack.patternId} has no second incident`);
  }
});

test("incident ids are unique and cascade links resolve", () => {
  const seen = new Set<string>();
  for (const pack of getAllScenarioPacks()) {
    for (const inc of pack.incidents) {
      assert.ok(!seen.has(inc.id), `duplicate incident id ${inc.id}`);
      seen.add(inc.id);
      for (const c of inc.choices) {
        if (c.cascadeIncidentId) assert.ok(getIncidentById(c.cascadeIncidentId), `${inc.id}/${c.id} cascades to a missing incident`);
      }
    }
  }
});
