import test from "node:test";
import assert from "node:assert/strict";

import {
  REASONING_PROMPTS,
  getInterviewReasoningPrompt,
  getPatternReasoningPrompt,
  getReasoningPrompt,
} from "@/data/reasoningPrompts";
import { MAX_ANSWER_CHARS } from "@/lib/grading/types";
import { INTERVIEW_PROBLEMS } from "@/data/interview";
import type { PatternId } from "@/types";

const PATTERN_IDS: PatternId[] = [
  "horizontal-scaling",
  "load-balancing",
  "read-replicas",
  "caching",
  "cdn-edge",
  "async-queues",
  "sharding",
  "consistency",
  "rate-limiting",
  "circuit-breaker",
  "connection-pooling",
  "backpressure",
  "idempotency",
  "multi-region",
  "health-checks",
];

test("has 34 prompts with unique ids", () => {
  assert.equal(REASONING_PROMPTS.length, 34);
  const ids = new Set(REASONING_PROMPTS.map((p) => p.id));
  assert.equal(ids.size, REASONING_PROMPTS.length);
});

test("every pattern has exactly one why_this and one ten_x prompt", () => {
  for (const patternId of PATTERN_IDS) {
    const prompts = REASONING_PROMPTS.filter((p) => p.patternId === patternId);
    assert.equal(prompts.filter((p) => p.kind === "why_this").length, 1, `${patternId} why_this`);
    assert.equal(prompts.filter((p) => p.kind === "ten_x").length, 1, `${patternId} ten_x`);
    assert.equal(prompts.length, 2, patternId);
    assert.ok(getReasoningPrompt(`${patternId}-why`), `${patternId}-why`);
    assert.ok(getReasoningPrompt(`${patternId}-10x`), `${patternId}-10x`);
  }
});

test("every interview problem has a prompt", () => {
  for (const problem of INTERVIEW_PROBLEMS) {
    const prompt = getInterviewReasoningPrompt(problem.id);
    assert.ok(prompt, problem.id);
    assert.equal(prompt.kind, "interview");
    assert.equal(prompt.id, problem.id);
  }
});

test("prompts stay chat-sized and rubrics are well formed", () => {
  for (const p of REASONING_PROMPTS) {
    assert.ok(p.prompt.length <= 220, `${p.id} prompt is ${p.prompt.length} chars`);
    assert.ok(p.modelAnswer.length <= MAX_ANSWER_CHARS, `${p.id} modelAnswer is ${p.modelAnswer.length} chars`);
    assert.ok(p.askedBy.includes("·"), `${p.id} askedBy should be "Name · Role"`);

    assert.ok(p.rubric.length >= 3 && p.rubric.length <= 4, `${p.id} rubric size`);
    assert.equal(new Set(p.rubric.map((r) => r.id)).size, p.rubric.length, `${p.id} rubric ids unique`);
    for (const r of p.rubric) {
      assert.ok(Number.isInteger(r.weight) && r.weight >= 1 && r.weight <= 3, `${p.id}/${r.id} weight`);
    }

    assert.ok(p.starters.length >= 2 && p.starters.length <= 3, `${p.id} starters count`);
    for (const s of p.starters) {
      assert.ok(s.trim().split(/\s+/).length <= 5, `${p.id} starter "${s}" too long`);
    }
  }
});

test("getPatternReasoningPrompt alternates kinds across runs", () => {
  const a = getPatternReasoningPrompt("caching", 0);
  const b = getPatternReasoningPrompt("caching", 1);
  assert.ok(a && b);
  assert.notEqual(a.kind, b.kind);
  assert.equal(getPatternReasoningPrompt("caching", -2)?.id, a.id);
  assert.equal(getPatternReasoningPrompt("nope"), undefined);
});
