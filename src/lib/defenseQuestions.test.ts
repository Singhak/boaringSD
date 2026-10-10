import test from "node:test";
import assert from "node:assert/strict";

import { PATTERN_TRADEOFFS } from "@/data/tradeoffScenarios";
import { resolveConceptIntelId } from "@/data/conceptIntel";
import { buildDefenseQuestions, pickDefenseOption } from "@/lib/defenseQuestions";
import { DEFENSE_POOL } from "@/data/defensePool";

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
  // No matching card: skip the gate rather than quiz on a fix the player did not deploy.
  assert.equal(pickDefenseOption(caching, "Something unrelated"), undefined);
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

test("alternate defense pairs belong to a real option and are valid questions", () => {
  const optionIds = new Set(Object.values(PATTERN_TRADEOFFS).flatMap((s) => s.options.map((o) => o.id)));
  for (const [optionId, pairs] of Object.entries(DEFENSE_POOL)) {
    assert.ok(optionIds.has(optionId), `${optionId} is not a tradeoff option`);
    for (const pair of pairs) {
      for (const q of [pair.tradeoffDefenseQuestion, pair.stressTest10xQuestion]) {
        assert.ok(q.question.trim().length > 20, `${optionId}: question too short`);
        assert.ok(q.options.length >= 3, `${optionId}: needs at least 3 answers`);
        assert.equal(q.options.filter((o) => o.isCorrect).length, 1, `${optionId}: needs exactly one correct answer`);
        assert.equal(new Set(q.options.map((o) => o.id)).size, q.options.length, `${optionId}: duplicate answer ids`);
        for (const o of q.options) assert.ok(o.feedback.trim().length > 20, `${optionId}/${o.id}: feedback too thin`);
      }
    }
  }
});

test("every tradeoff option has at least one alternate defense pair, and attempts rotate through them", () => {
  for (const [patternId, set] of Object.entries(PATTERN_TRADEOFFS)) {
    for (const option of set.options) {
      assert.ok((DEFENSE_POOL[option.id]?.length ?? 0) >= 1, `${patternId}/${option.id} has no alternate defense pair`);
      const seen = new Set(
        Array.from({ length: 40 }, (_, i) => buildDefenseQuestions(option, "x", `a#${i}`).q2.question)
      );
      assert.ok(seen.size > 1, `${option.id} always shows the same stress-test question`);
    }
  }
});
