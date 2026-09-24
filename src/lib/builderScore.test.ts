import test from "node:test";
import assert from "node:assert/strict";

import { evaluateArchitectureScore } from "./builderScore";

test("good architecture score stays high with load balancer and cache", () => {
  const result = evaluateArchitectureScore(
    [
      { data: { type: "client", cpu: 20, status: "healthy" } },
      { data: { type: "load_balancer", cpu: 35, status: "healthy" } },
      { data: { type: "server", cpu: 42, status: "healthy" } },
      { data: { type: "server", cpu: 46, status: "healthy" } },
      { data: { type: "cache", cpu: 28, status: "healthy" } },
      { data: { type: "database", cpu: 40, status: "healthy" } },
    ],
    25000
  );

  assert.ok(result.score >= 70);
  assert.ok(["A", "S"].includes(result.grade));
  assert.equal(result.canPass, true);
});

test("monolith without load balancer stays low", () => {
  const result = evaluateArchitectureScore(
    [
      { data: { type: "client", cpu: 15, status: "healthy" } },
      { data: { type: "server", cpu: 92, status: "overloaded" } },
      { data: { type: "database", cpu: 88, status: "overloaded" } },
    ],
    50000
  );

  assert.ok(result.score < 60);
  assert.equal(result.canPass, false);
  assert.match(result.summary, /under-provisioned|Conceptually valid|Strong architecture/i);
});

// ---------------------------------------------------------------------------
// Scenario bosses
// ---------------------------------------------------------------------------

import { evaluateScenario, simulateTopology, sandboxWorkload } from "./builderScore";
import { BUILDER_SCENARIOS, getBuilderScenarioById } from "../data/builderScenarios";
import type { ArchitectureNodeType, BuilderScenario } from "../types";

type N = { id: string; data: { type: ArchitectureNodeType; label: string } };
type E = { source: string; target: string };

function startingDesign(scenario: BuilderScenario): { nodes: N[]; edges: E[] } {
  return {
    nodes: scenario.startingNodes.map((n) => ({ id: n.id, data: { type: n.type, label: n.label } })),
    edges: scenario.startingEdges.map((e) => ({ ...e })),
  };
}

function add(design: { nodes: N[]; edges: E[] }, id: string, type: ArchitectureNodeType, connectTo: string[]) {
  design.nodes.push({ id, data: { type, label: id } });
  connectTo.forEach((target) => design.edges.push({ source: id, target }));
}

function scenario(id: string): BuilderScenario {
  const s = getBuilderScenarioById(id);
  assert.ok(s, `scenario ${id} exists`);
  return s;
}

test("every boss scenario starts in a failing state", () => {
  for (const s of BUILDER_SCENARIOS) {
    const { nodes, edges } = startingDesign(s);
    const result = evaluateScenario(nodes, edges, s);
    assert.equal(result.canPass, false, `${s.id} should start broken`);
    assert.ok(result.checks.some((c) => c.status === "fail"), `${s.id} explains why it fails`);
  }
});

test("boss-scale passes with a load balancer and two servers", () => {
  const s = scenario("boss-scale");
  const d = startingDesign(s);
  d.edges = [{ source: "server-1", target: "db" }];
  add(d, "lb", "load_balancer", ["server-1"]);
  add(d, "server-2", "server", ["db"]);
  d.edges.push({ source: "users", target: "lb" }, { source: "lb", target: "server-2" });
  const result = evaluateScenario(d.nodes, d.edges, s);
  assert.equal(result.canPass, true, JSON.stringify(result.checks));
  assert.deepEqual(result.simulation.metrics.serverShares, [50, 50]);
});

test("boss-scale fails when extra servers have no load balancer", () => {
  const s = scenario("boss-scale");
  const d = startingDesign(s);
  add(d, "server-2", "server", ["db"]);
  add(d, "server-3", "server", ["db"]);
  const result = evaluateScenario(d.nodes, d.edges, s);
  assert.equal(result.canPass, false);
  assert.ok(result.failureReasons.includes("require-load_balancer"));
  assert.ok(result.failureReasons.includes("server-cpu"));
});

test("boss-lb requires N+1 capacity when a server is killed", () => {
  const s = scenario("boss-lb");
  const d = startingDesign(s);
  const before = evaluateScenario(d.nodes, d.edges, s);
  assert.equal(before.simulation.metrics.aliveServers, 1);
  add(d, "server-3", "server", ["db"]);
  d.edges.push({ source: "lb", target: "server-3" });
  const after = evaluateScenario(d.nodes, d.edges, s);
  assert.equal(after.simulation.metrics.aliveServers, 2);
  assert.equal(after.canPass, true, JSON.stringify(after.checks));
});

test("boss-replicas needs replicas and fails if a required replica is disconnected", () => {
  const s = scenario("boss-replicas");
  const d = startingDesign(s);
  d.nodes.push({ id: "replica-1", data: { type: "replica", label: "r1" } });
  const orphan = evaluateScenario(d.nodes, d.edges, s);
  assert.ok(orphan.checks.some((c) => c.id === "require-replica" && /not connected/.test(c.message)));

  d.edges.push({ source: "db", target: "replica-1" });
  add(d, "replica-2", "replica", ["db"]);
  const fixed = evaluateScenario(d.nodes, d.edges, s);
  assert.equal(fixed.canPass, true, JSON.stringify(fixed.checks));
});

test("boss-cache fails if the learner adds a cache but breaks the earlier CPU requirement", () => {
  const s = scenario("boss-cache");
  const d = startingDesign(s);
  add(d, "cache", "cache", ["server-1"]);
  const cacheOnly = evaluateScenario(d.nodes, d.edges, s);
  assert.equal(cacheOnly.canPass, false);
  assert.ok(cacheOnly.failureReasons.includes("server-cpu"));

  add(d, "server-4", "server", ["db"]);
  d.edges.push({ source: "lb", target: "server-4" });
  const fixed = evaluateScenario(d.nodes, d.edges, s);
  assert.equal(fixed.canPass, true, JSON.stringify(fixed.checks));
});

test("boss-cdn and boss-queue pass with the new component connected", () => {
  const cdn = scenario("boss-cdn");
  const d1 = startingDesign(cdn);
  add(d1, "cdn", "cdn", ["users"]);
  assert.equal(evaluateScenario(d1.nodes, d1.edges, cdn).canPass, true);

  const queue = scenario("boss-queue");
  const d2 = startingDesign(queue);
  add(d2, "queue", "queue", ["server-1"]);
  assert.equal(evaluateScenario(d2.nodes, d2.edges, queue).canPass, true);
});

test("without a load balancer the first server receives all traffic", () => {
  const sim = simulateTopology(
    [
      { id: "a", data: { type: "server" } },
      { id: "b", data: { type: "server" } },
      { id: "db", data: { type: "database" } },
    ],
    sandboxWorkload(10000)
  );
  assert.deepEqual(sim.metrics.serverShares, [100, 0]);
  assert.ok(sim.nodeStates.a.cpu > sim.nodeStates.b.cpu);
});
