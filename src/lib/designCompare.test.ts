import test from "node:test";
import assert from "node:assert/strict";

import { closestReference, compareDesigns } from "./designCompare";

test("compareDesigns reports matched, missing and extra component kinds, ignoring counts and clients", () => {
  const diff = compareDesigns(
    ["client", "load_balancer", "server", "server", "server", "database", "queue"],
    ["client", "load_balancer", "server", "cache", "database", "replica"]
  );
  assert.deepEqual(diff.matched, ["load_balancer", "server", "database"]);
  assert.deepEqual(diff.missing, ["cache", "replica"]);
  assert.deepEqual(diff.extra, ["queue"]);
  assert.equal(diff.overlap, 50);
});

test("identical designs overlap 100%, and two empty designs are trivially equal", () => {
  assert.equal(compareDesigns(["server", "database"], ["database", "server"]).overlap, 100);
  assert.equal(compareDesigns([], []).overlap, 100);
});

test("closestReference picks the accepted design nearest to the learner's", () => {
  const refs = [
    { id: "cache-path", components: ["load_balancer", "server", "cache", "database"] as const },
    { id: "queue-path", components: ["load_balancer", "server", "queue", "database"] as const },
  ];
  assert.equal(closestReference(["load_balancer", "server", "queue", "database"], refs)?.id, "queue-path");
  assert.equal(closestReference(["server"], refs)?.id, "cache-path");
  assert.equal(closestReference(["server"], []), undefined);
});
