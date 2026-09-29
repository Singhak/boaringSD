import test from "node:test";
import assert from "node:assert/strict";

import { getAllScenarioPacks, getIncidentById, getWarRoomIncident } from "@/data/scenarioPacks";
import { getAllPatterns } from "@/data/patterns";
import { applyGraphPatch, graphChanged, unknownPatchNodes } from "@/lib/graphPatch";
import { formatOf, formatProblems, rhythmProblems } from "@/lib/incidentFormat";
import { creditBudgetFor } from "@/lib/runEconomy";

/** Phase 2 content: wrong answers change the system, cascades and delayed bills exist, formats rotate. */

test("every incident has at least one wrong choice that changes the graph", () => {
  const flat: string[] = [];
  const broken: string[] = [];
  for (const pack of getAllScenarioPacks()) {
    for (const inc of pack.incidents) {
      let changes = false;
      for (const c of inc.choices.filter((x) => !x.correct)) {
        if (c.graphPatch) {
          const unknown = unknownPatchNodes(inc.graphBefore, c.graphPatch);
          if (unknown.length) broken.push(`${inc.id}/${c.id}: unknown nodes ${unknown.join(", ")}`);
          if (graphChanged(inc.graphBefore, applyGraphPatch(inc.graphBefore, c.graphPatch))) changes = true;
        }
        if (c.graphAfter && graphChanged(inc.graphBefore, c.graphAfter)) changes = true;
      }
      if (!changes) flat.push(inc.id);
    }
  }
  assert.deepEqual(broken, []);
  assert.deepEqual(flat, [], "wrong deploys must visibly change the topology");
});

test("every choice has a monthly cost for the credit wallet, and budgets are sane", () => {
  const missing: string[] = [];
  for (const pack of getAllScenarioPacks()) {
    for (const inc of pack.incidents) {
      for (const c of [...inc.choices, ...(inc.mitigation?.choices ?? [])]) {
        if (typeof c.tradeoffs?.costMonthlyDelta !== "number") missing.push(`${inc.id}/${c.id}`);
      }
      const correct = inc.choices.find((c) => c.correct);
      const budget = creditBudgetFor(inc);
      assert.ok(
        (correct?.tradeoffs?.costMonthlyDelta ?? 0) <= budget,
        `${inc.id}: the correct fix alone blows its $${budget} credit budget`
      );
    }
  }
  assert.deepEqual(missing, []);
});

test("every pack has at least 2 cascades from a correct fix and 1 delayed bill from a band-aid", () => {
  const problems: string[] = [];
  for (const pack of getAllScenarioPacks()) {
    const ids = new Set(pack.incidents.map((i) => i.id));
    const choices = pack.incidents.flatMap((i) => i.choices.map((c) => ({ inc: i, c })));
    const cascades = choices.filter(({ c }) => c.correct && c.cascadeIncidentId);
    const bills = choices.filter(({ c }) => !c.correct && c.consequenceIncidentId);
    if (cascades.length < 2) problems.push(`${pack.patternId}: ${cascades.length} cascades`);
    if (bills.length < 1) problems.push(`${pack.patternId}: no delayed bill`);
    for (const { inc, c } of [...cascades, ...bills]) {
      const target = c.cascadeIncidentId ?? c.consequenceIncidentId!;
      if (!ids.has(target)) problems.push(`${inc.id}/${c.id} points outside its pack: ${target}`);
      else if (!getIncidentById(target)?.isCascade) problems.push(`${inc.id}/${c.id} -> ${target} is not marked isCascade`);
      if (target === inc.id) problems.push(`${inc.id}/${c.id} points at itself`);
    }
    for (const { c } of choices.filter(({ c }) => c.consequenceIncidentId && c.cascadeIncidentId)) {
      problems.push(`${c.id} has both a cascade and a consequence`);
    }
  }
  assert.deepEqual(problems, []);
});

test("format data is complete for every non-pick incident", () => {
  const problems = getAllScenarioPacks().flatMap((pack) =>
    pack.incidents.flatMap((inc) => formatProblems(inc).map((p) => `${inc.id}: ${p}`))
  );
  assert.deepEqual(problems, []);
});

test("levels rotate formats on the first run, and every pack has replays in another format", () => {
  const byLevel = [...getAllPatterns()].sort((a, b) => a.levelNumber - b.levelNumber);
  const firstRun = byLevel.map((p) => formatOf(getWarRoomIncident(p.id, 0) ?? {}));
  assert.deepEqual(rhythmProblems(firstRun), [], `first-run formats: ${firstRun.join(", ")}`);
  const thin = getAllScenarioPacks()
    .filter((pack) => pack.incidents.filter((i) => !i.isCascade && formatOf(i) !== "pick").length < 2)
    .map((pack) => pack.patternId);
  assert.deepEqual(thin, [], "each pack needs at least 2 startable incidents in a non-pick format");
});

test("every pack has a Spot-the-bad-PR and a Budget-cut incident that are valid in their format", () => {
  for (const pack of getAllScenarioPacks()) {
    for (const format of ["bad-pr", "budget-cut"] as const) {
      const incidents = pack.incidents.filter((i) => formatOf(i) === format);
      assert.ok(incidents.length >= 1, `${pack.patternId} has no ${format} incident`);
      for (const inc of incidents) assert.deepEqual(formatProblems(inc), [], `${inc.id}: ${formatProblems(inc).join("; ")}`);
    }
  }
});
