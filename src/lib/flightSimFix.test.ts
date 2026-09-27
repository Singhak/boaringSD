import test from "node:test";
import assert from "node:assert/strict";

import { FLIGHT_CREDIT_BUDGET, flightFixSpec, flightVictory } from "@/lib/flightSimFix";

test("upgrading to 64 cores stabilises but never earns 3 stars", () => {
  const v = flightVictory("lb-01", "upgrade_core", 1);
  assert.equal(v.stars, 1);
  assert.ok(v.overBudget);
  assert.ok(flightFixSpec("upgrade_core").monthlyCost > FLIGHT_CREDIT_BUDGET);
  assert.match(v.body, /64-core/);
  assert.doesNotMatch(v.body, /balances traffic 50\/50/);
});

test("the victory copy matches the fix the player chose", () => {
  assert.match(flightVictory("hs-01", "scale_out", 0).body, /second stateless app server/);
  assert.match(flightVictory("lb-01", "deploy_lb", 0).body, /reverse proxy/);
});

test("a root-cause fix earns 3 stars first try and 2 after a mistake", () => {
  assert.equal(flightVictory("hs-01", "scale_out", 0).stars, 3);
  assert.equal(flightVictory("hs-01", "scale_out", 1).stars, 2);
  assert.equal(flightVictory("lb-01", "deploy_lb", 0).stars, 3);
});

test("a band-aid only buys time: it never stabilises", () => {
  const spec = flightFixSpec("restart");
  assert.equal(spec.kind, "band_aid");
  assert.equal(spec.stabilizes, false);
});
