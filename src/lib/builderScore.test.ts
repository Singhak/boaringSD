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
