import test from "node:test";
import assert from "node:assert/strict";

import { PATTERN_TRADEOFFS } from "@/data/tradeoffScenarios";
import { resolveConceptIntelId } from "@/data/conceptIntel";
import { buildDefenseQuestions, pickDefenseOption } from "@/lib/defenseQuestions";

const caching = PATTERN_TRADEOFFS["caching"];

test("defense Q1 names the choice the player deployed", () => {
  const label = "Put Redis in front of Postgres with cache-aside";
  const option = pickDefenseOption(caching, label);
  assert.ok(option);
  const { q1 } = buildDefenseQuestions(option, label, "seed#1");
  assert.ok(q1.question.includes(label));
});

test("the defense picks the tradeoff card that matches the deploy", () => {
  assert.equal(pickDefenseOption(caching, "Provision read replicas for the hot table")?.id, "opt-read-replicas");
  assert.equal(pickDefenseOption(caching, "Something unrelated")?.id, caching.recommendedOptionId);
});

test("defense options move between attempts", () => {
  const option = caching.options[0];
  const orders = new Set(
    Array.from({ length: 10 }, (_, i) =>
      buildDefenseQuestions(option, "x", `attempt#${i}`).q1.options.map((o) => o.id).join(",")
    )
  );
  assert.ok(orders.size > 1);
});

test("the ELI5 button only resolves to intel that exists", () => {
  assert.equal(resolveConceptIntelId(undefined, "caching"), "caching");
  assert.equal(resolveConceptIntelId("no-such-intel", "also-missing"), null);
});

test("every defense question offers at least 3 answers, exactly one of them correct", () => {
  for (const [patternId, set] of Object.entries(PATTERN_TRADEOFFS)) {
    for (const option of set.options) {
      for (const q of [option.tradeoffDefenseQuestion, option.stressTest10xQuestion]) {
        assert.ok(q.options.length >= 3, `${patternId}/${option.id} has only ${q.options.length} answers`);
        assert.equal(q.options.filter((o) => o.isCorrect).length, 1, `${patternId}/${option.id} needs exactly one correct answer`);
      }
    }
  }
});
