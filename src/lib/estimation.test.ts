import test from "node:test";
import assert from "node:assert/strict";

import { parseEstimate, scoreEstimate } from "@/lib/estimation";

test("parses shorthand magnitudes, commas and scientific notation", () => {
  assert.equal(parseEstimate("12k"), 12_000);
  assert.equal(parseEstimate("1.2M"), 1_200_000);
  assert.equal(parseEstimate("3bn"), 3e9);
  assert.equal(parseEstimate("1e4"), 10_000);
  assert.equal(parseEstimate("1,000"), 1000);
  assert.equal(parseEstimate("~350 req/s"), 350);
  assert.equal(parseEstimate("2 million"), 2_000_000);
});

test("unit letters are not mistaken for magnitudes", () => {
  assert.equal(parseEstimate("3 GB"), 3);
  assert.equal(parseEstimate("40 MB"), 40);
  assert.equal(parseEstimate("5 ms"), 5);
});

test("unreadable input is NaN", () => {
  assert.ok(Number.isNaN(parseEstimate("")));
  assert.ok(Number.isNaN(parseEstimate("lots")));
});

test("scores by ratio, symmetric above and below the target", () => {
  assert.equal(scoreEstimate(1000, 1000).grade, "perfect");
  assert.equal(scoreEstimate(1100, 1000).score, 100);
  assert.equal(scoreEstimate(1300, 1000).grade, "acceptable");
  assert.equal(scoreEstimate(2000, 1000).score, scoreEstimate(500, 1000).score);
  assert.equal(scoreEstimate(2000, 1000).grade, "order_of_magnitude");
  assert.equal(scoreEstimate(5000, 1000).score, 20);
  assert.equal(scoreEstimate(50_000, 1000).score, 0);
});

test("tolerance widens the acceptable band", () => {
  assert.equal(scoreEstimate(1400, 1000, 25).grade, "order_of_magnitude");
  assert.equal(scoreEstimate(1400, 1000, 45).grade, "acceptable");
});

test("non-positive or non-finite answers score zero", () => {
  assert.equal(scoreEstimate(0, 1000).score, 0);
  assert.equal(scoreEstimate(-5, 1000).score, 0);
  assert.equal(scoreEstimate(NaN, 1000).score, 0);
});
