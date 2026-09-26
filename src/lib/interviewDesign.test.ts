import test from "node:test";
import assert from "node:assert/strict";

import { INTERVIEW_PROBLEMS } from "@/data/interview";
import { EMPTY_DESIGN, designFromGraph, evaluateArchitecture, unwiredNodeIds, type Design } from "@/lib/interviewDesign";
import type { InterviewProblem } from "@/types";

/** The design an interviewer expects: exactly the required components, one spare server. */
function leanDesign(problem: InterviewProblem): Design {
  const req = problem.requiredDesign ?? {};
  return {
    ...EMPTY_DESIGN,
    hasLB: !!req.needsLB,
    hasCache: !!req.needsCache,
    hasCDN: !!req.needsCDN,
    hasQueue: !!req.needsQueue,
    hasReplica: !!req.needsReplica,
    serverCount: req.minServers ?? 2,
  };
}

const EVERYTHING_ON: Design = {
  hasCDN: true,
  hasLB: true,
  serverCount: 4,
  hasCache: true,
  hasQueue: true,
  hasDatabase: true,
  hasReplica: true,
};

test("the lean design that meets each problem's requirements scores 100", () => {
  for (const problem of INTERVIEW_PROBLEMS) {
    const result = evaluateArchitecture(problem, leanDesign(problem));
    assert.equal(result.score, 100, `${problem.id}: ${result.issues.join(" | ")}`);
  }
});

test("switching every component on never beats the lean design", () => {
  for (const problem of INTERVIEW_PROBLEMS) {
    const lean = evaluateArchitecture(problem, leanDesign(problem)).score;
    const everything = evaluateArchitecture(problem, EVERYTHING_ON);
    const req = problem.requiredDesign ?? {};
    const extras = [req.needsCDN, req.needsCache, req.needsQueue, req.needsReplica].filter((n) => !n).length;
    if (extras > 0 || (req.minServers ?? 2) + 1 < 4) {
      assert.ok(everything.score < lean, `${problem.id}: everything-on scored ${everything.score}`);
      assert.ok(everything.issues.some((i) => /Over-/.test(i)));
    }
  }
});

test("a missing required component still fails", () => {
  const problem = INTERVIEW_PROBLEMS.find((p) => p.requiredDesign?.needsLB);
  assert.ok(problem);
  const result = evaluateArchitecture(problem, { ...leanDesign(problem), hasLB: false });
  assert.ok(result.score < 100);
});

// ---------------- designFromGraph: graded by the wiring ----------------

type G = { nodes: { id: string; data: { type: string } }[]; edges: { source: string; target: string }[] };

function graph(types: Record<string, string>, wires: [string, string][]): G {
  return {
    nodes: Object.entries(types).map(([id, type]) => ({ id, data: { type } })),
    edges: wires.map(([source, target]) => ({ source, target })),
  };
}

/** Draws the lean design for a problem, with every component wired where it does its job. */
function leanGraph(problem: InterviewProblem): G {
  const req = problem.requiredDesign ?? {};
  const servers = Array.from({ length: req.minServers ?? 2 }, (_, i) => `s${i}`);
  const types: Record<string, string> = { u: "client", db: "database" };
  const wires: [string, string][] = [];
  let entry = "u";
  if (req.needsCDN) {
    types.cdn = "cdn";
    wires.push([entry, "cdn"]);
    entry = "cdn";
  }
  if (req.needsLB) {
    types.lb = "load_balancer";
    wires.push([entry, "lb"]);
    entry = "lb";
  }
  for (const s of servers) {
    types[s] = "server";
    wires.push([entry, s], [s, "db"]);
    if (req.needsCache) wires.push([s, "cache"]);
    if (req.needsQueue) wires.push([s, "q"]);
  }
  if (req.needsCache) types.cache = "cache";
  if (req.needsQueue) types.q = "queue";
  if (req.needsReplica) {
    types.rep = "replica";
    wires.push(["db", "rep"]);
  }
  return graph(types, wires);
}

test("a lean, fully wired canvas scores 100 for every problem", () => {
  for (const problem of INTERVIEW_PROBLEMS) {
    const g = leanGraph(problem);
    const result = evaluateArchitecture(problem, designFromGraph(g.nodes, g.edges));
    assert.equal(result.score, 100, `${problem.id}: ${result.issues.join(" | ")}`);
    assert.deepEqual(unwiredNodeIds(g.nodes, g.edges), []);
  }
});

test("an unwired cache earns nothing", () => {
  const g = graph({ u: "client", s: "server", db: "database", c: "cache" }, [
    ["u", "s"],
    ["s", "db"],
  ]);
  const d = designFromGraph(g.nodes, g.edges);
  assert.equal(d.hasCache, false);
  assert.deepEqual(unwiredNodeIds(g.nodes, g.edges), ["c"]);

  // A cache hanging off the database but not the servers still does not count.
  const offDb = graph({ u: "client", s: "server", db: "database", c: "cache" }, [
    ["u", "s"],
    ["s", "db"],
    ["db", "c"],
  ]);
  assert.equal(designFromGraph(offDb.nodes, offDb.edges).hasCache, false);
});

test("a load balancer with no servers behind it does not count", () => {
  const g = graph({ u: "client", lb: "load_balancer", db: "database" }, [
    ["u", "lb"],
    ["lb", "db"],
  ]);
  const d = designFromGraph(g.nodes, g.edges);
  assert.equal(d.hasLB, false);
  assert.equal(d.serverCount, 0);
  assert.equal(d.hasDatabase, false, "a database no server writes to is not the system of record");
});

test("servers not reachable from users are not counted", () => {
  const g = graph({ u: "client", s1: "server", s2: "server", db: "database" }, [
    ["u", "s1"],
    ["s1", "db"],
    ["s2", "db"],
  ]);
  assert.equal(designFromGraph(g.nodes, g.edges).serverCount, 1);
});
