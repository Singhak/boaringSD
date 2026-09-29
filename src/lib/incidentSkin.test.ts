import test from "node:test";
import assert from "node:assert/strict";

import { getAllScenarioPacks } from "@/data/scenarioPacks";
import { getPlayableIncidents } from "@/data/incidentQuality";
import { applySkin, pickSkin, scaleTrafficText } from "@/lib/incidentSkin";
import { unknownPatchNodes } from "@/lib/graphPatch";

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

test("a purely cosmetic skin (without variant) never changes answers, ids, graph or non-traffic metrics", () => {
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

test("at least one incident per pack has a constraint variant that flips the correct choice", () => {
  for (const pack of getAllScenarioPacks()) {
    const flippingIncident = pack.incidents.find((inc) => {
      if (!inc.variants || inc.variants.length === 0) return false;
      const originalCorrect = inc.choices.find((c) => c.correct)?.id;
      return inc.variants.some((v) => v.correctChoiceId !== originalCorrect);
    });
    assert.ok(
      flippingIncident,
      `${pack.patternId} has no incident variant that flips the correct choice`
    );

    const original = flippingIncident;
    const variant = original.variants!.find(
      (v) => v.correctChoiceId !== original.choices.find((c) => c.correct)?.id
    )!;
    const skinned = applySkin(original, { scale: 1, region: "us-east-1", occasion: "test", variant });
    const newCorrect = skinned.choices.find((c) => c.correct)?.id;
    assert.equal(newCorrect, variant.correctChoiceId);
    assert.notEqual(newCorrect, original.choices.find((c) => c.correct)?.id);
    assert.equal(skinned.constraint, variant.constraint);
  }
});

test("constraint variants are authored for real: valid ids, rewritten outcomes, at least 3 per pack", () => {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const pack of getAllScenarioPacks()) {
    let count = 0;
    for (const inc of pack.incidents) {
      for (const v of inc.variants ?? []) {
        count++;
        const where = `${inc.id}/${v.id ?? "?"}`;
        const ids = inc.choices.map((c) => c.id);
        const originalFix = inc.choices.filter((c) => c.correct).map((c) => c.id);
        const overrides = v.resultOverrides ?? {};
        if (!v.id || seen.has(v.id)) problems.push(`${where}: missing or duplicate variant id`);
        if (v.id) seen.add(v.id);
        if (inc.isCascade) problems.push(`${where}: variants belong on startable incidents, not cascades`);
        if (inc.format && inc.format !== "pick") problems.push(`${where}: variants only work on pick-the-fix incidents`);
        if ((v.hints?.length ?? 0) !== inc.hints.length) problems.push(`${where}: needs ${inc.hints.length} rewritten hints`);
        if (!ids.includes(v.correctChoiceId)) problems.push(`${where}: correctChoiceId is not a choice`);
        if (originalFix.includes(v.correctChoiceId)) problems.push(`${where}: does not flip the answer`);
        for (const key of Object.keys(overrides)) {
          if (!ids.includes(key)) problems.push(`${where}: override for unknown choice "${key}"`);
        }
        for (const id of [v.correctChoiceId, ...originalFix]) {
          const o = overrides[id];
          if (!o?.resultTitle || !o?.resultBody) problems.push(`${where}: "${id}" needs its own resultTitle and resultBody`);
        }
        const words = v.constraint.trim().split(/\s+/).length;
        if (words > 40) problems.push(`${where}: constraint is ${words} words (max 40)`);
        if (v.constraint === inc.constraint) problems.push(`${where}: constraint is unchanged`);
        const metricKeys = new Set(inc.metricsBefore.map((m) => m.key));
        for (const key of Object.keys(v.metricsPatch ?? {})) {
          if (!metricKeys.has(key)) problems.push(`${where}: metricsPatch key "${key}" is not a metric`);
        }
        for (const o of Object.values(overrides)) {
          if (o.graphPatch && unknownPatchNodes(inc.graphBefore, o.graphPatch).length) {
            problems.push(`${where}: override graphPatch names unknown nodes`);
          }
        }
        const skinned = applySkin(inc, { scale: 1, region: "us-east-1", occasion: "test", variant: v });
        const fix = skinned.choices.find((c) => c.id === v.correctChoiceId)!;
        if (fix?.consequenceIncidentId || fix?.graphPatch) problems.push(`${where}: new fix still carries wrong-answer physics`);
        for (const c of skinned.choices.filter((c) => originalFix.includes(c.id))) {
          if (c.cascadeIncidentId) problems.push(`${where}: old fix still pages its cascade`);
        }
      }
    }
    if (count < 3) problems.push(`${pack.patternId}: ${count} variants (need at least 3)`);
  }
  assert.deepEqual(problems, []);
});
