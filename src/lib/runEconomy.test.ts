import test from "node:test";
import assert from "node:assert/strict";

import {
  applyBandAid,
  applyRollback,
  applyWrongDeploy,
  applyWrongFlag,
  breachPostMortem,
  comboMultiplier,
  creditBudgetFor,
  logTicket,
  overBudget,
  runStars,
  spend,
  startEconomy,
  tickReading,
} from "@/lib/runEconomy";
import { applyGraphPatch, graphChanged, unknownPatchNodes } from "@/lib/graphPatch";
import { knobMetrics, knobSpecProblems, knobZone } from "@/lib/knob";
import { rhythmProblems } from "@/lib/incidentFormat";
import type { IncidentChoice, IncidentGraph, IncidentV2, KnobSpec } from "@/types";

const choice = (over: Partial<IncidentChoice>): IncidentChoice => ({
  id: "c",
  label: "Some label here",
  correct: false,
  resultTitle: "Result",
  resultBody: "It made the queue back up. Then it got worse.",
  ...over,
});

test("reading burns ~1% per 5 s and a wrong deploy burns 15%", () => {
  let e = startEconomy(300);
  e = tickReading(e, 5);
  assert.equal(e.budget, 99);
  e = applyWrongDeploy(e, 120);
  assert.equal(e.budget, 84);
  assert.equal(e.wrongDeploys, 1);
  assert.equal(e.spent, 120, "the attempt was still paid for");
  assert.equal(applyRollback(e).budget, 79);
  assert.equal(applyWrongFlag(e).budget, 74);
  assert.equal(applyBandAid(e).budget, 79);
});

test("the budget never goes below 0 and 0 is a breach worth no stars", () => {
  let e = startEconomy(300);
  for (let i = 0; i < 8; i++) e = applyWrongDeploy(e);
  assert.equal(e.budget, 0);
  assert.equal(e.breached, true);
  assert.equal(runStars(e), 0);
});

test("stars: 3 clean; a wrong deploy, overspending and a logged ticket each cost one; never below 1", () => {
  const clean = startEconomy(300);
  assert.equal(runStars(clean), 3);
  assert.equal(runStars(applyWrongDeploy(clean)), 2);
  const over = spend(clean, 800);
  assert.ok(overBudget(over));
  assert.equal(runStars(over), 2);
  assert.equal(runStars(logTicket(applyWrongDeploy(over))), 1);
});

test("the credit budget defaults to 1.5x the correct fix, at least $200, so overkill blows it", () => {
  const inc = {
    choices: [
      choice({ correct: true, tradeoffs: { costMonthlyDelta: 300 } }),
      choice({ tradeoffs: { costMonthlyDelta: 1200 } }),
    ],
  } as Pick<IncidentV2, "choices" | "creditBudget">;
  assert.equal(creditBudgetFor(inc), 450);
  assert.equal(creditBudgetFor({ ...inc, choices: [choice({ correct: true })] }), 200);
  assert.equal(creditBudgetFor({ ...inc, creditBudget: 999 }), 999);
});

test("combo multiplier grows x1, x2, x3 and caps", () => {
  assert.deepEqual([0, 1, 2, 3, 7].map(comboMultiplier), [1, 1, 2, 3, 3]);
});

test("the SEV-0 post-mortem names the deploy, why it hurt, and the missed signal", () => {
  const inc = { brief: "Checkout is down. p95 is 9 s.", hints: ["a", "b", "Look at the pool"], constraint: "x" } as IncidentV2;
  const pm = breachPostMortem(inc, choice({ label: "Restart the database" }));
  assert.match(pm.deployed, /Restart the database/);
  assert.equal(pm.worse, "It made the queue back up.");
  assert.equal(pm.missed, "Look at the pool");
  assert.match(breachPostMortem(inc, null).deployed, /Nothing was deployed/);
});

const graph: IncidentGraph = {
  nodes: [
    { id: "app", kind: "server", label: "App", cpu: 40 },
    { id: "db", kind: "db", label: "DB", cpu: 50 },
  ],
  edges: [{ from: "app", to: "db" }],
};

test("graph patches recolour nodes and add hot spots; unknown ids are reported", () => {
  const out = applyGraphPatch(graph, {
    nodes: [{ id: "db", tone: "bad", cpu: 99, sub: "locks" }],
    addNodes: [{ id: "q", kind: "queue", label: "Queue", tone: "bad" }],
    addEdges: [{ from: "app", to: "q" }],
  });
  assert.equal(out.nodes.find((n) => n.id === "db")?.tone, "bad");
  assert.equal(out.nodes.length, 3);
  assert.ok(graphChanged(graph, out));
  assert.deepEqual(unknownPatchNodes(graph, { nodes: [{ id: "nope", tone: "bad" }] }), ["nope"]);
});

const knob: KnobSpec = {
  label: "Pool size",
  min: 10,
  max: 200,
  step: 10,
  start: 10,
  target: [50, 80],
  question: "Size the pool",
  curve: [
    { at: 10, metrics: [{ key: "p95", value: 2000 }] },
    { at: 60, metrics: [{ key: "p95", value: 80 }] },
    { at: 200, metrics: [{ key: "p95", value: 900 }] },
  ],
  low: { title: "Too small", body: "Requests still queue for a free connection every time." },
  high: { title: "Too big", body: "Postgres runs out of max_connections and starts refusing." },
  good: { title: "Sized", body: "Little's law: 3,000 req/s times 20 ms is about 60 busy connections." },
};

test("the knob interpolates metrics and turns them green inside the target", () => {
  const base = [{ key: "p95", value: 2000, tone: "bad" as const }];
  assert.equal(knobMetrics(knob, base, 35)[0].value, 1040);
  assert.equal(knobMetrics(knob, base, 60)[0].tone, "good");
  assert.equal(knobMetrics(knob, base, 150)[0].tone, "bad");
  assert.deepEqual([10, 60, 150].map((v) => knobZone(knob, v)), ["low", "good", "high"]);
  assert.deepEqual(knobSpecProblems(knob, ["p95"]), []);
  assert.ok(knobSpecProblems({ ...knob, start: 60 }, ["p95"]).length > 0);
  assert.ok(knobSpecProblems(knob, ["cpu"]).some((p) => p.includes("p95")));
});

test("format rhythm needs 4 formats and no format more than 3 levels in a row", () => {
  assert.deepEqual(rhythmProblems(["pick", "culprit", "knob", "two-step", "pick"]), []);
  assert.ok(rhythmProblems(["pick", "pick", "pick", "pick", "culprit", "knob", "two-step"]).length > 0);
  assert.ok(rhythmProblems(["pick", "culprit", "pick", "culprit"]).length > 0);
});
